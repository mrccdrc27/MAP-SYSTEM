import requests, json, os
BASE='http://127.0.0.1:8000'
# Setup Django
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','backend.settings')
django.setup()
from django.contrib.auth import get_user_model
User=get_user_model()
email='apitest.employee@example.com'
pw='testpass123'
if not User.objects.filter(email=email).exists():
    u=User.objects.create_user(email=email,password=pw,first_name='API',last_name='Tester',company_id='MA9997',department='IT Department')
    u.status='Approved'
    u.save()
    print('Created user',email)
else:
    print('User exists')
from rest_framework_simplejwt.tokens import RefreshToken
u=User.objects.get(email=email)
refresh = RefreshToken.for_user(u)
access = str(refresh.access_token)
print('Access token:', access[:40]+'...')
# Test 1: JSON ticket
headers={'Authorization':f'Bearer {access}','Content-Type':'application/json'}
payload={'subject':'API JSON Ticket','category':'BMS','description':'Testing JSON ticket','dynamic_data':{'requestedBudget':12345,'costItems':[{'costElement':'Software','estimatedCost':'₱10,001 - ₱50,000'}]}}
r=requests.post(BASE+'/api/tickets/',headers=headers,json=payload)
print('JSON POST status',r.status_code,r.text[:400])
# Test 2: multipart with a small file
files={'files[]':('test.txt',b'Hello world','text/plain')}
form={'subject':'API Multipart Ticket','category':'Asset Check In','description':'Testing multipart file upload','dynamic_data':json.dumps({'assetName':'Dell XPS','serialNumber':'DX123','requestedBudget':2000})}
r2=requests.post(BASE+'/api/tickets/',headers={'Authorization':f'Bearer {access}'},data=form,files=files)
print('Multipart POST status',r2.status_code,r2.text[:400])
# Query latest tickets
from core.models import Ticket
latest=list(Ticket.objects.order_by('-id')[:5])
for t in latest:
    print('T:',t.id,t.ticket_number,t.subject,t.employee.email,t.asset_name,t.requested_budget)
