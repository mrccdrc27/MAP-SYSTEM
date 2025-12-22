from django.contrib import admin
from .models import *

# Register your models here.
admin.site.register(Product)
admin.site.register(Asset)
admin.site.register(AssetCheckout)
admin.site.register(AssetCheckin)
admin.site.register(Component)
admin.site.register(ComponentCheckout)
admin.site.register(ComponentCheckin)
admin.site.register(Repair)
admin.site.register(RepairFile)
admin.site.register(AuditSchedule)
admin.site.register(Audit)
admin.site.register(AuditFile)
admin.site.register(AssetReportTemplate)
admin.site.register(ActivityLog)
