from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()
client = APIClient()

# pick a staff user if available, else first user
user = User.objects.filter(is_staff=True).first() or User.objects.first()
print('Using user:', getattr(user, 'email', None), 'role=', getattr(user, 'role', None), 'is_staff=', getattr(user, 'is_staff', None))

client.force_authenticate(user=user)
# Provide HTTP_HOST so Django doesn't reject the request in test environment
resp = client.get('/api/employees/', HTTP_HOST='localhost')
print('Status code:', resp.status_code)
try:
    print('Data:', resp.data)
except Exception as e:
    print('Failed to read resp.data:', e)
    print('Content repr:', resp.content)
