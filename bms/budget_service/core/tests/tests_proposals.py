from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal

from ..models import (
    FiscalYear, BudgetProposal, BudgetProposalItem, Project, Department, 
    Account, AccountType, ProposalHistory, ProposalComment
)
# Import the CustomUser class to simulate a user from a JWT
from ..authentication import CustomUser

class BudgetProposalWorkflowTestCase(APITestCase):
    def setUp(self):
        """This method runs before each test to create necessary data."""
        # Create foundational data
        self.fiscal_year = FiscalYear.objects.create(name="FY2025", start_date="2025-01-01", end_date="2025-12-31")
        self.department = Department.objects.create(name="Marketing", code="MKT")
        self.account_type = AccountType.objects.create(name="Expense")
        self.account = Account.objects.create(code="5200", name="Marketing Expenses", account_type=self.account_type)

        # Create a  BudgetProposal in a state ready for review
        self.proposal = BudgetProposal.objects.create(
            title="Q3 Marketing Campaign",
            status='SUBMITTED',  # It must be SUBMITTED to be reviewed
            department=self.department,
            fiscal_year=self.fiscal_year,
            external_system_id='DTS-MKT-001',
            submitted_by_name='External System',
            performance_start_date="2025-07-01",
            performance_end_date="2025-09-30",
            project_summary="A campaign to boost Q3 sales."
        )
        
        # Add an item to the proposal
        BudgetProposalItem.objects.create(
            proposal=self.proposal,
            account=self.account,
            cost_element="Social Media Ads",
            estimated_cost=Decimal("50000.00")
        )

        # --- SIMULATE THE AUTHENTICATED REVIEWER ---
        # This user will perform the 'review' action, example: Finance Head.
        jwt_payload = {
            'user_id': 'another-fake-uuid',
            'email': 'finance.head@example.com',
            'username': 'fhead',
            'first_name': 'Finance',
            'last_name': 'Head',
            'roles': {'bms': 'FINANCE_HEAD'}, # The role is important for RBAC
            'department_id': self.department.id, # Can belong to any dept
        }
        self.mock_reviewer = CustomUser(jwt_payload)

    def test_project_creation_on_proposal_approval(self):
        """
        Tests that an API call to the 'review' action with 'APPROVED' status
        correctly creates a new Project and updates the proposal.
        """
        # 1. Arrange: Define the URL and the request payload
        
        # The URL for the custom 'review' action on the BudgetProposalViewSet.
        # The basename is 'external-budget-proposals' from your urls.py
        url = reverse('external-budget-proposals-review', kwargs={'pk': self.proposal.pk})
        
        payload = {
            'status': 'APPROVED',
            'comment': 'This proposal is well-defined and approved for execution.'
        }

        # 2. ACT: Authenticate and make the API call
        
        # Authenticate the request as our mock reviewer
        self.client.force_authenticate(user=self.mock_reviewer)
        
        # Make the POST request to the review endpoint
        response = self.client.post(url, data=payload, format='json')

        # 3. ASSERT: Check the results
        
        # Check that the API call was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # --- Primary Assertion: Was the Project created? ---
        self.assertTrue(Project.objects.filter(budget_proposal=self.proposal).exists())
        
        # --- Secondary Assertions: Were all side-effects correct? ---
        
        # Refresh the proposal object from the database to get its updated state
        self.proposal.refresh_from_db()
        
        # Check that the proposal's status was updated
        self.assertEqual(self.proposal.status, 'APPROVED')
        
        # Check that the reviewer's name was recorded
        self.assertEqual(self.proposal.approved_by_name, self.mock_reviewer.get_full_name())
        
        # Check that a history record was created for the approval
        self.assertTrue(ProposalHistory.objects.filter(
            proposal=self.proposal, 
            action='APPROVED'
        ).exists())
        
        # Check that the comment was created and linked correctly
        self.assertTrue(ProposalComment.objects.filter(
            proposal=self.proposal,
            comment=payload['comment'],
            user_id=self.mock_reviewer.id
        ).exists())

        # Check the created Project's details
        project = Project.objects.get(budget_proposal=self.proposal)
        self.assertEqual(project.name, f"Project for: {self.proposal.title}")
        self.assertEqual(project.department, self.department)
        self.assertEqual(project.status, 'PLANNING')