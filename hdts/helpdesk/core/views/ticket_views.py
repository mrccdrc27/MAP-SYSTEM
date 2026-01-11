import json
import os
import mimetypes
import traceback
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import FileResponse, Http404, HttpResponse
from django.conf import settings
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, parser_classes, authentication_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.reverse import reverse

from ..authentication import CookieJWTAuthentication, ExternalUser
from ..models import Ticket, TicketAttachment, TicketComment, ActivityLog, EmployeeNotification, PRIORITY_LEVELS, DEPARTMENT_CHOICES
from ..serializers import TicketSerializer, TicketAttachmentSerializer
from .permissions import IsAdminOrCoordinator, IsEmployeeOrAdmin
from .helpers import _actor_display_name, get_external_employee_data


def create_employee_notification(ticket, notification_type, title=None, message=None, actor_name=None):
    """
    Helper function to create employee notifications.
    Uses the ticket's employee_cookie_id as the notification recipient.
    """
    try:
        employee_id = getattr(ticket, 'employee_cookie_id', None)
        if not employee_id and ticket.employee:
            employee_id = ticket.employee.id
        
        if not employee_id:
            return None
        
        if notification_type == 'ticket_submitted':
            return EmployeeNotification.create_ticket_submitted_notification(employee_id, ticket)
        elif notification_type in ['ticket_approved', 'ticket_rejected', 'ticket_in_progress', 
                                   'ticket_on_hold', 'ticket_resolved', 'ticket_closed', 'ticket_withdrawn']:
            # Map notification type to status
            status_map = {
                'ticket_approved': 'Open',
                'ticket_rejected': 'Rejected',
                'ticket_in_progress': 'In Progress',
                'ticket_on_hold': 'On Hold',
                'ticket_resolved': 'Resolved',
                'ticket_closed': 'Closed',
                'ticket_withdrawn': 'Withdrawn',
            }
            status_value = status_map.get(notification_type)
            return EmployeeNotification.create_ticket_status_notification(employee_id, ticket, status_value, actor_name)
        elif notification_type in ['new_reply', 'owner_reply']:
            return EmployeeNotification.create_reply_notification(employee_id, ticket, actor_name)
        else:
            # Custom notification
            if title and message:
                return EmployeeNotification.create_notification(
                    employee_id=employee_id,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    ticket=ticket,
                    link_type='ticket'
                )
    except Exception as e:
        print(f"[Notification] Error creating notification: {e}")
        return None


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    authentication_classes = [
        CookieJWTAuthentication, 
        JWTAuthentication
    ]
    permission_classes = [IsEmployeeOrAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        if isinstance(user, ExternalUser):
            if user.role in ['Admin', 'Ticket Coordinator', 'System Admin']:
                return Ticket.objects.all().order_by('-submit_date')
            return Ticket.objects.filter(employee_cookie_id=user.id).order_by('-submit_date')
        if hasattr(user, 'role') and user.role in ['System Admin', 'Ticket Coordinator', 'Admin']:
            return Ticket.objects.all().order_by('-submit_date')
        return Ticket.objects.filter(employee=user).order_by('-submit_date')
    
    def create(self, request, *args, **kwargs):
        try:
            print("[TicketViewSet.create] Enter create()")

            try:
                files_preview = request.FILES.getlist('files[]') if hasattr(request, 'FILES') else []
                print(f"[TicketViewSet.create] incoming files count: {len(files_preview)}")
                for i, f in enumerate(files_preview):
                    try:
                        print(f"  - file[{i}] class={f.__class__.__name__} name={getattr(f, 'name', None)} size={getattr(f, 'size', None)} content_type={getattr(f, 'content_type', None)}")
                    except Exception:
                        print(f"  - file[{i}] (metadata unavailable)")
            except Exception:
                print("[TicketViewSet.create] unable to enumerate request.FILES")

            try:
                content_type = getattr(request, 'content_type', '') or ''
                if content_type.startswith('multipart') and hasattr(request, 'POST'):
                    data = request.POST.copy()
                else:
                    try:
                        data = dict(request.data)
                    except Exception:
                        data = request.data.copy() if hasattr(request.data, 'copy') else {}
            except Exception:
                data = {}

            dynamic = data.get('dynamic_data')
            parsed_dynamic = None
            if dynamic:
                if isinstance(dynamic, (str, bytes)):
                    try:
                        parsed_dynamic = json.loads(dynamic)
                    except Exception:
                        parsed_dynamic = None
                elif isinstance(dynamic, dict):
                    parsed_dynamic = dynamic

            if isinstance(parsed_dynamic, dict):
                dd = parsed_dynamic
                dynamic_date_keys = ['expectedReturnDate', 'performanceStartDate', 'performanceEndDate', 'scheduledDate']
                for dk in dynamic_date_keys:
                    if dk in dd:
                        v = dd.get(dk)
                        if v is None:
                            continue
                        if not isinstance(v, str):
                            continue
                        s = v.strip()
                        if s == '' or all(c in '""\"\'' for c in s):
                            dd[dk] = None
                            continue
                        if 'T' in s:
                            s = s.split('T')[0]
                        s = s.replace('/', '-')
                        try:
                            datetime.fromisoformat(s)
                            dd[dk] = s
                        except Exception:
                            dd[dk] = None

            plain_data = {k: data.get(k) for k in data.keys()}
            if parsed_dynamic is not None:
                plain_data['dynamic_data'] = parsed_dynamic

            date_keys = [
                'check_out_date', 'expected_return_date', 'performance_start_date',
                'performance_end_date', 'scheduled_date'
            ]
            for dk in date_keys:
                if dk in plain_data:
                    val = plain_data.get(dk)
                    if val is None:
                        continue
                    if not isinstance(val, str):
                        continue
                    s = val.strip()
                    if s == '' or all(c in '""\"\'' for c in s):
                        plain_data[dk] = None
                        continue
                    if 'T' in s:
                        s = s.split('T')[0]
                    s = s.replace('/', '-')
                    try:
                        datetime.fromisoformat(s)
                        plain_data[dk] = s
                    except Exception:
                        plain_data[dk] = None

            files = request.FILES.getlist('files[]') if hasattr(request, 'FILES') else []

            serializer = self.get_serializer(data=plain_data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = self.perform_create(serializer)

            created_attachments = []
            attachment_errors = []
            for idx, file in enumerate(files):
                try:
                    try:
                        print(f"[TicketViewSet.create] attachment[{idx}] class={file.__class__.__name__} name={getattr(file, 'name', None)} size={getattr(file, 'size', None)} content_type={getattr(file, 'content_type', None)}")
                    except Exception:
                        pass

                    ta = TicketAttachment.objects.create(
                        ticket=instance,
                        file=file,
                        file_name=getattr(file, 'name', '') or '',
                        file_type=getattr(file, 'content_type', '') or '',
                        file_size=getattr(file, 'size', 0) or 0,
                        uploaded_by=request.user if not isinstance(request.user, ExternalUser) else None
                    )
                    created_attachments.append(ta)
                except Exception as attach_err:
                    traceback.print_exc()
                    err_msg = str(attach_err)
                    print(f"[TicketViewSet.create] Failed to save attachment[{idx}]: {err_msg}")
                    attachment_errors.append({
                        'index': idx,
                        'name': getattr(file, 'name', None),
                        'error': err_msg,
                        'class': file.__class__.__name__ if hasattr(file, '__class__') else None
                    })

            try:
                print(f"[TicketViewSet.create] received {len(files)} files, created {len(created_attachments)} attachments for ticket id={instance.id}")
                for ta in created_attachments:
                    print(f"  - attachment: {ta.file_name} -> {getattr(ta.file, 'url', None)}")
            except Exception:
                pass

            try:
                serialized = TicketSerializer(instance, context={'request': request}).data
            except Exception:
                serialized = serializer.data

            try:
                if attachment_errors:
                    serialized['_attachment_errors'] = attachment_errors
            except Exception:
                pass

            headers = self.get_success_headers(serialized)
            return Response(serialized, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            traceback.print_exc()
            return Response({'error': 'Internal server error while creating ticket', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def perform_create(self, serializer):
        if isinstance(self.request.user, ExternalUser):
            user = self.request.user
            print(f"[perform_create] ExternalUser profile: {user.first_name} {user.last_name}, {user.department}, {user.company_id}")
            ticket = serializer.save(employee=None, employee_cookie_id=user.id)
            
            # Create notification for ticket submission (ExternalUser)
            create_employee_notification(ticket, 'ticket_submitted')
            
            return ticket
        else:
            ticket = serializer.save(employee=self.request.user)
            try:
                ActivityLog.objects.create(
                    user=ticket.employee,
                    action_type='ticket_created',
                    message=f'Created new ticket: {ticket.subject}',
                    ticket=ticket,
                    actor=self.request.user if hasattr(self.request, 'user') else None,
                    metadata={'category': ticket.category}
                )
            except Exception:
                pass
            
            # Create notification for ticket submission
            create_employee_notification(ticket, 'ticket_submitted')
            
            return ticket
        
    def perform_update(self, serializer):
        instance = serializer.instance
        old_status = instance.status
        new_status = serializer.validated_data.get('status', old_status)
        if old_status != new_status:
            if new_status == 'Closed' and old_status != 'Closed':
                serializer.validated_data['time_closed'] = timezone.now()
                if instance.submit_date:
                    serializer.validated_data['resolution_time'] = timezone.now() - instance.submit_date
            try:
                ActivityLog.objects.create(
                    user=instance.employee,
                    action_type='status_changed',
                    message=f'Status changed from {old_status} to {new_status}',
                    ticket=instance,
                    actor=self.request.user if hasattr(self.request, 'user') else None,
                    metadata={'previous_status': old_status, 'new_status': new_status}
                )
            except Exception:
                pass

        serializer.save()


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def get_ticket_detail(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        user = request.user
        if isinstance(user, ExternalUser):
            if user.role in ['Ticket Coordinator', 'Admin']:
                pass
            elif getattr(ticket, 'employee_cookie_id', None) != user.id:
                return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        elif not (user.is_staff or getattr(user, 'role', None) in ['System Admin', 'Ticket Coordinator'] or user == ticket.employee):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if getattr(user, 'role', None) in ['System Admin', 'Ticket Coordinator'] or getattr(user, 'is_staff', False):
            comments = ticket.comments.all().order_by('-created_at')
        else:
            comments = ticket.comments.filter(is_internal=False).order_by('-created_at')

        # Short-circuit heavy lookups for these statuses to speed up loading
        short_circuit = getattr(ticket, 'status', '') in ('Open', 'Withdrawn', 'Closed', 'Rejected')

        ticket_data = {
            'id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'subject': ticket.subject,
            'category': ticket.category,
            'sub_category': ticket.sub_category,
            'description': ticket.description,
            'attachments': TicketAttachmentSerializer(ticket.attachments.all(), many=True).data,
            'status': ticket.status,
            'priority': ticket.priority,
            'priorityLevel': ticket.priority,
            'department': ticket.department,
            'submit_date': ticket.submit_date,
            'update_date': ticket.update_date,
            'current_agent': (
                {'id': ticket.current_agent.id} if short_circuit else {
                    'id': ticket.current_agent.id,
                    'first_name': ticket.current_agent.first_name,
                    'last_name': ticket.current_agent.last_name,
                }
            ) if ticket.current_agent else None,
        }

        # Batch-resolve external profiles to avoid per-comment remote calls.
        try:
            from ..models import ExternalEmployee
        except Exception:
            ExternalEmployee = None

        external_ids = set()
        if getattr(ticket, 'employee_cookie_id', None):
            external_ids.add(ticket.employee_cookie_id)
        for c in comments:
            if not c.user and getattr(c, 'user_cookie_id', None):
                external_ids.add(c.user_cookie_id)

        cache_map = {}
        if ExternalEmployee and external_ids:
            try:
                from django.db.models import Q
                ids_list = list(external_ids)
                # Query by both external_user_id and external_employee_id to find cached records
                qs = ExternalEmployee.objects.filter(
                    Q(external_user_id__in=ids_list) | Q(external_employee_id__in=ids_list)
                )
                for e in qs:
                    profile = {
                        'first_name': e.first_name,
                        'last_name': e.last_name,
                        'company_id': e.company_id,
                        'department': e.department,
                        'email': e.email,
                    }
                    if e.external_user_id:
                        cache_map[int(e.external_user_id)] = profile
                    if e.external_employee_id:
                        cache_map[int(e.external_employee_id)] = profile
            except Exception:
                cache_map = {}

        # short_circuit already computed above

        # Build employee payload using cache_map; avoid remote HTTP lookups when short_circuit=True
        employee_data = None
        if ticket.employee:
            employee_data = {
                'id': ticket.employee.id,
                'first_name': ticket.employee.first_name,
                'last_name': ticket.employee.last_name,
                'company_id': ticket.employee.company_id,
                'department': ticket.employee.department,
                'email': ticket.employee.email,
                'employee_cookie_id': getattr(ticket, 'employee_cookie_id', None)
            }
        elif getattr(ticket, 'employee_cookie_id', None):
            cid = ticket.employee_cookie_id
            prof = cache_map.get(int(cid)) if cid is not None else None
            if prof:
                employee_data = {
                    'id': cid,
                    'first_name': prof.get('first_name'),
                    'last_name': prof.get('last_name'),
                    'company_id': prof.get('company_id'),
                    'department': prof.get('department'),
                    'email': prof.get('email'),
                    'employee_cookie_id': cid
                }
            else:
                if short_circuit:
                    # Provide minimal placeholder quickly
                    employee_data = {
                        'id': cid,
                        'first_name': None,
                        'last_name': None,
                        'company_id': None,
                        'department': None,
                        'email': None,
                        'employee_cookie_id': cid
                    }
                else:
                    profile = get_external_employee_data(cid)
                    employee_data = {
                        'id': cid,
                        'first_name': profile.get('first_name'),
                        'last_name': profile.get('last_name'),
                        'company_id': profile.get('company_id'),
                        'department': profile.get('department'),
                        'email': profile.get('email'),
                        'employee_cookie_id': cid
                    }
        else:
            employee_data = {
                'id': None,
                'first_name': None,
                'last_name': None,
                'company_id': None,
                'department': None,
                'email': None,
                'employee_cookie_id': None
            }

        # If we short-circuited and we have missing external IDs, enqueue async prefetch
        try:
            missing = []
            for eid in external_ids:
                if eid is None:
                    continue
                if int(eid) not in cache_map:
                    missing.append(int(eid))

            if short_circuit and missing:
                try:
                    from ..tasks import prefetch_external_profiles
                    prefetch_external_profiles.delay(missing)
                except Exception:
                    # Ignore prefetch failures; don't block the request
                    pass
        except Exception:
            pass
        
        ticket_data['employee'] = employee_data
        ticket_data['approved_by'] = ticket.approved_by if hasattr(ticket, 'approved_by') else None
        ticket_data['comments'] = []
        for comment in comments:
            user_payload = {
                'id': comment.user.id if comment.user else comment.user_cookie_id,
                'first_name': '',
                'last_name': '',
                'role': 'Employee'
            }
            
            # Check if this is a system auto-response (no user and no cookie_id)
            is_auto = getattr(comment, 'is_auto_response', False) or (comment.user is None and comment.user_cookie_id is None)
            
            if is_auto:
                # System auto-response - show as Support Team
                user_payload['id'] = 'system'
                user_payload['first_name'] = 'Support'
                user_payload['last_name'] = 'Team'
                user_payload['role'] = 'System'
            elif comment.user:
                user_payload['first_name'] = getattr(comment.user, 'first_name', '') or ''
                user_payload['last_name'] = getattr(comment.user, 'last_name', '') or ''
                user_payload['role'] = getattr(comment.user, 'role', 'Employee')
            else:
                emp_cookie_id = getattr(ticket, 'employee_cookie_id', None)
                if emp_cookie_id is not None and comment.user_cookie_id != emp_cookie_id:
                    is_admin_viewer = getattr(request.user, 'is_staff', False) or (getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin'])
                    label = 'Coordinator' if is_admin_viewer else 'Support Team'
                    user_payload['first_name'] = label
                    user_payload['last_name'] = ''
                    user_payload['role'] = 'Support'
                else:
                    # Employee comments - anonymize to just "Employee"
                    user_payload['first_name'] = 'Employee'
                    user_payload['last_name'] = ''
                    user_payload['role'] = 'Employee'

            ticket_data['comments'].append({
                'id': comment.id,
                'comment': comment.comment,
                'created_at': comment.created_at,
                'is_internal': comment.is_internal,
                'user': user_payload,
                'attachment': comment.attachment.url if comment.attachment else None,
                'attachment_name': comment.attachment_name,
                'attachment_type': comment.attachment_type,
            })
        
        try:
            ticket_data['dynamic_data'] = ticket.dynamic_data
        except Exception:
            ticket_data['dynamic_data'] = None

        ticket_data.update({
            'asset_name': ticket.asset_name,
            'asset_id': ticket.asset_id,
            'serial_number': ticket.serial_number,
            'location': ticket.location,
            'check_out_date': ticket.check_out_date,
            'expected_return_date': ticket.expected_return_date,
            'issue_type': ticket.issue_type,
            'other_issue': ticket.other_issue,
            'performance_start_date': ticket.performance_start_date,
            'performance_end_date': ticket.performance_end_date,
            'cost_items': ticket.cost_items,
            'requested_budget': ticket.requested_budget,
            'fiscal_year': ticket.fiscal_year,
            'department_input': ticket.department_input,
            'coordinator': None,
            'rejected_by': ticket.rejected_by if hasattr(ticket, 'rejected_by') else None,
        })

        try:
            ticket_data['date_completed'] = ticket.date_completed if hasattr(ticket, 'date_completed') else None
        except Exception:
            ticket_data['date_completed'] = None
        try:
            ticket_data['csat_rating'] = ticket.csat_rating if hasattr(ticket, 'csat_rating') else None
        except Exception:
            ticket_data['csat_rating'] = None
        
        try:
            coord_key = ticket.approved_by if getattr(ticket, 'approved_by', None) else (ticket.rejected_by if getattr(ticket, 'rejected_by', None) else None)
            if coord_key and not ticket_data.get('coordinator'):
                from ..models import Employee
                coordinator_emp = Employee.objects.filter(company_id=coord_key).first()
                if coordinator_emp:
                    ticket_data['coordinator'] = {
                        'id': coordinator_emp.id,
                        'first_name': coordinator_emp.first_name,
                        'last_name': coordinator_emp.last_name,
                        'company_id': coordinator_emp.company_id,
                        'department': coordinator_emp.department,
                        'email': coordinator_emp.email,
                    }
        except Exception:
            pass

        return Response(ticket_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def get_ticket_by_number(request, ticket_number):
    try:
        ticket = get_object_or_404(Ticket, ticket_number=ticket_number)
        user = request.user
        if isinstance(user, ExternalUser):
            if getattr(user, 'role', None) not in ['Ticket Coordinator', 'Admin']:
                if str(getattr(ticket, 'employee_cookie_id', '')) != str(user.id):
                    return Response({'error': 'permission deniedz'}, status=status.HTTP_403_FORBIDDEN)
        elif not (user.is_staff or getattr(user, 'role', None) in ['System Admin', 'Ticket Coordinator'] or user == ticket.employee):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if getattr(user, 'role', None) in ['System Admin', 'Ticket Coordinator'] or getattr(user, 'is_staff', False):
            comments = ticket.comments.all().order_by('-created_at')
        else:
            comments = ticket.comments.filter(is_internal=False).order_by('-created_at')

        ticket_data = {
            'id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'subject': ticket.subject,
            'category': ticket.category,
            'sub_category': ticket.sub_category,
            'description': ticket.description,
            'attachments': TicketAttachmentSerializer(ticket.attachments.all(), many=True).data,
            'status': ticket.status,
            'priority': ticket.priority,
            'priorityLevel': ticket.priority,
            'department': ticket.department,
            'submit_date': ticket.submit_date,
            'update_date': ticket.update_date,
            'current_agent': {
                'id': ticket.current_agent.id,
                'first_name': ticket.current_agent.first_name,
                'last_name': ticket.current_agent.last_name,
            } if ticket.current_agent else None,
        }

        # Batch-resolve external profiles to avoid per-comment remote calls (same as get_ticket_detail)
        try:
            from ..models import ExternalEmployee
            from django.db.models import Q
        except Exception:
            ExternalEmployee = None

        external_ids = set()
        if getattr(ticket, 'employee_cookie_id', None):
            external_ids.add(ticket.employee_cookie_id)
        for c in comments:
            if not c.user and getattr(c, 'user_cookie_id', None):
                external_ids.add(c.user_cookie_id)

        cache_map = {}
        if ExternalEmployee and external_ids:
            try:
                ids_list = list(external_ids)
                qs = ExternalEmployee.objects.filter(
                    Q(external_user_id__in=ids_list) | Q(external_employee_id__in=ids_list)
                )
                for e in qs:
                    profile = {
                        'first_name': e.first_name,
                        'last_name': e.last_name,
                        'company_id': e.company_id,
                        'department': e.department,
                        'email': e.email,
                    }
                    if e.external_user_id:
                        cache_map[int(e.external_user_id)] = profile
                    if e.external_employee_id:
                        cache_map[int(e.external_employee_id)] = profile
            except Exception:
                cache_map = {}

        # Short-circuit remote HTTP lookups for these statuses to speed up loading
        short_circuit = getattr(ticket, 'status', '') in ('Open', 'Withdrawn', 'Closed', 'Rejected')
        
        employee_data = None
        if ticket.employee:
            employee_data = {
                'id': ticket.employee.id,
                'first_name': ticket.employee.first_name,
                'last_name': ticket.employee.last_name,
                'company_id': ticket.employee.company_id,
                'department': ticket.employee.department,
                'email': ticket.employee.email,
                'employee_cookie_id': getattr(ticket, 'employee_cookie_id', None)
            }
        elif getattr(ticket, 'employee_cookie_id', None):
            cid = ticket.employee_cookie_id
            prof = cache_map.get(int(cid)) if cid is not None else None
            if prof:
                employee_data = {
                    'id': cid,
                    'first_name': prof.get('first_name'),
                    'last_name': prof.get('last_name'),
                    'company_id': prof.get('company_id'),
                    'department': prof.get('department'),
                    'email': prof.get('email'),
                    'employee_cookie_id': cid
                }
            elif short_circuit:
                employee_data = {
                    'id': cid,
                    'first_name': None,
                    'last_name': None,
                    'company_id': None,
                    'department': None,
                    'email': None,
                    'employee_cookie_id': cid
                }
            else:
                profile = get_external_employee_data(cid)
                employee_data = {
                    'id': cid,
                    'first_name': profile.get('first_name'),
                    'last_name': profile.get('last_name'),
                    'company_id': profile.get('company_id'),
                    'department': profile.get('department'),
                    'email': profile.get('email'),
                    'employee_cookie_id': cid
                }
        
        ticket_data['employee'] = employee_data
        ticket_data['comments'] = []
        for comment in comments:
            user_payload = {
                'id': comment.user.id if comment.user else comment.user_cookie_id,
                'first_name': '',
                'last_name': '',
                'role': 'Employee'
            }

            # Check if this is a system auto-response (no user and no cookie_id)
            is_auto = getattr(comment, 'is_auto_response', False) or (comment.user is None and comment.user_cookie_id is None)
            
            if is_auto:
                # System auto-response - show as Support Team
                user_payload['id'] = 'system'
                user_payload['first_name'] = 'Support'
                user_payload['last_name'] = 'Team'
                user_payload['role'] = 'System'
            elif comment.user:
                user_payload['first_name'] = getattr(comment.user, 'first_name', '') or ''
                user_payload['last_name'] = getattr(comment.user, 'last_name', '') or ''
                user_payload['role'] = getattr(comment.user, 'role', 'Employee')
            else:
                # Employee comments - anonymize to just "Employee"
                user_payload['first_name'] = 'Employee'
                user_payload['last_name'] = ''
                user_payload['role'] = 'Employee'

            ticket_data['comments'].append({
                'id': comment.id,
                'comment': comment.comment,
                'created_at': comment.created_at,
                'is_internal': comment.is_internal,
                'user': user_payload,
                'attachment': comment.attachment.url if comment.attachment else None,
                'attachment_name': comment.attachment_name,
                'attachment_type': comment.attachment_type,
            })
        
        try:
            ticket_data['dynamic_data'] = ticket.dynamic_data
        except Exception:
            ticket_data['dynamic_data'] = None

        ticket_data.update({
            'asset_name': ticket.asset_name,
            'asset_id': ticket.asset_id,
            'serial_number': ticket.serial_number,
            'location': ticket.location,
            'check_out_date': ticket.check_out_date,
            'expected_return_date': ticket.expected_return_date,
            'issue_type': ticket.issue_type,
            'other_issue': ticket.other_issue,
            'performance_start_date': ticket.performance_start_date,
            'performance_end_date': ticket.performance_end_date,
            'cost_items': ticket.cost_items,
            'requested_budget': ticket.requested_budget,
            'approved_by': ticket.approved_by if hasattr(ticket, 'approved_by') else None,
            'coordinator': None,
            'rejected_by': ticket.rejected_by if hasattr(ticket, 'rejected_by') else None,
        })
        try:
            ticket_data['date_completed'] = ticket.date_completed if hasattr(ticket, 'date_completed') else None
        except Exception:
            ticket_data['date_completed'] = None
        try:
            ticket_data['csat_rating'] = ticket.csat_rating if hasattr(ticket, 'csat_rating') else None
        except Exception:
            ticket_data['csat_rating'] = None

        return Response(ticket_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def add_ticket_comment(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)

        is_ticket_owner = (
            (hasattr(request.user, 'id') and ticket.employee_cookie_id == request.user.id) or 
            (request.user == ticket.employee)
        )
        is_admin_or_coordinator = (
            request.user.is_staff or 
            getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin']
        )
        
        if not (is_admin_or_coordinator or is_ticket_owner):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        comment_text = request.data.get('comment', '').strip()
        attachment_file = request.FILES.get('attachment')
        
        # Allow either comment text or attachment (or both)
        if not comment_text and not attachment_file:
            return Response({'error': 'Comment text or attachment is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Parse is_internal - FormData sends booleans as strings
        is_internal_raw = request.data.get('is_internal', False)
        if isinstance(is_internal_raw, str):
            is_internal = is_internal_raw.lower() in ('true', '1', 'yes')
        else:
            is_internal = bool(is_internal_raw)
        
        if is_internal and not (request.user.is_staff or getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator', 'Admin']):
            return Response({'error': 'permission denied for internal comment'}, status=status.HTTP_403_FORBIDDEN)

        # Prepare attachment data
        attachment_name = None
        attachment_type = None
        if attachment_file:
            attachment_name = attachment_file.name
            attachment_type = attachment_file.content_type or 'application/octet-stream'

        if isinstance(request.user, ExternalUser):
            comment = TicketComment.objects.create(
                ticket=ticket,
                user=None,
                user_cookie_id=request.user.id,
                comment=comment_text,
                attachment=attachment_file,
                attachment_name=attachment_name,
                attachment_type=attachment_type,
                is_internal=is_internal
            )
            first = getattr(request.user, 'first_name', '') or ''
            last = getattr(request.user, 'last_name', '') or ''
            if not (first or last):
                try:
                    prof = get_external_employee_data(request.user.id)
                except Exception:
                    prof = {}
                first = (prof or {}).get('first_name') or ''
                last = (prof or {}).get('last_name') or ''
            user_data = {
                'id': request.user.id,
                'first_name': first,
                'last_name': last,
                'role': getattr(request.user, 'role', 'Employee')
            }
        else:
            comment = TicketComment.objects.create(
                ticket=ticket,
                user=request.user,
                user_cookie_id=None,
                comment=comment_text,
                attachment=attachment_file,
                attachment_name=attachment_name,
                attachment_type=attachment_type,
                is_internal=is_internal
            )
            user_data = {
                'id': comment.user.id,
                'first_name': comment.user.first_name,
                'last_name': comment.user.last_name,
                'role': getattr(comment.user, 'role', 'User')
            }

        comment_data = {
            'id': comment.id,
            'comment': comment.comment,
            'created_at': comment.created_at,
            'is_internal': comment.is_internal,
            'user': user_data,
            'attachment': comment.attachment.url if comment.attachment else None,
            'attachment_name': comment.attachment_name,
            'attachment_type': comment.attachment_type,
        }

        # Create notification for reply if it's from ticket owner (admin/coordinator) to employee
        # Only notify the employee if the comment is from someone else and not internal
        if not is_internal and is_admin_or_coordinator and not is_ticket_owner:
            replier_name = f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip() or 'Support Team'
            create_employee_notification(ticket, 'owner_reply', actor_name=replier_name)

        return Response(comment_data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([AllowAny])
def add_auto_response(request, ticket_id):
    """
    Create an auto-response comment for a ticket (system-generated Support Team message).
    This is used to persist the "Thank you for your message" auto-response.
    """
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        message = request.data.get('message', '').strip()
        
        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if auto-response already exists for this ticket
        existing = TicketComment.objects.filter(
            ticket=ticket,
            comment__icontains='Thank you for your message'
        ).exists()
        
        if existing:
            return Response({'message': 'Auto-response already exists'}, status=status.HTTP_200_OK)
        
        # Create the auto-response comment (no user - system generated)
        comment = TicketComment.objects.create(
            ticket=ticket,
            user=None,
            user_cookie_id=None,
            comment=message,
            is_internal=False,
            is_auto_response=True  # Mark as auto-response
        )
        
        return Response({
            'id': comment.id,
            'comment': comment.comment,
            'created_at': comment.created_at,
            'is_internal': comment.is_internal,
            'user': {
                'id': 'system',
                'first_name': 'Support',
                'last_name': 'Team',
                'role': 'System'
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# In-memory typing status store (ticket_number -> { user_id, user_name, timestamp })
# In production, use Redis or database
_typing_status = {}

@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([AllowAny])
def set_typing_status(request, ticket_number):
    """
    Set typing status for a ticket. Call when user starts/stops typing.
    POST body: { "is_typing": true/false, "user_id": "...", "user_name": "..." }
    """
    import time
    global _typing_status
    
    is_typing = request.data.get('is_typing', False)
    user_id = request.data.get('user_id', '')
    user_name = request.data.get('user_name', 'Someone')
    
    if is_typing:
        _typing_status[ticket_number] = {
            'user_id': str(user_id),
            'user_name': user_name,
            'timestamp': time.time()
        }
    else:
        # Clear typing status for this ticket if it was this user
        if ticket_number in _typing_status:
            if str(_typing_status[ticket_number].get('user_id', '')) == str(user_id):
                del _typing_status[ticket_number]
    
    return Response({'success': True})


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([AllowAny])
def get_typing_status(request, ticket_number):
    """
    Get typing status for a ticket. Returns who is typing (if anyone).
    Automatically expires typing status after 5 seconds.
    """
    import time
    global _typing_status
    
    # Clean up expired entries (older than 5 seconds)
    current_time = time.time()
    expired = [k for k, v in _typing_status.items() if current_time - v.get('timestamp', 0) > 5]
    for k in expired:
        del _typing_status[k]
    
    # Get typing status for this ticket
    status_entry = _typing_status.get(ticket_number)
    
    # Exclude current user from typing indicator
    current_user_id = request.query_params.get('exclude_user_id', '')
    
    if status_entry and str(status_entry.get('user_id', '')) != str(current_user_id):
        return Response({
            'is_typing': True,
            'user_id': status_entry.get('user_id'),
            'user_name': status_entry.get('user_name', 'Someone')
        })
    
    return Response({'is_typing': False})


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def approve_ticket(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)

        if not (request.user.is_staff or request.user.role in ['System Admin', 'Ticket Coordinator']):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if ticket.status not in ['New', 'Pending']:
            return Response({'error': 'Ticket cannot be approved in current state'}, status=status.HTTP_400_BAD_REQUEST)

        priority = request.data.get('priority', 'Low')
        department = request.data.get('department', 'IT Department')
        approval_notes = request.data.get('approval_notes', '')

        valid_priorities = [choice[0] for choice in PRIORITY_LEVELS]
        valid_departments = [choice[0] for choice in DEPARTMENT_CHOICES]

        if priority not in valid_priorities:
            return Response({'error': 'Invalid priority level'}, status=status.HTTP_400_BAD_REQUEST)
        if department not in valid_departments:
            return Response({'error': 'Invalid department'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = 'Open'
        ticket.priority = priority
        ticket.department = department
        user_display_name = _actor_display_name(request)
        ticket.approved_by = user_display_name
        
        # Auto-assign ticket coordinator as ticket owner
        # Exclude the approving user if they are a coordinator
        from ..services.coordinator_assignment import assign_ticket_coordinator
        exclude_id = None
        if isinstance(request.user, ExternalUser) and request.user.role == 'Ticket Coordinator':
            exclude_id = request.user.id
        
        assigned_coordinator = assign_ticket_coordinator(ticket, exclude_coordinator_id=exclude_id)
        
        # If assignment succeeds, ticket_owner_id is already set on the ticket instance
        # The save() call in assign_ticket_coordinator only updates ticket_owner_id
        # So we need to save the other fields too
        ticket.save()

        if isinstance(request.user, ExternalUser):
            TicketComment.objects.create(
                ticket=ticket,
                user=None,
                user_cookie_id=request.user.id,
                comment=f"Status changed to Open (approved by {user_display_name})",
                is_internal=False
            )
        else:
            TicketComment.objects.create(
                ticket=ticket,
                user=request.user,
                user_cookie_id=None,
                comment=f"Status changed to Open (approved by {user_display_name})",
                is_internal=False
            )
        
        # Add comment about ticket owner assignment
        if assigned_coordinator:
            owner_name = f"{assigned_coordinator.get('first_name', '')} {assigned_coordinator.get('last_name', '')}".strip() or assigned_coordinator.get('email', 'Unknown')
            TicketComment.objects.create(
                ticket=ticket,
                user=None,
                user_cookie_id=assigned_coordinator.get('id'),
                comment=f"Ticket assigned to {owner_name} as ticket owner",
                is_internal=True  # Internal note about assignment
            )

        # Create notification for ticket approval
        create_employee_notification(ticket, 'ticket_approved', actor_name=user_display_name)

        return Response({
            'message': 'Ticket approved successfully',
            'ticket_id': ticket.id,
            'status': ticket.status,
            'priority': ticket.priority,
            'department': ticket.department,
            'approved_by': ticket.approved_by,
            'ticket_owner_id': ticket.ticket_owner_id,
            'ticket_owner': {
                'id': assigned_coordinator.get('id'),
                'email': assigned_coordinator.get('email'),
                'name': f"{assigned_coordinator.get('first_name', '')} {assigned_coordinator.get('last_name', '')}".strip()
            } if assigned_coordinator else None
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def reject_ticket(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        if not (request.user.is_staff or request.user.role in ['System Admin', 'Ticket Coordinator']):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if ticket.status != 'New':
            return Response({'error': "Only tickets with status 'New' can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
        
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response({'error': 'Rejection reason is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        ticket.status = 'Rejected'
        if not isinstance(request.user, ExternalUser):
            ticket.current_agent = request.user
        ticket.rejection_reason = rejection_reason
        user_display_name = _actor_display_name(request)
        ticket.rejected_by = user_display_name
        ticket.save()
        
        if isinstance(request.user, ExternalUser):
            TicketComment.objects.create(
                ticket=ticket,
                user=None,
                user_cookie_id=request.user.id,
                comment=f"Ticket rejected by {user_display_name}. Reason: {rejection_reason}",
                is_internal=True
            )
        else:
            TicketComment.objects.create(
                ticket=ticket,
                user=request.user,
                user_cookie_id=None,
                comment=f"Ticket rejected by {user_display_name}. Reason: {rejection_reason}",
                is_internal=True
            )
        
        # Create notification for ticket rejection
        create_employee_notification(ticket, 'ticket_rejected', actor_name=user_display_name)
        
        return Response({
            'message': 'Ticket rejected successfully',
            'ticket_id': ticket.id,
            'status': ticket.status,
            'rejection_reason': rejection_reason,
            'rejected_by': ticket.rejected_by if hasattr(ticket, 'rejected_by') else None
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def claim_ticket(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)

        if (ticket.status != 'Open'):
            return Response({'error': 'Ticket is not available for claiming.'}, status=status.HTTP_400_BAD_REQUEST)

        if ticket.current_agent and ticket.status != 'Open':
            return Response({'error': 'Ticket is already claimed.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = 'In Progress'
        ticket.current_agent = request.user
        ticket.save()

        return Response({
            'message': 'Ticket successfully claimed.',
            'ticket_id': ticket.id,
            'status': ticket.status,
            'current_agent': request.user.email
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated])
def update_ticket_status(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        new_status = request.data.get('status')
        comment_text = request.data.get('comment', '').strip()

        is_ticket_owner = (
            (hasattr(request.user, 'id') and ticket.employee_cookie_id == request.user.id) or 
            (ticket.employee == request.user)
        )
        if not (request.user.is_staff or getattr(request.user, 'role', None) in ['System Admin', 'Ticket Coordinator']):
            # Employees can only close tickets, and only if they're the owner AND ticket is already Resolved
            if not (new_status == 'Closed' and is_ticket_owner and ticket.status == 'Resolved'):
                return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if not new_status:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        valid_statuses = ['Open', 'In Progress', 'Resolved', 'Closed', 'On Hold', 'Rejected']
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = ticket.status
        ticket.status = new_status
        
        if new_status == 'Closed' and old_status != 'Closed':
            ticket.time_closed = timezone.now()
            ticket.date_completed = timezone.now()
            if ticket.submit_date:
                ticket.resolution_time = timezone.now() - ticket.submit_date
        
        ticket.save()
        
        if new_status == 'Rejected':
            status_comment = "Status changed to Rejected"
        else:
            user_display_name = _actor_display_name(request)
            status_comment = f"Status changed from '{old_status}' to '{new_status}' by {user_display_name}"
            if comment_text:
                status_comment += f". Comment: {comment_text}"

        try:
            if isinstance(request.user, ExternalUser):
                TicketComment.objects.create(
                    ticket=ticket,
                    user=None,
                    user_cookie_id=request.user.id,
                    comment=status_comment,
                    is_internal=False
                )
            else:
                TicketComment.objects.create(
                    ticket=ticket,
                    user=request.user,
                    user_cookie_id=None,
                    comment=status_comment,
                    is_internal=False
                )
        except Exception:
            try:
                TicketComment.objects.create(ticket=ticket, comment=status_comment, is_internal=False)
            except Exception:
                pass

        try:
            if ticket.employee is not None:
                actor = None if isinstance(request.user, ExternalUser) else request.user
                ActivityLog.objects.create(
                    user=ticket.employee,
                    action_type='status_changed',
                    message=status_comment,
                    ticket=ticket,
                    actor=actor,
                    metadata={'previous_status': old_status, 'new_status': new_status}
                )
        except Exception:
            pass
        
        # Create notification for status change (exclude Open and Rejected as they have specific handlers)
        if new_status not in ['Open', 'Rejected', 'New']:
            notification_type_map = {
                'In Progress': 'ticket_in_progress',
                'On Hold': 'ticket_on_hold',
                'Resolved': 'ticket_resolved',
                'Closed': 'ticket_closed',
            }
            notif_type = notification_type_map.get(new_status)
            if notif_type:
                user_display_name = _actor_display_name(request)
                create_employee_notification(ticket, notif_type, actor_name=user_display_name)
        
        return Response({
            'message': 'Ticket status updated successfully',
            'ticket_id': ticket.id,
            'old_status': old_status,
            'new_status': new_status
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def withdraw_ticket(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        is_ticket_owner = (
            (hasattr(request.user, 'id') and ticket.employee_cookie_id == request.user.id) or 
            (ticket.employee == request.user)
        )
        if not is_ticket_owner:
            return Response({'error': 'You can only withdraw your own tickets'}, status=status.HTTP_403_FORBIDDEN)
        
        if ticket.status in ['Closed', 'Withdrawn', 'Resolved']:
            return Response({'error': f'Cannot withdraw ticket with status: {ticket.status}'}, status=status.HTTP_400_BAD_REQUEST)
        
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'error': 'Withdrawal reason is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = ticket.status
        ticket.status = 'Withdrawn'
        ticket.time_closed = timezone.now()
        if ticket.submit_date:
            ticket.resolution_time = timezone.now() - ticket.submit_date
        ticket.save()
        
        user_display_name = _actor_display_name(request)
        withdrawal_comment = f"Ticket withdrawn by {user_display_name}. Reason: {reason}"
        
        if isinstance(request.user, ExternalUser):
            TicketComment.objects.create(
                ticket=ticket,
                user=None,
                user_cookie_id=request.user.id,
                comment=withdrawal_comment,
                is_internal=False
            )
        else:
            TicketComment.objects.create(
                ticket=ticket,
                user=request.user,
                user_cookie_id=None,
                comment=withdrawal_comment,
                is_internal=False
            )
        
        # Create notification for withdrawal
        create_employee_notification(ticket, 'ticket_withdrawn', actor_name=user_display_name)
        
        return Response({
            'message': 'Ticket withdrawn successfully',
            'ticket_id': ticket.id,
            'old_status': old_status,
            'new_status': 'Withdrawn'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def submit_csat_rating(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        is_ticket_owner = (
            (hasattr(request.user, 'id') and ticket.employee_cookie_id == request.user.id) or 
            (ticket.employee == request.user)
        )
        if not is_ticket_owner:
            return Response({'error': 'You can only rate your own tickets'}, status=status.HTTP_403_FORBIDDEN)
        
        if ticket.status != 'Closed':
            return Response({'error': 'Can only rate closed tickets'}, status=status.HTTP_400_BAD_REQUEST)
        
        rating = request.data.get('rating')
        feedback = request.data.get('feedback', '')
        
        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return Response({'error': 'Rating must be an integer between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Allow any feedback text - frontend handles validation of options
        # Store feedback as-is (comma-separated string from frontend)
        
        ticket.csat_rating = rating
        ticket.feedback = feedback
        ticket.save()
        
        try:
            if ticket.employee:
                ActivityLog.objects.create(
                    user=ticket.employee,
                    action_type='csat_submitted',
                    message=f'Submitted CSAT rating ({rating} stars) for ticket {ticket.ticket_number}',
                    ticket=ticket,
                    actor=request.user if not isinstance(request.user, ExternalUser) else None,
                    metadata={'rating': rating, 'feedback': feedback}
                )
        except Exception:
            pass
        
        return Response({
            'message': 'CSAT rating submitted successfully',
            'ticket_id': ticket.id,
            'rating': rating,
            'feedback': feedback
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_csat_feedback(request):
    try:
        user = request.user
        if isinstance(user, ExternalUser):
            if user.role not in ['System Admin', 'Ticket Coordinator', 'Admin']:
                return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        elif not (user.is_staff or getattr(user, 'role', None) in ['System Admin', 'Ticket Coordinator']):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        tickets = Ticket.objects.filter(
            csat_rating__isnull=False
        ).select_related('employee').order_by('-update_date')
        
        feedback_data = []
        for ticket in tickets:
            employee_name = 'Unknown'
            if ticket.employee:
                employee_name = f"{ticket.employee.first_name} {ticket.employee.last_name}"
            elif ticket.employee_cookie_id:
                try:
                    profile = get_external_employee_data(ticket.employee_cookie_id)
                    first = profile.get('first_name', '')
                    last = profile.get('last_name', '')
                    employee_name = f"{first} {last}".strip() or 'External User'
                except Exception:
                    employee_name = 'External User'
            
            feedback_data.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'subject': ticket.subject,
                'rating': ticket.csat_rating,
                'feedback': ticket.feedback or '',
                'employee_name': employee_name,
                'submitted_date': ticket.update_date,
                'status': ticket.status
            })
        
        return Response(feedback_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def get_new_tickets(request):
    try:
        if not (request.user.is_staff or request.user.role in ['System Admin', 'Ticket Coordinator']):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        new_tickets = Ticket.objects.filter(status='New').select_related('employee').order_by('-submit_date')
        
        tickets_data = []
        for ticket in new_tickets:
            tickets_data.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'subject': ticket.subject,
                'category': ticket.category,
                'submit_date': ticket.submit_date,
                'employee_name': f"{ticket.employee.first_name} {ticket.employee.last_name}",
                'employee_department': ticket.employee.department,
                'has_attachment': bool(ticket.attachments.exists())
            })
        
        return Response(tickets_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def get_open_tickets(request):
    try:
        if not request.user.is_staff and request.user.role not in ['System Admin', 'Ticket Coordinator']:
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)

        tickets = Ticket.objects.filter(status='Open').select_related('employee')
        data = TicketSerializer(tickets, many=True).data
        return Response(data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsAdminOrCoordinator])
def get_my_tickets(request):
    """
    Get tickets owned by the current coordinator.
    For external users (auth service), uses ticket_owner_id field.
    For local users, falls back to current_agent field.
    """
    try:
        if not (request.user.is_staff or request.user.role in ['System Admin', 'Ticket Coordinator']):
            return Response({'error': 'permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # For external users (from auth service), use ticket_owner_id
        if isinstance(request.user, ExternalUser):
            my_tickets = Ticket.objects.filter(ticket_owner_id=request.user.id).select_related('employee').order_by('-submit_date')
        else:
            # For local employees, check both current_agent and ticket_owner_id
            my_tickets = Ticket.objects.filter(
                Q(current_agent=request.user) | Q(ticket_owner_id=request.user.id)
            ).select_related('employee').order_by('-submit_date')
        
        tickets_data = []
        for ticket in my_tickets:
            employee_name = "Unknown"
            employee_department = "Unknown"
            if ticket.employee:
                employee_name = f"{ticket.employee.first_name} {ticket.employee.last_name}"
                employee_department = ticket.employee.department
            
            # Try to surface workflow info for frontend lists. The authoritative
            # workflow/current step lives in the external workflow service (TTS).
            # We attempt best-effort extraction from ticket attributes or
            # `dynamic_data` so list views can display a name without extra
            # per-row network calls. If not present, frontend will fall back
            # to fetching workflow progress when viewing details.
            wf_name = None
            cs_name = None
            try:
                # Prefer explicit attributes if present
                wf_name = getattr(ticket, 'workflow_name', None) or getattr(ticket, 'workflow', None)
                cs_name = getattr(ticket, 'current_step_name', None) or getattr(ticket, 'current_step', None)
                # Fall back to dynamic_data payload
                dd = getattr(ticket, 'dynamic_data', None)
                if not wf_name and isinstance(dd, dict):
                    wf_name = dd.get('workflow_name') or dd.get('workflow') or dd.get('workflowName')
                if not cs_name and isinstance(dd, dict):
                    cs_name = dd.get('current_step') or dd.get('currentStepName') or dd.get('current_step_name')
            except Exception:
                wf_name = wf_name or None
                cs_name = cs_name or None

            tickets_data.append({
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'subject': ticket.subject,
                'category': ticket.category,
                'sub_category': ticket.sub_category,
                'workflowName': wf_name,
                'currentStepName': cs_name,
                'priority': ticket.priority,
                'department': ticket.department,
                'status': ticket.status,
                'submit_date': ticket.submit_date,
                'update_date': ticket.update_date,
                'employee_name': employee_name,
                'employee_department': employee_department,
                'employee_cookie_id': ticket.employee_cookie_id,
                'has_attachment': bool(ticket.attachments.exists()),
                'ticket_owner_id': ticket.ticket_owner_id
            })
        
        return Response(tickets_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated, IsEmployeeOrAdmin])
def download_attachment(request, ticket_id):
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        attachment_id = request.query_params.get('attachment_id')
        if not attachment_id:
            return Response({'error': 'attachment_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        attachment = get_object_or_404(TicketAttachment, id=attachment_id, ticket=ticket)
        
        if not attachment.file:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        response = FileResponse(attachment.file.open('rb'))
        response['Content-Disposition'] = f'attachment; filename="{attachment.file_name}"'
        return response
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def finalize_ticket(request, ticket_id):
    try:
        ticket = Ticket.objects.get(pk=ticket_id)
        ticket.status = 'Closed'
        ticket.time_closed = timezone.now()
        ticket.save()
        return Response({'message': 'Ticket finalized'}, status=status.HTTP_200_OK)
    except Ticket.DoesNotExist:
        return Response({'detail': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def custom_api_root(request, format=None):
    return Response({
        'create_employee': reverse('create_employee', request=request, format=format),
        'admin-create-employee': reverse('admin-create-employee', request=request, format=format),
        'token_employee': reverse('token_employee', request=request, format=format),
        'admin_token_obtain_pair': reverse('admin_token_obtain_pair', request=request, format=format),
        'token_refresh': reverse('token_refresh', request=request, format=format),
        'employee_profile': reverse('employee_profile', request=request, format=format),
        'get_ticket_detail': reverse('get_ticket_detail', args=[1], request=request, format=format),
        'approve_ticket': reverse('approve_ticket', args=[1], request=request, format=format),
        'reject_ticket': reverse('reject_ticket', args=[1], request=request, format=format),
        'claim_ticket': reverse('claim_ticket', args=[1], request=request, format=format),
        'update_ticket_status': reverse('update_ticket_status', args=[1], request=request, format=format),
        'get_new_tickets': reverse('get_new_tickets', request=request, format=format),
        'get_open_tickets': reverse('get_open_tickets', request=request, format=format),
        'get_my_tickets': reverse('get_my_tickets', request=request, format=format),
        'tickets': reverse('ticket-list', request=request, format=format),
    })
