from time import perf_counter
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.test import APIRequestFactory
from core.models import Ticket, ExternalEmployee
from core.views.ticket_views import get_ticket_detail

User = get_user_model()
user = User.objects.filter(is_staff=True).first()
req = APIRequestFactory().get('/')
req.user = user

t = Ticket.objects.filter(status='Open').order_by('-id').first()
if not t:
    print('No Open ticket found')
else:
    # Debug cache lookup
    external_ids = set()
    external_ids.add(t.employee_cookie_id)
    ids_list = list(external_ids)
    print('external_ids:', ids_list)
    qs = ExternalEmployee.objects.filter(Q(external_user_id__in=ids_list) | Q(external_employee_id__in=ids_list))
    cache_map = {}
    for e in qs:
        profile = {'first_name': e.first_name, 'last_name': e.last_name, 'company_id': e.company_id, 'department': e.department, 'email': e.email}
        if e.external_user_id:
            cache_map[int(e.external_user_id)] = profile
        if e.external_employee_id:
            cache_map[int(e.external_employee_id)] = profile
    print('cache_map:', cache_map)
    cid = t.employee_cookie_id
    prof = cache_map.get(int(cid)) if cid is not None else None
    print('prof for cid', cid, ':', prof)
    
    # Now call the view
    tid = t.id
    t0 = perf_counter()
    resp = get_ticket_detail(req, tid)
    t1 = perf_counter()
    print('Testing ticket id', tid)
    print('Elapsed:', t1-t0)
    try:
        print('employee_company_id:', resp.data.get('employee',{}).get('company_id'))
    except Exception as e:
        print('Response error', e)
