"""
Sample tests for BMS models.
Add more comprehensive tests as your application grows.
"""
import pytest
from django.test import TestCase
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta

from core.models import (
    Department, FiscalYear, Account, AccountType,
    ExpenseCategory, BudgetProposal
)


@pytest.mark.django_db
class TestDepartment(TestCase):
    """Tests for Department model"""
    
    def setUp(self):
        self.dept = Department.objects.create(
            code='IT',
            name='Information Technology',
            is_active=True
        )
    
    def test_department_creation(self):
        """Test basic department creation"""
        self.assertEqual(self.dept.code, 'IT')
        self.assertEqual(self.dept.name, 'Information Technology')
        self.assertTrue(self.dept.is_active)
    
    def test_department_str(self):
        """Test department string representation"""
        self.assertEqual(str(self.dept), 'Information Technology')


@pytest.mark.django_db
class TestFiscalYear(TestCase):
    """Tests for FiscalYear model"""
    
    def setUp(self):
        self.fy = FiscalYear.objects.create(
            name='FY 2026',
            start_date=datetime(2026, 1, 1).date(),
            end_date=datetime(2026, 12, 31).date(),
            is_active=True,
            is_locked=False
        )
    
    def test_fiscal_year_creation(self):
        """Test fiscal year creation"""
        self.assertEqual(self.fy.name, 'FY 2026')
        self.assertTrue(self.fy.is_active)
        self.assertFalse(self.fy.is_locked)
    
    def test_fiscal_year_date_constraint(self):
        """Test that end_date must be after start_date"""
        # This should raise ValidationError when constraint is enforced
        with self.assertRaises(Exception):
            FiscalYear.objects.create(
                name='Invalid FY',
                start_date=datetime(2026, 12, 31).date(),
                end_date=datetime(2026, 1, 1).date(),  # Before start_date
                is_active=True
            )


@pytest.mark.django_db
class TestAccount(TestCase):
    """Tests for Account model"""
    
    def setUp(self):
        self.account_type = AccountType.objects.create(name='Asset')
        self.account = Account.objects.create(
            code='1010',
            name='Cash in Bank',
            account_type=self.account_type,
            created_by_user_id=1,
            created_by_username='admin',
            is_active=True
        )
    
    def test_account_creation(self):
        """Test account creation"""
        self.assertEqual(self.account.code, '1010')
        self.assertEqual(self.account.name, 'Cash in Bank')
        self.assertEqual(self.account.account_type.name, 'Asset')
    
    def test_account_str(self):
        """Test account string representation"""
        self.assertEqual(str(self.account), '1010 - Cash in Bank')


@pytest.mark.django_db
class TestExpenseCategory(TestCase):
    """Tests for ExpenseCategory model"""
    
    def setUp(self):
        self.root_capex = ExpenseCategory.objects.create(
            code='CAPEX',
            name='Capital Expenditure',
            level=1,
            classification='CAPEX'
        )
        
        self.sub_category = ExpenseCategory.objects.create(
            code='IT-HW',
            name='IT Hardware',
            level=2,
            classification='CAPEX',
            parent_category=self.root_capex
        )
    
    def test_category_hierarchy(self):
        """Test category parent-child relationship"""
        self.assertEqual(self.sub_category.parent_category, self.root_capex)
        self.assertEqual(self.root_capex.subcategories.count(), 1)
    
    def test_category_classification(self):
        """Test category classification"""
        self.assertEqual(self.root_capex.classification, 'CAPEX')
        self.assertEqual(self.sub_category.classification, 'CAPEX')


@pytest.mark.django_db
class TestBudgetProposal(TestCase):
    """Tests for BudgetProposal model"""
    
    def setUp(self):
        self.dept = Department.objects.create(
            code='IT',
            name='Information Technology'
        )
        
        self.fy = FiscalYear.objects.create(
            name='FY 2026',
            start_date=datetime(2026, 1, 1).date(),
            end_date=datetime(2026, 12, 31).date(),
            is_active=True
        )
        
        self.proposal = BudgetProposal.objects.create(
            external_system_id='TKT-IT-2026-001',
            title='Server Upgrade Project',
            project_summary='Upgrade data center servers',
            project_description='Replace aging infrastructure',
            department=self.dept,
            fiscal_year=self.fy,
            submitted_by_name='John Doe',
            status='SUBMITTED',
            performance_start_date=datetime(2026, 2, 1).date(),
            performance_end_date=datetime(2026, 6, 30).date()
        )
    
    def test_proposal_creation(self):
        """Test budget proposal creation"""
        self.assertEqual(self.proposal.status, 'SUBMITTED')
        self.assertEqual(self.proposal.department, self.dept)
        self.assertEqual(self.proposal.fiscal_year, self.fy)
    
    def test_proposal_status_choices(self):
        """Test valid status transitions"""
        valid_statuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']
        
        for status in valid_statuses:
            self.proposal.status = status
            self.proposal.save()
            self.assertEqual(self.proposal.status, status)
    
    def test_performance_dates(self):
        """Test performance date validation"""
        self.assertTrue(
            self.proposal.performance_end_date > self.proposal.performance_start_date
        )


@pytest.mark.unit
class TestModelUtils(TestCase):
    """Test utility functions and edge cases"""
    
    @pytest.mark.django_db
    def test_department_budget_summary(self):
        """Test department budget summary calculation"""
        dept = Department.objects.create(
            code='TEST',
            name='Test Department'
        )
        
        fy = FiscalYear.objects.create(
            name='FY 2026',
            start_date=datetime(2026, 1, 1).date(),
            end_date=datetime(2026, 12, 31).date()
        )
        
        # Test with no allocations
        summary = dept.get_budget_summary(fy)
        self.assertEqual(summary['total_budget'], 0)
        self.assertEqual(summary['total_spent'], 0)