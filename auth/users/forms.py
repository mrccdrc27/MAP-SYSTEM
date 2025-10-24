# auth/users/forms.py
from django import forms
from .models import User
from .serializers import validate_profile_picture_file_size, validate_profile_picture_dimensions

class ProfileSettingsForm(forms.ModelForm):
    """
    Form for updating user profile details with role-based field restrictions
    based on the user's matrix.
    """

    profile_picture = forms.ImageField(
        required=False,
        validators=[validate_profile_picture_file_size, validate_profile_picture_dimensions]
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
            'status',
            'notified',
            'is_active',
            'is_staff',
            'is_superuser',
            'is_locked'
        ]

        # If user is NOT an admin, disable admin-only fields
        if not is_admin:
            for field_name in admin_only_editable:
                if field_name in self.fields:
                    self.fields[field_name].disabled = True
                    self.fields[field_name].help_text = "Only an administrator can change this field."

        # Add help text for clarification on other fields if needed (optional)
        # e.g., self.fields['otp_enabled'].help_text = "Enable Two-Factor Authentication."


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