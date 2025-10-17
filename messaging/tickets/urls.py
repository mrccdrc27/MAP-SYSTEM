from django.urls import path
from . import views

urlpatterns = [
    path('open/', views.open_ticket, name='open_ticket'),
    path('send/', views.send_message, name='send_message'),
    path('fetch/', views.fetch_messages, name='fetch_messages'),
    path('close/', views.close_ticket, name='close_ticket'),
    path('<str:ticket_id>/', views.get_ticket_details, name='get_ticket_details'),
]