from django.contrib import admin
from django.contrib.admin.sites import AlreadyRegistered
from .models import CustomUser

# Register your models here. Use a safe registration to avoid AlreadyRegistered
try:
	admin.site.register(CustomUser)
except AlreadyRegistered:
	# model was already registered elsewhere; ignore
	pass