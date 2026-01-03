from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from .views import UserIDsByRoleView, UserInfoByIDView, UsersInfoBatchView, AssignAgentToRoleView, assign_agent_to_role_form, role_assignments_view, manage_assignments_api
from users.views import CreateRoleView, UpdateAssignmentView

app_name = 'tts'

@api_view(['GET'])
def tts_root(request, format=None):
    return Response({
        'round-robin': reverse('tts:user_ids_by_role', request=request),
        'user-info': request.build_absolute_uri('user-info/') + '{user_id}/',
        'users-info': reverse('tts:users_info_batch', request=request),
        'assign-agent-to-role': reverse('tts:assign_agent_to_role', request=request),
        'assign-agent-to-role-form': reverse('tts:assign_agent_to_role_form', request=request),
        'manage-assignments': reverse('tts:manage_assignments_api', request=request),
    })

urlpatterns = [
    path('', tts_root, name='tts_root'),
    path('round-robin/', UserIDsByRoleView.as_view(), name='user_ids_by_role'),
    path('user-info/<int:user_id>/', UserInfoByIDView.as_view(), name='user_info_by_id'),
    path('users-info/', UsersInfoBatchView.as_view(), name='users_info_batch'),
    path('assign-agent-to-role/', AssignAgentToRoleView.as_view(), name='assign_agent_to_role'),
    path('assign-agent-to-role-form/', assign_agent_to_role_form, name='assign_agent_to_role_form'),
    path('assign-role/', assign_agent_to_role_form, name='assign_role_shortcut'),
    path('create-role/', CreateRoleView.as_view(), name='create_role'),
    path('update-assignment/<int:assignment_id>/', UpdateAssignmentView.as_view(), name='update_assignment'),
    path('manage-assignments/', role_assignments_view, name='manage_assignments'),
    path('manage-assignments-api/', manage_assignments_api, name='manage_assignments_api'),
]