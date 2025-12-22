from django.test import RequestFactory
from core.views import list_employees
from core.models import Employee

rf = RequestFactory()
user = Employee.objects.filter(role='Ticket Coordinator').first()
print('Found coordinator user:', bool(user))
if not user:
    print('No coordinator user found - creating one')
    user = Employee.objects.create(email='coord@test.local', first_name='Coord', last_name='User', role='Ticket Coordinator', status='Approved', company_id='MA9999')
    user.set_password('test1234')
    user.save()
req = rf.get('/api/employees/')
req.user = user
resp = list_employees(req)
print('Status code:', resp.status_code)
if isinstance(resp.data, list):
    print('Returned employees count:', len(resp.data))
    print('Sample employee keys:', list(resp.data[0].keys()) if resp.data else 'no data')
else:
    print('Response:', resp.data)
