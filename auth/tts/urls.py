from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from .views import UserIDsByRoleView, UserInfoByIDView, UsersInfoBatchView, AssignAgentToRoleView

app_name = 'tts'

@api_view(['GET'])
def tts_root(request, format=None):
    return Response({
        'round-robin': reverse('tts:user_ids_by_role', request=request),
        'user-info': request.build_absolute_uri('user-info/') + '{user_id}/',
        'users-info': reverse('tts:users_info_batch', request=request),
        'assign-agent-to-role': reverse('tts:assign_agent_to_role', request=request),
    })

urlpatterns = [
    path('', tts_root, name='tts_root'),
    path('round-robin/', UserIDsByRoleView.as_view(), name='user_ids_by_role'),
    path('user-info/<int:user_id>/', UserInfoByIDView.as_view(), name='user_info_by_id'),
    path('users-info/', UsersInfoBatchView.as_view(), name='users_info_batch'),
    path('assign-agent-to-role/', AssignAgentToRoleView.as_view(), name='assign_agent_to_role'),
]