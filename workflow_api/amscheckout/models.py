from django.db import models

class Checkout(models.Model):
    ticket_id = models.CharField(max_length=100, unique=True)

    asset_id = models.IntegerField(null=True, blank=True)  # Consider replacing with ForeignKey to Asset model in future
    asset_name = models.CharField(max_length=255)

    requestor = models.CharField(max_length=100)
    requestor_location = models.CharField(max_length=255)
    requestor_id = models.IntegerField(null=True, blank=True)

    checkout_date = models.DateField(null=True, blank=True)
    checkin_date = models.DateField(null=True, blank=True)  # new: explicitly separates from return_date
    return_date = models.DateField(null=True, blank=True)

    is_resolved = models.BooleanField(default=False)

    checkout_ref_id = models.CharField(max_length=100, default="1", null=True, blank=True)  # optional external link

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    condition = models.IntegerField(default=1, null=True, blank=True)  # 0: good, 1: damaged, 2: lost

    class Meta:
        ordering = ['-checkout_date']
        verbose_name = "Asset Checkout"
        verbose_name_plural = "Asset Checkouts"

    def __str__(self):
        status = "Checked Out" if self.is_checkout else "Checked In"
        return f"[{self.ticket_id}] {self.asset_name} - {status}"
