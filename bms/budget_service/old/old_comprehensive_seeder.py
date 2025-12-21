import os
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random
from backend.core.models import (
    User, Department, AccountType, Account, FiscalYear,
    BudgetAllocation, DashboardMetric, Project, ExpenseCategory
)


class Command(BaseCommand):
    help = 'Creates comprehensive initial data for the application'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset data before creating (USE WITH CAUTION)',
        )

    @transaction.atomic
    def handle(self, *args, **kwargs):
        reset = kwargs.get('reset', False)
        
        if reset:
            self.stdout.write(self.style.WARNING('Resetting selected data...'))
            # Only reset non-user data to preserve user accounts
            self._reset_data()
        
        self.stdout.write(self.style.SUCCESS('Starting comprehensive data initialization...'))

        # Step 1: Create departments
        departments = self.create_departments()
        
        # Step 2: Create admin and test users (or retrieve existing ones)
        admin_user, users = self.create_users(departments)
        
        # Step 3: Create account types and chart of accounts
        account_types, accounts = self.create_account_structure(admin_user)
        
        # Step 4: Create expense categories
        expense_categories = self.create_expense_categories(admin_user)
        
        # Step 5: Create fiscal years
        fiscal_years = self.create_fiscal_years()
        
        # Step 6: Create budget allocations
        allocations = self.create_budget_allocations(fiscal_years[0], departments, accounts, admin_user)
        
        # Step 7: Create dashboard metrics
        self.create_dashboard_metrics(fiscal_years[0], departments, allocations)
        
        # Step 8: Create sample projects
        self.create_sample_projects(fiscal_years[0], departments, users)
        
        self.stdout.write(self.style.SUCCESS('Comprehensive data initialization completed successfully'))
    
    def _reset_data(self):
        """Reset non-user data carefully"""
        # Order matters due to foreign key constraints
        DashboardMetric.objects.all().delete()
        BudgetAllocation.objects.all().delete()
        Project.objects.all().delete()
        FiscalYear.objects.all().delete()
        Account.objects.all().delete()
        AccountType.objects.all().delete()
        ExpenseCategory.objects.all().delete()
        # Keep departments as they might be referenced by users
        self.stdout.write(self.style.WARNING('Selected data has been reset'))
    
    def create_departments(self):
        self.stdout.write('Creating departments...')
        departments = [
            {'name': 'Finance', 'code': 'FIN', 'description': 'Finance Department'},
            {'name': 'Marketing', 'code': 'MKT', 'description': 'Marketing Department'},
            {'name': 'Human Resources', 'code': 'HR', 'description': 'Human Resources Department'},
            {'name': 'Information Technology', 'code': 'IT', 'description': 'IT Department'},
            {'name': 'Operations', 'code': 'OPS', 'description': 'Operations Department'},
            {'name': 'Sales', 'code': 'SLS', 'description': 'Sales Department'},
        ]
        
        created_departments = []
        for dept_data in departments:
            dept, created = Department.objects.get_or_create(
                code=dept_data['code'],
                defaults={
                    'name': dept_data['name'],
                    'description': dept_data['description'],
                }
            )
            created_departments.append(dept)
        
        self.stdout.write(self.style.SUCCESS(f'Created/Retrieved {len(departments)} departments'))
        return created_departments
    
    def create_users(self, departments):
        self.stdout.write('Creating/verifying users...')
        
        # Find departments by code
        dept_dict = {dept.code: dept for dept in departments}
        finance_dept = dept_dict.get('FIN')
        it_dept = dept_dict.get('IT')
        hr_dept = dept_dict.get('HR')
        
        # Create or retrieve admin user
        admin_user, admin_created = User.objects.get_or_create(
            email='admin@example.com',
            defaults={
                'username': 'admin',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'FINANCE_HEAD',
                'department': finance_dept,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if admin_created:  # If created new user
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Created admin user'))
        else:
            self.stdout.write('Admin user already exists')
        
        # Create test users
        test_users = [
            {
                'email': 'finance_head@example.com',
                'username': 'finance_head',
                'password': 'password123',
                'first_name': 'Finance',
                'last_name': 'Head',
                'role': 'FINANCE_HEAD',
                'department': finance_dept,
                'phone_number': '09171234567',   
                'is_staff': True,
            },
            {
                'email': 'finance_operator@example.com',
                'username': 'finance_operator',
                'password': 'password123456789',
                'first_name': 'Finance',
                'last_name': 'Operator',
                'role': 'FINANCE_OPERATOR',
                'department': finance_dept,
                'phone_number': '09179876543',
            },
            {
                'email': 'adibentulan@gmail.com',
                'username': 'adi123',
                'password': 'password123',
                'first_name': 'Finance',
                'last_name': 'Operator',
                'role': 'FINANCE_OPERATOR',
                'department': finance_dept,
                'phone_number': '09179876542',
            },
            {
                'email': 'it_operator@example.com',
                'username': 'it_operator',
                'password': 'password123',
                'first_name': 'IT',
                'last_name': 'Operator',
                'role': 'FINANCE_OPERATOR',
                'department': it_dept,
            },
            {
                'email': 'hr_approver@example.com',
                'username': 'hr_approver',
                'password': 'password123',
                'first_name': 'HR',
                'last_name': 'Approver',
                'role': 'APPROVER',
                'department': hr_dept,
                'phone_number': '09178889999',
            },
        ]
        
        created_users = []
        for user_data in test_users:
            user, created = User.objects.update_or_create(
                email=user_data['email'],
                defaults={
                    'username': user_data['username'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'role': user_data['role'],
                    'department': user_data['department'],
                    'is_staff': user_data.get('is_staff', False),
                    'phone_number': user_data.get('phone_number'),
                }
            )
            
            if created:  # Only set password for newly created users
                user.set_password(user_data['password'])
                user.save()
            
            created_users.append(user)
        
        self.stdout.write(self.style.SUCCESS(f'Created/Updated {len(created_users)} test users'))
        return admin_user, created_users
    
    def create_account_structure(self, admin_user):
        self.stdout.write('Creating account types and chart of accounts...')
        
        # Create account types
        account_types = [
            {'name': 'Assets (Current)', 'description': 'Current assets that are expected to be liquidated within one year'},
            {'name': 'Assets (Non-current)', 'description': 'Long-term assets not expected to be converted to cash in the short term'},
            {'name': 'Liabilities (Current)', 'description': 'Short-term liabilities due within one year'},
            {'name': 'Liabilities (Non-current)', 'description': 'Long-term liabilities not due within one year'},
            {'name': 'Equity', 'description': 'Ownership interest in the company'},
            {'name': 'Revenue', 'description': 'Income from business operations'},
            {'name': 'Expenses', 'description': 'Costs incurred during business operations'},
        ]
        
        created_types = {}
        for type_data in account_types:
            acct_type, created = AccountType.objects.get_or_create(
                name=type_data['name'],
                defaults={'description': type_data['description']}
            )
            created_types[type_data['name']] = acct_type
        
        # Create parent accounts
        expense_type = created_types['Expenses']
        asset_current_type = created_types['Assets (Current)']
        asset_noncurrent_type = created_types['Assets (Non-current)']
        liability_current_type = created_types['Liabilities (Current)']
        revenue_type = created_types['Revenue']
        
        parent_accounts = [
            {
                'code': 'EXP-OPER',
                'name': 'Operating Expenses',
                'description': 'Day-to-day expenses for business operations',
                'account_type': expense_type,
            },
            {
                'code': 'EXP-ADMIN',
                'name': 'Administrative Expenses',
                'description': 'Administrative and overhead expenses',
                'account_type': expense_type,
            },
            {
                'code': 'ASSET-CURR',
                'name': 'Current Assets',
                'description': 'Assets expected to be converted to cash within one year',
                'account_type': asset_current_type,
            },
            {
                'code': 'ASSET-FIXED',
                'name': 'Fixed Assets',
                'description': 'Long-term tangible assets',
                'account_type': asset_noncurrent_type,
            },
            {
                'code': 'REV-OPER',
                'name': 'Operating Revenue',
                'description': 'Revenue from primary business activities',
                'account_type': revenue_type,
            },
        ]
        
        created_parent_accounts = {}
        for acct_data in parent_accounts:
            acct, created = Account.objects.get_or_create(
                code=acct_data['code'],
                defaults={
                    'name': acct_data['name'],
                    'description': acct_data['description'],
                    'account_type': acct_data['account_type'],
                    'created_by': admin_user,
                }
            )
            created_parent_accounts[acct_data['code']] = acct
        
        # Create child accounts
        operating_expense = created_parent_accounts['EXP-OPER']
        current_assets = created_parent_accounts['ASSET-CURR']
        
        # Create sub-level accounts
        it_expense, _ = Account.objects.get_or_create(
            code='EXP-IT',
            defaults={
                'name': 'IT Expenses',
                'description': 'Technology related expenses',
                'account_type': expense_type,
                'parent_account': operating_expense,
                'created_by': admin_user,
            }
        )
        
        # Create detailed accounts
        detailed_accounts = [
            {
                'code': 'EXP-IT-HW',
                'name': 'Hardware Expenses',
                'description': 'Computer hardware purchases and maintenance',
                'account_type': expense_type,
                'parent_account': it_expense,
            },
            {
                'code': 'EXP-IT-SW',
                'name': 'Software Expenses',
                'description': 'Software licenses and services',
                'account_type': expense_type,
                'parent_account': it_expense,
            },
            {
                'code': 'EXP-TRV',
                'name': 'Travel Expenses',
                'description': 'Business travel related expenses',
                'account_type': expense_type,
                'parent_account': operating_expense,
            },
            {
                'code': 'EXP-TRAIN',
                'name': 'Training Expenses',
                'description': 'Staff training and development expenses',
                'account_type': expense_type,
                'parent_account': operating_expense,
            },
            {
                'code': 'CASH',
                'name': 'Cash',
                'description': 'Cash on hand and in bank accounts',
                'account_type': asset_current_type,
                'parent_account': current_assets,
            },
            {
                'code': 'AR',
                'name': 'Accounts Receivable',
                'description': 'Amounts owed by customers',
                'account_type': asset_current_type,
                'parent_account': current_assets,
            },
        ]
        
        created_accounts = []
        for acct_data in detailed_accounts:
            acct, created = Account.objects.get_or_create(
                code=acct_data['code'],
                defaults={
                    'name': acct_data['name'],
                    'description': acct_data['description'],
                    'account_type': acct_data['account_type'],
                    'parent_account': acct_data['parent_account'],
                    'created_by': admin_user,
                }
            )
            created_accounts.append(acct)
        
        # Add all parent accounts to the list for return
        all_accounts = list(created_parent_accounts.values()) + [it_expense] + created_accounts
        
        self.stdout.write(self.style.SUCCESS(f'Created account structure with {len(all_accounts)} accounts'))
        return created_types.values(), all_accounts
    
    def create_expense_categories(self, admin_user):
        self.stdout.write('Creating expense categories...')
        
        # Create parent categories
        parent_categories = [
            {
                'code': 'CAT-IT',
                'name': 'IT Expenses',
                'description': 'Information Technology Expenses',
                'level': 1,
            },
            {
                'code': 'CAT-ADM',
                'name': 'Administrative Expenses',
                'description': 'General Administrative Expenses',
                'level': 1,
            },
            {
                'code': 'CAT-MKT',
                'name': 'Marketing Expenses',
                'description': 'Marketing and Advertising Expenses',
                'level': 1,
            },
        ]
        
        created_parents = {}
        for cat_data in parent_categories:
            cat, created = ExpenseCategory.objects.get_or_create(
                code=cat_data['code'],
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data['description'],
                    'level': cat_data['level'],
                }
            )
            created_parents[cat_data['code']] = cat
        
        # Create subcategories
        subcategories = [
            {
                'code': 'CAT-IT-HW',
                'name': 'Hardware',
                'description': 'Computer Hardware Expenses',
                'parent_category': created_parents['CAT-IT'],
                'level': 2,
            },
            {
                'code': 'CAT-IT-SW',
                'name': 'Software',
                'description': 'Software Licenses and Services',
                'parent_category': created_parents['CAT-IT'],
                'level': 2,
            },
            {
                'code': 'CAT-ADM-TRV',
                'name': 'Travel',
                'description': 'Business Travel Expenses',
                'parent_category': created_parents['CAT-ADM'],
                'level': 2,
            },
            {
                'code': 'CAT-ADM-TRN',
                'name': 'Training',
                'description': 'Staff Training Expenses',
                'parent_category': created_parents['CAT-ADM'],
                'level': 2,
            },
            {
                'code': 'CAT-MKT-ADV',
                'name': 'Advertising',
                'description': 'Advertising Expenses',
                'parent_category': created_parents['CAT-MKT'],
                'level': 2,
            },
        ]
        
        created_subcategories = []
        for cat_data in subcategories:
            cat, created = ExpenseCategory.objects.get_or_create(
                code=cat_data['code'],
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data['description'],
                    'parent_category': cat_data['parent_category'],
                    'level': cat_data['level'],
                }
            )
            created_subcategories.append(cat)
        
        all_categories = list(created_parents.values()) + created_subcategories
        self.stdout.write(self.style.SUCCESS(f'Created {len(all_categories)} expense categories'))
        return all_categories
    
    def create_fiscal_years(self):
        self.stdout.write('Creating fiscal years...')
        
        current_year = timezone.now().year
        fiscal_years = [
            {
                'name': f'FY {current_year}',
                'start_date': datetime(current_year, 1, 1).date(),
                'end_date': datetime(current_year, 12, 31).date(),
                'is_active': True,
                'is_locked': False,
            },
            {
                'name': f'FY {current_year + 1}',
                'start_date': datetime(current_year + 1, 1, 1).date(),
                'end_date': datetime(current_year + 1, 12, 31).date(),
                'is_active': False,
                'is_locked': False,
            },
            {
                'name': f'FY {current_year - 1}',
                'start_date': datetime(current_year - 1, 1, 1).date(),
                'end_date': datetime(current_year - 1, 12, 31).date(),
                'is_active': False,
                'is_locked': True,
            },
        ]
        
        created_fiscal_years = []
        for fy_data in fiscal_years:
            fiscal_year, created = FiscalYear.objects.get_or_create(
                name=fy_data['name'],
                defaults={
                    'start_date': fy_data['start_date'],
                    'end_date': fy_data['end_date'],
                    'is_active': fy_data['is_active'],
                    'is_locked': fy_data['is_locked'],
                }
            )
            created_fiscal_years.append(fiscal_year)
        
        self.stdout.write(self.style.SUCCESS(f'Created {len(created_fiscal_years)} fiscal years'))
        return created_fiscal_years
    
    def create_budget_allocations(self, fiscal_year, departments, accounts, admin_user):
        self.stdout.write('Creating budget allocations...')
        
        # Find the accounts we want to allocate budgets to
        account_map = {account.code: account for account in accounts}
        
        # Define allocations for different departments
        allocations_data = []
        
        # For each department, create allocations for different accounts
        for dept in departments:
            # Hardware expenses for IT department are higher
            hw_amount = Decimal('150000') if dept.code == 'IT' else Decimal(f'{random.randint(20000, 50000)}')
            # Software expenses for IT department are higher
            sw_amount = Decimal('200000') if dept.code == 'IT' else Decimal(f'{random.randint(30000, 70000)}')
            # Travel expenses - higher for sales
            travel_amount = Decimal('100000') if dept.code == 'SLS' else Decimal(f'{random.randint(20000, 80000)}')
            # Training - higher for HR
            training_amount = Decimal('120000') if dept.code == 'HR' else Decimal(f'{random.randint(15000, 40000)}')
            
            # Create allocations for each account type
            allocations_data.extend([
                {
                    'dept': dept,
                    'account': account_map.get('EXP-IT-HW'),
                    'amount': hw_amount,
                },
                {
                    'dept': dept,
                    'account': account_map.get('EXP-IT-SW'),
                    'amount': sw_amount,
                },
                {
                    'dept': dept,
                    'account': account_map.get('EXP-TRV'),
                    'amount': travel_amount,
                },
                {
                    'dept': dept,
                    'account': account_map.get('EXP-TRAIN'),
                    'amount': training_amount,
                },
            ])
        
        # Create the allocations
        created_allocations = []
        for alloc_data in allocations_data:
            if not alloc_data['account']:
                continue  # Skip if account doesn't exist
                
            allocation, created = BudgetAllocation.objects.get_or_create(
                fiscal_year=fiscal_year,
                department=alloc_data['dept'],
                account=alloc_data['account'],
                defaults={
                    'created_by': admin_user,
                    'amount': alloc_data['amount'],
                    'is_active': True,
                }
            )
            created_allocations.append(allocation)
        
        self.stdout.write(self.style.SUCCESS(f'Created {len(created_allocations)} budget allocations'))
        return created_allocations
    
    def create_dashboard_metrics(self, fiscal_year, departments, allocations):
        self.stdout.write('Creating dashboard metrics...')
        
        # Calculate total budget from allocations
        total_budget = sum(a.amount for a in allocations)
        
        # For simulation, let's say 75% of the budget is already allocated to specific projects
        allocated_budget = total_budget * Decimal('0.75')
        
        # Remaining budget
        remaining_budget = total_budget - allocated_budget
        
        # Create main metrics
        DashboardMetric.objects.update_or_create(
            metric_type='Total Budget',
            fiscal_year=fiscal_year,
            department=None,
            defaults={
                'value': total_budget,
                'percentage': Decimal('100.00'),
                'status': 'OK',
                'warning_threshold': Decimal('90.00'),
                'critical_threshold': Decimal('95.00'),
            }
        )
        
        DashboardMetric.objects.update_or_create(
            metric_type='Allocated Budget',
            fiscal_year=fiscal_year,
            department=None,
            defaults={
                'value': allocated_budget,
                'percentage': (allocated_budget / total_budget) * Decimal('100.00') if total_budget else Decimal('0.00'),
                'status': 'OK',
                'warning_threshold': Decimal('90.00'),
                'critical_threshold': Decimal('95.00'),
            }
        )
        
        DashboardMetric.objects.update_or_create(
            metric_type='Remaining Budget',
            fiscal_year=fiscal_year,
            department=None,
            defaults={
                'value': remaining_budget,
                'percentage': (remaining_budget / total_budget) * Decimal('100.00') if total_budget else Decimal('0.00'),
                'status': 'OK',
            }
        )
        
        # Create department-specific metrics
        dept_totals = {}
        for allocation in allocations:
            dept = allocation.department
            if dept not in dept_totals:
                dept_totals[dept] = Decimal('0')
            dept_totals[dept] += allocation.amount
        
        # Create a metric for each department
        for dept, dept_total in dept_totals.items():
            pct = (dept_total / total_budget) * Decimal('100.00') if total_budget else Decimal('0.00')
            DashboardMetric.objects.update_or_create(
                metric_type='Budget by Department',
                fiscal_year=fiscal_year,
                department=dept,
                defaults={
                    'value': dept_total,
                    'percentage': pct,
                    'status': 'OK',
                }
            )
        
        self.stdout.write(self.style.SUCCESS('Dashboard metrics created successfully'))
    
    def create_sample_projects(self, fiscal_year, departments, users):
        self.stdout.write('Creating sample projects...')
        
        # Skip if no users
        if not users:
            self.stdout.write(self.style.WARNING('No users found, skipping project creation'))
            return
        
        # For simplicity, let's use the first user as the project creator
        creator = users[0]
        
        # Sample project data
        project_data = [
            {
                'name': 'ERP System Upgrade',
                'description': 'Upgrade the company ERP system to the latest version',
                'department': next((d for d in departments if d.code == 'IT'), departments[0]),
                'start_date': timezone.now().date(),
                'end_date': (timezone.now() + timedelta(days=180)).date(),
                'status': 'IN_PROGRESS',
            },
            {
                'name': 'Annual Financial Audit',
                'description': 'Complete the annual financial audit process',
                'department': next((d for d in departments if d.code == 'FIN'), departments[0]),
                'start_date': timezone.now().date(),
                'end_date': (timezone.now() + timedelta(days=90)).date(),
                'status': 'PLANNING',
            },
            {
                'name': 'Office Renovation',
                'description': 'Office space renovation and modernization',
                'department': next((d for d in departments if d.code == 'OPS'), departments[0]),
                'start_date': (timezone.now() + timedelta(days=30)).date(),
                'end_date': (timezone.now() + timedelta(days=120)).date(),
                'status': 'PLANNING',
            },
        ]
        
        # Projects require budget proposals, so we'll need to create those first
        # This is a simplified version - in a real system, you'd create more detailed proposals
        from core.models import BudgetProposal
        
        for project in project_data:
            # Create a simple budget proposal for the project
            proposal, _ = BudgetProposal.objects.get_or_create(
                title=f"Proposal for {project['name']}",
                defaults={
                    'project_summary': f"Budget proposal for {project['name']}",
                    'project_description': project['description'],
                    'department': project['department'],
                    'fiscal_year': fiscal_year,
                    'submitted_by': creator,
                    'status': 'APPROVED',
                    'performance_start_date': project['start_date'],
                    'performance_end_date': project['end_date'],
                    'submitted_at': timezone.now(),
                    'approved_by': creator,  # Self-approval for demo purposes
                    'approval_date': timezone.now(),
                    'external_system_id': f"PRJ-{random.randint(1000, 9999)}",
                    'sync_status': 'SYNCED',
                }
            )
            
            # Create the project
            Project.objects.get_or_create(
                name=project['name'],
                defaults={
                    'description': project['description'],
                    'start_date': project['start_date'],
                    'end_date': project['end_date'],
                    'department': project['department'],
                    'budget_proposal': proposal,
                    'status': project['status'],
                }
            )
        
        self.stdout.write(self.style.SUCCESS(f'Created {len(project_data)} sample projects'))