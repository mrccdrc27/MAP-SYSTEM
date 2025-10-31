# auth/users/forms.py
from django import forms
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from captcha.fields import CaptchaField
from .models import User, UserOTP
from .serializers import validate_profile_picture_file_size, validate_profile_picture_dimensions, CustomTokenObtainPairSerializer
from systems.models import System

class ProfileSettingsForm(forms.ModelForm):
    """
    Form for updating user profile details with role-based field restrictions
    based on the user's matrix.
    """

    profile_picture = forms.ImageField(
        required=False,
        validators=[validate_profile_picture_file_size, validate_profile_picture_dimensions]
    )

    # Use suffix choices from the User model
    suffix = forms.ChoiceField(
        choices=[('', '')] + User._meta.get_field('suffix').choices,
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )

    class Meta:
        model = User
        fields = [
            # Personal (Editable by both)
            'username',
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'phone_number',

            # Organization (Mixed Editability)
            'email',
            'company_id',
            'department',

            # Profile Picture
            'profile_picture',

            # Security (Mixed Editability)
            'otp_enabled',
            # 'last_login',  <-- REMOVED (Non-editable)
            # 'date_joined', <-- REMOVED (Non-editable)

            # Admin-Only Fields (Editable subset)
            'status',
            'notified',
            'is_active',
            'is_staff',
            'is_superuser',
            # 'failed_login_attempts', <-- REMOVED (Non-editable)
            'is_locked',
            # 'lockout_time', <-- REMOVED (Non-editable)
        ]
        
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'middle_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'phone_number': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'company_id': forms.TextInput(attrs={'class': 'form-control'}),
            'department': forms.Select(attrs={'class': 'form-control'}),
            'otp_enabled': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'status': forms.Select(attrs={'class': 'form-control'}),
            'notified': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'is_staff': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'is_superuser': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'is_locked': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
        
        # Define read-only fields for template rendering (optional, helps clarify)
        # We handle actual disabling in __init__ based on roles
        read_only = ('last_login', 'date_joined', 'failed_login_attempts', 'lockout_time')


    def __init__(self, *args, **kwargs):
        self.request_user = kwargs.pop('request_user', None)
        super().__init__(*args, **kwargs)

        if not self.request_user:
            # If no user context, disable everything for safety
            for field_name in self.fields:
                self.fields[field_name].disabled = True
            return

        is_admin = self.request_user.is_superuser or self.request_user.is_staff

        # --- Fields editable ONLY by admin ---
        admin_only_editable = [
            'email',
            'company_id',
            'department',
            'status',
            'notified',
            'is_active',
            'is_staff',
            'is_superuser',
            'is_locked'
        ]

        # --- Fields editable by regular users (non-admin) ---
        user_editable = [
            'username',
            'phone_number',
            'profile_picture'  # This field may not be in this form but handled separately
        ]

        # If user is NOT an admin, disable admin-only fields
        if not is_admin:
            for field_name in admin_only_editable:
                if field_name in self.fields:
                    self.fields[field_name].disabled = True
                    self.fields[field_name].help_text = "Only administrators can edit this field."

        # Add help text for regular user fields
        for field_name in user_editable:
            if field_name in self.fields:
                if not is_admin:
                    self.fields[field_name].help_text = "This field can be edited by you."

    def clean(self):
        """
        Custom validation to ensure non-admin users cannot submit restricted fields.
        This mirrors the API validation logic.
        """
        cleaned_data = super().clean()
        
        if not self.request_user:
            raise forms.ValidationError("User context is required for validation.")
        
        is_admin = self.request_user.is_superuser or self.request_user.is_staff
        
        # If not admin, check if they're trying to modify restricted fields
        if not is_admin:
            allowed_fields = {'username', 'phone_number'}
            admin_only_fields = {
                'email', 'company_id', 'department', 'status', 'notified',
                'is_active', 'is_staff', 'is_superuser', 'is_locked'
            }
            
            # Check if any admin-only fields were changed
            for field_name in admin_only_fields:
                if field_name in self.fields and field_name in cleaned_data:
                    # Get the original value from the instance
                    original_value = getattr(self.instance, field_name, None)
                    new_value = cleaned_data.get(field_name)
                    
                    # If the value has changed, raise an error
                    if original_value != new_value:
                        raise forms.ValidationError(
                            f"You can only update: {', '.join(allowed_fields)}. "
                            f"You do not have permission to modify '{field_name}'."
                        )
        
        return cleaned_data


    def clean_email(self):
        email = self.cleaned_data.get('email')
        # Check if the field is disabled (meaning non-admin tried to change it)
        if self.fields['email'].disabled and self.instance and email != self.instance.email:
             raise forms.ValidationError("You do not have permission to change the email address.")

        if not email:
            return email

        # Check for duplicates if email changed
        if self.instance and self.instance.pk and email != self.instance.email:
            if User.objects.filter(email=email).exclude(pk=self.instance.pk).exists():
                raise forms.ValidationError("A user with this email already exists.")
        return email

    def clean_username(self):
        username = self.cleaned_data['username']
        if User.objects.filter(username=username).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("A user with this username already exists.")
        return username

    def clean_phone_number(self):
        phone_number = self.cleaned_data.get('phone_number')
        if not phone_number:
            return phone_number # Allow clearing the phone number

        # Normalize or validate phone number format here if needed

        if User.objects.filter(phone_number=phone_number).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("A user with this phone number already exists.")
        return phone_number

    # Clean method for Company ID if admins change it
    def clean_company_id(self):
        company_id = self.cleaned_data.get('company_id')
        # Check if the field is disabled (meaning non-admin tried to change it)
        if self.fields['company_id'].disabled and self.instance and company_id != self.instance.company_id:
             raise forms.ValidationError("You do not have permission to change the Company ID.")

        if not company_id:
            # Handle case where admin might clear it - decide if allowed
            # raise forms.ValidationError("Company ID cannot be empty.")
            return company_id # Or return None if allowed

        # Check for duplicates if company_id changed
        if self.instance and self.instance.pk and company_id != self.instance.company_id:
             if User.objects.filter(company_id=company_id).exclude(pk=self.instance.pk).exists():
                 raise forms.ValidationError("A user with this Company ID already exists.")
        return company_id

    def save(self, commit=True):
        """Override save to handle image clearing manually."""
        instance = super().save(commit=False)

        # Handle profile picture clear checkbox
        # Check if 'profile_picture-clear' was sent in POST data
        if self.data.get('profile_picture-clear'):
            instance.profile_picture = None
        # Handle the case where a new file is uploaded (handled by ModelForm)
        # Handle the case where no file is uploaded and clear is not checked (field remains unchanged)

        if commit:
            instance.save()
        return instance


class LoginForm(forms.Form):
    """
    Login form with support for email/password authentication, 2FA OTP,
    system selection, and captcha protection.
    """
    email = forms.EmailField(
        max_length=254,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your email address',
            'autocomplete': 'email',
            'required': True
        }),
        error_messages={
            'required': 'Email address is required.',
            'invalid': 'Please enter a valid email address.'
        }
    )
    
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your password',
            'autocomplete': 'current-password',
            'required': True
        }),
        error_messages={
            'required': 'Password is required.'
        }
    )
    
    system = forms.ModelChoiceField(
        queryset=System.objects.all(),
        empty_label="Select a system to access",
        widget=forms.Select(attrs={
            'class': 'form-control',
            'required': True
        }),
        error_messages={
            'required': 'Please select a system to access.',
            'invalid_choice': 'Please select a valid system.'
        }
    )
    
    otp_code = forms.CharField(
        max_length=6,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter 6-digit OTP (if enabled)',
            'autocomplete': 'one-time-code',
            'pattern': '[0-9]{6}',
            'maxlength': '6'
        }),
        help_text='Required only if 2FA is enabled for your account.'
    )
    
    captcha = CaptchaField(
        error_messages={
            'invalid': 'Please solve the captcha correctly.',
            'required': 'Captcha verification is required.'
        }
    )
    
    remember_me = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input'
        }),
        label='Keep me signed in'
    )
    
    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        self.selected_system = kwargs.pop('system', None)
        super().__init__(*args, **kwargs)
        
        # Check if captcha is needed based on failed login attempts
        email = None
        if self.request and self.request.method == 'POST':
            email = self.request.POST.get('email')
        elif self.data and 'email' in self.data:
            email = self.data.get('email')
        
        # Remove captcha field if not needed
        if email:
            try:
                user = User.objects.get(email=email)
                # Only show captcha if user has 5+ failed attempts or is locked
                if user.failed_login_attempts < 5 and not user.is_locked:
                    self.fields.pop('captcha', None)
            except User.DoesNotExist:
                # If user doesn't exist, still show captcha for security
                pass
        else:
            # If no email provided yet, don't show captcha initially
            self.fields.pop('captcha', None)
        
        # Pre-select system if provided via URL parameter
        if self.selected_system:
            try:
                system_obj = System.objects.get(slug=self.selected_system)
                self.fields['system'].initial = system_obj
            except System.DoesNotExist:
                pass
        
        # Remember last selected system from session
        if self.request and hasattr(self.request, 'session') and self.request.session.get('last_selected_system'):
            try:
                system_obj = System.objects.get(slug=self.request.session['last_selected_system'])
                if not self.selected_system:  # Only use remembered system if not explicitly provided
                    self.fields['system'].initial = system_obj
            except System.DoesNotExist:
                pass
    
    def clean(self):
        cleaned_data = super().clean()
        email = cleaned_data.get('email')
        password = cleaned_data.get('password')
        otp_code = cleaned_data.get('otp_code')
        system = cleaned_data.get('system')
        
        if email and password:
            # Use the same authentication logic as the API
            # Provide both username and email to match serializer expectations
            serializer_data = {
                'username': email,  # Use username field as expected by TokenObtainPairSerializer
                'email': email,     # Also provide email field 
                'password': password,
                'otp_code': otp_code or ''
            }
            
            # Create serializer instance with request context
            serializer = CustomTokenObtainPairSerializer(
                data=serializer_data,
                context={'request': self.request} if self.request else {}
            )
            
            try:
                # Validate using the same logic as API
                if serializer.is_valid(raise_exception=True):
                    # Get the authenticated user
                    user = serializer.user
                    
                    # Check if user has access to the selected system
                    if system:
                        has_system_access = user.system_roles.filter(system=system, is_active=True).exists()
                        if not has_system_access:
                            raise ValidationError(
                                f'You do not have access to the {system.name} system. Please contact your administrator.',
                                code='system_access_denied'
                            )
                    
                    # Store the authenticated user for the view
                    self.user_cache = user
                else:
                    # This shouldn't happen since we use raise_exception=True
                    raise ValidationError(
                        'Authentication failed. Please check your credentials.',
                        code='authentication_failed'
                    )
                    
            except ValidationError as e:
                # Re-raise Django form validation errors
                raise e
            except DRFValidationError as e:
                # Convert DRF validation errors to Django form errors
                error_detail = getattr(e, 'detail', str(e))
                
                # Check for specific error codes from the serializer
                if isinstance(error_detail, dict):
                    # Handle non-field errors
                    non_field_errors = error_detail.get('non_field_errors', [])
                    if non_field_errors:
                        error_msg = str(non_field_errors[0]) if non_field_errors else str(e)
                    else:
                        error_msg = str(e)
                elif isinstance(error_detail, list):
                    error_msg = str(error_detail[0]) if error_detail else str(e)
                else:
                    error_msg = str(error_detail)
                
                # Map specific error codes to appropriate validation errors
                if 'account_locked' in error_msg.lower():
                    raise ValidationError(error_msg, code='account_locked')
                elif 'otp' in error_msg.lower() and 'required' in error_msg.lower():
                    raise ValidationError(error_msg, code='otp_required')
                elif 'otp' in error_msg.lower() and 'invalid' in error_msg.lower():
                    raise ValidationError(error_msg, code='otp_invalid')
                elif 'otp' in error_msg.lower() and 'expired' in error_msg.lower():
                    raise ValidationError(error_msg, code='otp_expired')
                else:
                    raise ValidationError(error_msg, code='authentication_failed')
            except Exception as e:
                # Handle any other unexpected errors
                raise ValidationError(
                    'Authentication failed. Please try again.',
                    code='authentication_failed'
                )
        
        return cleaned_data
    
    def get_user(self):
        """Return the authenticated user."""
        return getattr(self, 'user_cache', None)


class ForgotPasswordForm(forms.Form):
    """
    Form for requesting password reset that matches the DRF ForgotPasswordSerializer validation.
    """
    email = forms.EmailField(
        max_length=254,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your email address',
            'autocomplete': 'email',
            'required': True
        }),
        error_messages={
            'required': 'Email address is required.',
            'invalid': 'Please enter a valid email address.'
        }
    )

    def clean_email(self):
        """
        Validate email using same logic as ForgotPasswordSerializer.
        For security, don't reveal whether the email exists or not.
        """
        email = self.cleaned_data.get('email')
        if email:
            # We don't validate if the user exists here for security reasons
            # The view will handle this logic just like the DRF serializer
            pass
        return email