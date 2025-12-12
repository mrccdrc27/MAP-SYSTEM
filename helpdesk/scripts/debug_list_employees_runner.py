from django.test import RequestFactory
from django.contrib.auth import get_user_model

from core.views import list_employees

User = get_user_model()
rf = RequestFactory()

# Try to pick a staff or admin user; fallback to the first employee
user = User.objects.filter(is_staff=True).first()
if not user:
    user = User.objects.first()

print('Using user:', getattr(user, 'email', None), 'role=', getattr(user, 'role', None), 'is_staff=', getattr(user, 'is_staff', None))

req = rf.get('/api/employees/')
req.user = user

try:
    resp = list_employees(req)
    print('Response status:', getattr(resp, 'status_code', None))
    # Safely print data if present
    if hasattr(resp, 'data'):
        print('Response data:', resp.data)
    else:
        try:
            content = resp.render().content
            print('Response content:', content)
        except Exception:
            print('Response repr:', repr(resp))
except Exception as e:
    import traceback
    print('Exception while calling list_employees:')
    traceback.print_exc()
