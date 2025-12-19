from ..authentication import ExternalUser


def get_external_employee_data(user_id):
    """
    Get external employee data from the ExternalEmployee model (synced from auth2).
    Returns employee data dict or empty dict if not found.
    """
    try:
        from ..models import ExternalEmployee
        employee = ExternalEmployee.objects.filter(
            external_user_id=user_id
        ).first() or ExternalEmployee.objects.filter(
            company_id=str(user_id)
        ).first()
        
        if employee:
            return {
                'id': employee.external_user_id or employee.company_id,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'email': employee.email,
                'company_id': employee.company_id,
                'department': employee.department,
                'image': str(employee.image.url) if employee.image else None,
            }
    except Exception:
        pass
    
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
            # Attempt to fetch profile from ExternalEmployee model
            try:
                profile = get_external_employee_data(user.id)
            except Exception:
                profile = None
            first = (profile or {}).get('first_name') or ''
            last = (profile or {}).get('last_name') or ''
            full = f"{first} {last}".strip()
        return full or 'External User'
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
