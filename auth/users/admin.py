from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
	list_display = ("email", "company_id", "is_active", "is_locked", "failed_login_attempts", "lockout_time")
	readonly_fields = ("company_id",)
	actions = ["unlock_accounts"]

	def unlock_accounts(self, request, queryset):
		updated = queryset.update(is_locked=False, failed_login_attempts=0, lockout_time=None)
		self.message_user(request, f"Unlocked {updated} account(s).")
	unlock_accounts.short_description = "Unlock selected user accounts"