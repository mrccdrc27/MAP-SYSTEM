# views.py

from rest_framework import generics
from .models import Project
from rest_framework.views import APIView
from .serializers import ProjectSerializer
from rest_framework.response import Response
from rest_framework import status

from tickets.models import WorkflowTicket  # adjust as needed


class ProjectListView(generics.ListAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

class ProjectDetailView(generics.RetrieveAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    lookup_field = 'pk'

class ProjectApproveView(APIView):
    def post(self, request, ticket_id):
        try:
            project = Project.objects.get(ticket_id=ticket_id)
        except Project.DoesNotExist:
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        project.is_approved = True
        project.save()
        return Response({"message": f"Project {ticket_id} approved."})
    

class UpdateProjectStatusView(APIView):
    def post(self, request):
        data = request.data
        external_system_id = data.get("external_system_id")
        new_status = data.get("new_status")

        if not external_system_id or new_status not in ["APPROVED", "REJECTED"]:
            return Response(
                {"detail": "Invalid or missing 'external_system_id' or 'new_status'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            project = Project.objects.get(ticket_id=external_system_id)
        except Project.DoesNotExist:
            return Response(
                {"detail": f"No Project found with ticket_id={external_system_id}"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update the project approval flag
        project.is_approved = new_status == "APPROVED"
        project.save()

        # ✅ Update related WorkflowTicket status
        try:
            ticket = WorkflowTicket.objects.get(ticket_id=external_system_id)
            ticket.status = "Resolved" if new_status == "APPROVED" else "Rejected"
            ticket.save()
        except WorkflowTicket.DoesNotExist:
            return Response(
                {"detail": f"Project updated, but no Ticket found with id={external_system_id}"},
                status=status.HTTP_200_OK
            )

        return Response(
            {"detail": f"Project and ticket status updated to {new_status}."},
            status=status.HTTP_200_OK
        )