# auth/users/forms.py
from django import forms
from .models import User
from .serializers import validate_profile_picture_file_size, validate_profile_picture_dimensions

class ProfileSettingsForm(forms.ModelForm):
    """Form for updating user profile details with role-based field restrictions."""

    profile_picture = forms.ImageField(
        required=False,
        validators=[validate_profile_picture_file_size, validate_profile_picture_dimensions]
    )

    class Meta:
        model = User
        fields = [
            'username',
            'first_name',
            'last_name',
            'email',
            'phone_number',
            'profile_picture',
        ]

    def __init__(self, *args, **kwargs):
        self.request_user = kwargs.pop('request_user', None)
        super().__init__(*args, **kwargs)

        # --- Apply field restrictions for non-admin users ---
        if self.request_user and not (self.request_user.is_superuser or self.request_user.is_staff):
            # Only allow these fields to be editable
            allowed_fields = {'username', 'phone_number', 'profile_picture'}

            for field_name in list(self.fields.keys()):
                if field_name not in allowed_fields:
                    self.fields[field_name].disabled = True
                    self.fields[field_name].help_text = "This field cannot be changed."

        # Disable email editing unless admin/superuser
        if self.request_user and not (self.request_user.is_superuser or self.request_user.is_staff):
            if 'email' in self.fields:
                self.fields['email'].disabled = True
                self.fields['email'].help_text = "Email cannot be changed."

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if not email:
            return email

        # Prevent non-admins from changing email
        if (
            self.instance
            and self.instance.pk
            and email != self.instance.email
            and self.request_user
            and not (self.request_user.is_superuser or self.request_user.is_staff)
        ):
            raise forms.ValidationError("You do not have permission to change the email address.")

        # Check for duplicates if email changed by admin
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
            return phone_number

        if User.objects.filter(phone_number=phone_number).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("A user with this phone number already exists.")
        return phone_number

    def save(self, commit=True):
        """Override save to handle image clearing manually."""
        instance = super().save(commit=False)

        # Handle profile picture clear checkbox (Django adds <field>-clear)
        if self.cleaned_data.get('profile_picture') is False or self.data.get('profile_picture-clear'):
            instance.profile_picture = None

        if commit:
            instance.save()
        return instance
