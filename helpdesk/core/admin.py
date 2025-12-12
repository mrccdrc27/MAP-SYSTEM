from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.core.mail import send_mail
from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from .models import Employee, Ticket, TicketAttachment, KnowledgeArticle, ActivityLog
from django.utils import timezone
from django.conf import settings

# Custom form for creating users
class EmployeeCreationForm(forms.ModelForm):
    password1 = forms.CharField(label='Password', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Confirm Password', widget=forms.PasswordInput)

    class Meta:
        model = Employee
        fields = (
            'email', 'first_name', 'last_name', 'middle_name',
            'suffix', 'company_id', 'department', 'role', 'status', 'image',
        )

    def clean_password2(self):
        pw1 = self.cleaned_data.get("password1")
        pw2 = self.cleaned_data.get("password2")
        if pw1 and pw2 and pw1 != pw2:
            raise forms.ValidationError("Passwords don't match.")
        return pw2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user

# Custom form for updating users
class EmployeeChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField()

    class Meta:
        model = Employee
        fields = (
            'email', 'password', 'first_name', 'last_name', 'middle_name',
            'suffix', 'company_id', 'department', 'role', 'status', 'notified', 'image',
        )

    def clean_password(self):
        return self.initial["password"]

# Register Employee with custom admin
@admin.register(Employee)
class EmployeeAdmin(UserAdmin):
    add_form = EmployeeCreationForm
    form = EmployeeChangeForm
    model = Employee

    list_display = (
        'email', 'first_name', 'last_name', 'company_id',
        'department', 'role', 'status', 'notified'
    )
    list_filter = ('department', 'role', 'status', 'notified')
    search_fields = ('email', 'first_name', 'last_name', 'company_id')
    ordering = ('email',)

    fieldsets = (
        (None, {
            'fields': (
                'email', 'password', 'first_name', 'last_name', 'middle_name',
                'suffix', 'company_id', 'department', 'role', 'status', 'notified', 'image',
            )
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'password1', 'password2', 'first_name', 'last_name',
                'middle_name', 'suffix', 'company_id', 'department', 'role',
                'status', 'image'
            ),
        }),
    )

    def save_model(self, request, obj, form, change):
        if change:
            previous = Employee.objects.get(pk=obj.pk)
            if (
                previous.status != 'Approved' and
                obj.status == 'Approved' and
                not obj.notified
            ):
                # send notification email using unified sender (Gmail API when
                # enabled). Use the same HTML template used by the view for
                # consistency.
                try:
                    from .gmail_utils import send_email
                    # Attempt to build HTML using the same template helper in views
                    from .views import send_account_approved_email
                    html = send_account_approved_email(obj)
                    send_email(
                        to=obj.email,
                        subject='Employee account approved',
                        body=html,
                        is_html=True,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                    )
                except Exception as e:
                    # don't block admin save on email errors
                    print(f"[EmployeeAdmin.save_model] email send failed: {e}")
                obj.notified = True
        super().save_model(request, obj, form, change)

# Ticket Admin Form
class TicketAdminForm(forms.ModelForm):
    class Meta:
        model = Ticket
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['employee'].queryset = Employee.objects.filter(role='Employee')
        self.fields['scheduled_date'].widget.attrs.update({
            'type': 'date',
            'min': timezone.now().date().isoformat()
        })

        for field_name in ['priority', 'department', 'response_time', 'resolution_time', 'time_closed']:
            self.fields[field_name].widget.attrs['readonly'] = True
            self.fields[field_name].disabled = True

    def clean_scheduled_date(self):
        scheduled_date = self.cleaned_data.get('scheduled_date')
        if scheduled_date and scheduled_date < timezone.now().date():
            raise forms.ValidationError("Scheduled date cannot be in the past.")
        return scheduled_date

    def clean(self):
        cleaned_data = super().clean()
        if not self.instance.pk:
            cleaned_data['status'] = 'New'
        return cleaned_data

# Inline attachments
class TicketAttachmentInline(admin.TabularInline):
    model = TicketAttachment
    extra = 0
    readonly_fields = ('file', 'file_name', 'file_type', 'file_size', 'uploaded_by', 'upload_date')

# Register Ticket with attachment inline
@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    form = TicketAdminForm
    inlines = [TicketAttachmentInline]

    list_display = (
        'id', 'subject', 'employee', 'department', 'priority',
        'status', 'scheduled_date', 'submit_date', 'assigned_to', 'csat_rating', 'date_completed'
    )
    list_filter = ('department', 'priority', 'status')
    search_fields = (
        'subject',
        'employee__first_name', 'employee__last_name',
        'assigned_to__first_name', 'assigned_to__last_name'
    )
    autocomplete_fields = ['employee', 'assigned_to']
    readonly_fields = ('submit_date', 'update_date')

    fieldsets = (
        (None, {
            'fields': (
                'employee', 'subject', 'category', 'sub_category',
                'description', 'scheduled_date', 'priority', 'department',
                'status', 'assigned_to', 'response_time', 'resolution_time', 'time_closed',
                'csat_rating', 'feedback', 'date_completed'
            )
        }),
        ('Timestamps', {
            'fields': ('submit_date', 'update_date'),
        }),
    )


@admin.register(KnowledgeArticle)
class KnowledgeArticleAdmin(admin.ModelAdmin):
    list_display = ('id', 'subject', 'category', 'visibility', 'is_archived', 'created_by', 'created_at')
    list_filter = ('category', 'visibility', 'is_archived')
    search_fields = ('subject', 'description')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('created_by',)
    fieldsets = (
        (None, {
            'fields': ('subject', 'category', 'visibility', 'description', 'is_archived', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


class ActivityLogInline(admin.TabularInline):
    model = ActivityLog
    # ActivityLog references Employee twice (user, actor). For the inline on the
    # Employee admin detail page we want to show logs about the employee (the
    # `user` field), so set fk_name accordingly to avoid admin.E202.
    fk_name = 'user'
    extra = 0
    readonly_fields = ('action_type', 'actor', 'message', 'ticket', 'metadata', 'timestamp')
    can_delete = False

# Attach inline to EmployeeAdmin so activity logs are visible on the user profile page
# Ensure we concatenate tuples (Django expects a tuple for `inlines` on the class)
EmployeeAdmin.inlines = getattr(EmployeeAdmin, 'inlines', ()) + (ActivityLogInline,)
