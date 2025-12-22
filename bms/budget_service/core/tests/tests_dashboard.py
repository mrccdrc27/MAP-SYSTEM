from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from ..models import (
    FiscalYear, BudgetAllocation, Expense, Department, 
    Project, Account, AccountType, ExpenseCategory, BudgetProposal
)
from ..authentication import CustomUser

class DashboardAPITestCase(APITestCase):
    def setUp(self):
        """This method runs before each test."""
        # Create all necessary related objects
        self.fiscal_year = FiscalYear.objects.create(name="FY2025", start_date="2025-01-01", end_date="2025-12-31")
        self.department = Department.objects.create(name="IT", code="IT")
        
        # An Account and AccountType are needed for BudgetAllocation and Expense
        self.account_type = AccountType.objects.create(name="Expense")
        self.account = Account.objects.create(code="5100", name="IT Supplies", account_type=self.account_type)
        
        # An ExpenseCategory is needed
        self.category = ExpenseCategory.objects.create(name="Hardware", code="HW", level=1)
        
        #a BudgetProposal and project are required to link to a budget a llocation
        self.proposal = BudgetProposal.objects.create(
            title="Test Proposal", department=self.department, fiscal_year=self.fiscal_year,
            external_system_id='DTS-TEST-001', status='APPROVED',
            performance_start_date="2025-01-01", performance_end_date="2025-12-31"
        )
        self.project = Project.objects.create(
            name="Test Project", department=self.department, budget_proposal=self.proposal,
            start_date="2025-01-01", end_date="2025-12-31"
        )
        
        # Create the BudgetAllocation with all its dependencies
        self.allocation = BudgetAllocation.objects.create(
            fiscal_year=self.fiscal_year,
            department=self.department,
            project=self.project,
            account=self.account,
            category=self.category,
            amount=Decimal('100000.00')
        )
        
        # Create an approved Expense
        Expense.objects.create(
            budget_allocation=self.allocation,
            department=self.department,
            account=self.account,
            category=self.category,
            project=self.project,
            status='APPROVED',
            amount=Decimal('25000.00'),
            date="2025-06-15",
            vendor="Test Vendor",
            description="Test Expense"
        )
        # --- SIMULATE THE AUTHENTICATED USER ---
        # This dictionary mimics the payload of a decoded JWT
        jwt_payload = {
            'user_id': 'a-fake-uuid-from-auth-service',
            'email': 'testuser@example.com',
            'username': 'testuser',
            'first_name': 'Test',
            'last_name': 'User',
            'roles': {'bms': 'FINANCE_HEAD'}, # Give them a role for permission checks
            'department_id': self.department.id, # Link them to the IT department
            'department_name': self.department.name
        }
        # Create the mock user object
        self.mock_user = CustomUser(jwt_payload)

    def test_get_dashboard_budget_summary(self):
        """
        Ensures the dashboard budget summary endpoint returns correct calculations
        for an authenticated user.
        """
        # The URL for the endpoint we are testing
        url = reverse('dashboard-budget-summary') 
        
        # Force DRF's test client to treat the request
        # as if it came from authenticated mock user.
        self.client.force_authenticate(user=self.mock_user)
        
        # Now, make the actual API call
        response = self.client.get(url)
        
        # --- REAL ASSERTIONS --- 
        
        # 1. Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 2. Check that the calculations in the response are correct
        #    These values come from the data we created in the setUp method.
        self.assertEqual(response.data['fiscal_year'], 'FY2025')
        self.assertEqual(Decimal(response.data['total_budget']), Decimal('100000.00'))
        self.assertEqual(Decimal(response.data['total_spent']), Decimal('25000.00'))
        self.assertEqual(Decimal(response.data['remaining_budget']), Decimal('75000.00'))
        self.assertEqual(float(response.data['percentage_used']), 25.0)
