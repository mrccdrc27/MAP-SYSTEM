from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register('register', RegisterViewset, basename='register')
router.register('users', UsersViewset, basename='users')
urlpatterns = router.urls
