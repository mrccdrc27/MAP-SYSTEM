# models.py

from django.db import models

class Project(models.Model):
    ticket_id = models.CharField(max_length=100, default='TK-000')
    is_approved = models.BooleanField(default=False)
