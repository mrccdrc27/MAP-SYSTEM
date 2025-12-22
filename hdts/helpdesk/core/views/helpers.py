from ..authentication import ExternalUser


def get_external_employee_data(user_id):
    """
    Get external employee data from the ExternalEmployee model (synced from auth2).
    If not found locally, attempt to fetch from auth service API.
    Returns employee data dict or empty dict if not found.
    """
    try:
        from ..models import ExternalEmployee
        employee = ExternalEmployee.objects.filter(
            external_user_id=user_id
        ).first() or ExternalEmployee.objects.filter(
            external_employee_id=user_id
        ).first() or ExternalEmployee.objects.filter(
            company_id=str(user_id)
        ).first()
        
        if employee:
            # If we have a cached external employee with a company_id, return it immediately.
            cached = {
                'id': employee.external_user_id or employee.external_employee_id or employee.company_id,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'email': employee.email,
                'company_id': employee.company_id,
                'department': employee.department,
                'image': str(employee.image.url) if employee.image else None,
            }

            if employee.company_id:
                return cached

            # Cached record exists but missing company_id — attempt remote lookup below.
            # Keep cached data as a fallback if remote calls fail.
            _cached_fallback = cached
    except Exception as e:
        print(f"[get_external_employee_data] Local lookup failed: {e}")
    
    # If not found locally, try fetching from auth service HDTS employees endpoint
    try:
        from django.conf import settings
        import requests
        
        auth_service_url = getattr(settings, 'DJANGO_AUTH_SERVICE', None)
        if auth_service_url:
            # Use the new internal employee lookup endpoint
            api_url = f"{auth_service_url}/api/v1/hdts/employees/internal/{user_id}/"
            print(f"[get_external_employee_data] Trying HDTS internal API: {api_url}")
            
            response = requests.get(api_url, timeout=3)
            print(f"[get_external_employee_data] API response status: {response.status_code}")
            
            if response.status_code == 200:
                user_data = response.json()
                print(f"[get_external_employee_data] Got employee data: {user_data.get('first_name')} {user_data.get('last_name')}")
                # Persist/refresh cached ExternalEmployee so subsequent requests are fast
                try:
                    from ..models import ExternalEmployee
                    ext_id = user_data.get('id')
                    email = user_data.get('email')
                    obj = None
                    if ext_id is not None:
                        obj = ExternalEmployee.objects.filter(external_employee_id=ext_id).first()
                    if not obj and email:
                        obj = ExternalEmployee.objects.filter(email=email).first()

                    if not obj:
                        obj = ExternalEmployee()

                    obj.email = email or obj.email
                    obj.username = user_data.get('username') or obj.username
                    obj.first_name = user_data.get('first_name', '') or obj.first_name
                    obj.last_name = user_data.get('last_name', '') or obj.last_name
                    obj.middle_name = user_data.get('middle_name') or obj.middle_name
                    obj.suffix = user_data.get('suffix') or obj.suffix
                    obj.phone_number = user_data.get('phone_number') or obj.phone_number
                    obj.company_id = user_data.get('company_id') or obj.company_id
                    obj.department = user_data.get('department') or obj.department
                    obj.external_employee_id = ext_id or obj.external_employee_id
                    try:
                        obj.save()
                    except Exception as _e:
                        print(f"[get_external_employee_data] Failed to save ExternalEmployee cache: {_e}")
                except Exception as _e:
                    print(f"[get_external_employee_data] Caching step failed: {_e}")

                return {
                    'id': user_data.get('id'),
                    'first_name': user_data.get('first_name', ''),
                    'last_name': user_data.get('last_name', ''),
                    'email': user_data.get('email', ''),
                    'company_id': user_data.get('company_id'),
                    'department': user_data.get('department', ''),
                    'image': user_data.get('profile_picture') or user_data.get('image'),
                }
            else:
                print(f"[get_external_employee_data] HDTS API returned error: {response.status_code} - {response.text[:200]}")
    except Exception as e:
        print(f"[get_external_employee_data] HDTS API call failed: {e}")
    
    # Fallback: try the management endpoint (for staff users)
    try:
        from django.conf import settings
        import requests
        
        auth_service_url = getattr(settings, 'DJANGO_AUTH_SERVICE', None)
        if auth_service_url:
            api_url = f"{auth_service_url}/api/v1/users/management/{user_id}/"
            print(f"[get_external_employee_data] Trying management API fallback: {api_url}")
            
            response = requests.get(api_url, timeout=3)
            
            if response.status_code == 200:
                user_data = response.json()
                print(f"[get_external_employee_data] Got user data from management: {user_data.get('first_name')} {user_data.get('last_name')}")
                # Cache management endpoint result as well
                try:
                    from ..models import ExternalEmployee
                    ext_id = user_data.get('id')
                    email = user_data.get('email')
                    obj = None
                    if ext_id is not None:
                        obj = ExternalEmployee.objects.filter(external_employee_id=ext_id).first()
                    if not obj and email:
                        obj = ExternalEmployee.objects.filter(email=email).first()
                    if not obj:
                        obj = ExternalEmployee()

                    obj.email = email or obj.email
                    obj.first_name = user_data.get('first_name', '') or obj.first_name
                    obj.last_name = user_data.get('last_name', '') or obj.last_name
                    obj.company_id = user_data.get('employee_id') or user_data.get('company_id') or obj.company_id
                    obj.department = user_data.get('department') or obj.department
                    obj.external_employee_id = ext_id or obj.external_employee_id
                    try:
                        obj.save()
                    except Exception as _e:
                        print(f"[get_external_employee_data] Failed to save ExternalEmployee cache (management): {_e}")
                except Exception as _e:
                    print(f"[get_external_employee_data] Caching (management) failed: {_e}")

                return {
                    'id': user_data.get('id'),
                    'first_name': user_data.get('first_name', ''),
                    'last_name': user_data.get('last_name', ''),
                    'email': user_data.get('email', ''),
                    'company_id': user_data.get('employee_id') or user_data.get('company_id'),
                    'department': user_data.get('department', ''),
                    'image': user_data.get('profile_picture'),
                }
    except Exception as e:
        print(f"[get_external_employee_data] Management API fallback failed: {e}")
    
    try:
        return _cached_fallback
    except NameError:
        return {}


def get_user_display_name(user):
    """
    Helper function to safely get a user's display name.
    Handles both Employee and ExternalUser objects.
    """
    if isinstance(user, ExternalUser):
        # Prefer real first/last name from the external auth profile
        first = getattr(user, 'first_name', None) or ''
        last = getattr(user, 'last_name', None) or ''
        full = f"{first} {last}".strip()
        if full:
            return full
        # As a fallback, avoid using email handle; show generic label
        return 'External User'
    else:
        # Regular Employee user
        if hasattr(user, 'company_id') and user.company_id:
            return user.company_id
        elif hasattr(user, 'first_name') and hasattr(user, 'last_name'):
            return f"{user.first_name} {user.last_name}"
        else:
            return getattr(user, 'email', 'Unknown User')


def _actor_display_name(request):
    """
    Resolve a human-friendly actor display name for Messages text.
    For ExternalUser, prefer First Last from the auth profile; never use email handle.
    Falls back to 'External User' when names are unavailable.
    For local Employee, reuse get_user_display_name behavior.
    """
    user = getattr(request, 'user', None)
    if isinstance(user, ExternalUser):
        first = getattr(user, 'first_name', '') or ''
        last = getattr(user, 'last_name', '') or ''
        full = f"{first} {last}".strip()
        if not full:
            # Attempt to fetch profile from ExternalEmployee model or auth service
            try:
                profile = get_external_employee_data(user.id)
                first = (profile or {}).get('first_name') or ''
                last = (profile or {}).get('last_name') or ''
                full = f"{first} {last}".strip()
            except Exception:
                pass
        
        # If still no name, force a synchronous fetch from auth service
        if not full:
            try:
                from django.conf import settings
                import requests
                auth_service_url = getattr(settings, 'DJANGO_AUTH_SERVICE', None)
                if auth_service_url:
                    # Try HDTS employees first
                    api_url = f"{auth_service_url}/api/v1/hdts/employees/internal/{user.id}/"
                    response = requests.get(api_url, timeout=3)
                    if response.status_code == 200:
                        data = response.json()
                        first = data.get('first_name') or ''
                        last = data.get('last_name') or ''
                        full = f"{first} {last}".strip()
                    
                    # If not found, try users internal endpoint (coordinators/admins)
                    if not full:
                        api_url = f"{auth_service_url}/api/v1/users/internal/{user.id}/"
                        response = requests.get(api_url, timeout=3)
                        if response.status_code == 200:
                            data = response.json()
                            first = data.get('first_name') or ''
                            last = data.get('last_name') or ''
                            full = f"{first} {last}".strip()
            except Exception:
                pass
                pass
        
        # If still no name, return a fallback that includes user ID for debugging
        if not full:
            return f'External User (ID: {user.id})'
        return full
    # Local employee path
    return get_user_display_name(user)


def generate_company_id():
    from ..models import Employee
    last_employee = Employee.objects.filter(company_id__startswith='MA').order_by('company_id').last()
    if last_employee:
        last_num = int(last_employee.company_id[2:])
        new_num = last_num + 1
    else:
        new_num = 1
    return f"MA{new_num:04d}"
