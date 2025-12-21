from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum
from datetime import datetime, timedelta
import random
from random import choice
from decimal import Decimal

from django.contrib.auth import get_user_model
from core.models import (
    Department, AccountType, Account, FiscalYear, BudgetProposal, BudgetProposalItem,
    BudgetAllocation, BudgetTransfer, JournalEntry, JournalEntryLine,
    ExpenseCategory, Expense, Document, ProposalHistory, ProposalComment,
    TransactionAudit, Project, RiskMetric, DashboardMetric, UserActivityLog
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with initial data for testing and development'

    def handle(self, *args, **options):
        self.stdout.write('Starting database seeding process...')

        try:
            with transaction.atomic():
                # Create in order of dependencies
                departments = self.create_departments()
                admin_user, users = self.create_users(departments)
                account_types = self.create_account_types()
                accounts = self.create_accounts(account_types, admin_user)
                fiscal_years = self.create_fiscal_years()

                # Budget related objects
                expense_categories = self.create_expense_categories()
                budget_proposals = self.create_budget_proposals(
                    departments, fiscal_years, users)
                self.create_budget_proposal_items(budget_proposals, accounts)
                projects = self.create_projects(departments, budget_proposals)
                budget_allocations = self.create_budget_allocations(
                    projects,
                    accounts,
                    admin_user,
                    expense_categories
                )
                self.create_budget_transfers(
                    fiscal_years, budget_allocations, users)
                # Financial transactions
                journal_entries = self.create_journal_entries(users)
                self.create_journal_entry_lines(journal_entries, accounts)
                expenses = self.create_expenses(
                    departments, accounts, budget_allocations, users, expense_categories)

                # Supporting documents and history
                # self.create_documents(
                #     budget_proposals, expenses, users, departments)
                self.create_proposal_history(budget_proposals, users)
                self.create_proposal_comments(budget_proposals, users)

                # Projects and metrics
                self.create_risk_metrics(projects, users)
                self.create_dashboard_metrics(fiscal_years, departments)

                # Activity logs
                self.create_user_activity_logs(users)

                self.stdout.write(self.style.SUCCESS(
                    'Successfully seeded database!'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'Error seeding database: {str(e)}'))
            raise e

    def create_departments(self):
        self.stdout.write('Creating departments...')
        departments = [
            {
                'name': 'Finance Department',
                'code': 'FIN',
                'description': 'Handles financial operations and budget management'
            },
            {
                'name': 'Human Resources',
                'code': 'HR',
                'description': 'Manages personnel, hiring and organizational development'
            },
            {
                'name': 'Information Technology',
                'code': 'IT',
                'description': 'Maintains IT infrastructure and develops software solutions'
            },
            {
                'name': 'Operations',
                'code': 'OPS',
                'description': 'Handles day-to-day operational activities'
            },
            {
                'name': 'Marketing',
                'code': 'MKT',
                'description': 'Manages promotional activities and brand development'
            }
        ]

        created_departments = []
        for dept_data in departments:
            dept, created = Department.objects.update_or_create(
                code=dept_data['code'],
                defaults={
                    'name': dept_data['name'],
                    'description': dept_data['description'],
                    'is_active': True
                }
            )
            created_departments.append(dept)
            action = 'Created' if created else 'Updated'
            self.stdout.write(f"{action} department: {dept.name}")

        self.stdout.write(self.style.SUCCESS(
            f'Created/Updated {len(created_departments)} departments'))
        return created_departments

    def create_users(self, departments):
        self.stdout.write('Creating/verifying users...')

        # Find departments by code
        dept_dict = {dept.code: dept for dept in departments}
        finance_dept = dept_dict.get('FIN')
        it_dept = dept_dict.get('IT')
        hr_dept = dept_dict.get('HR')
        ops_dept = dept_dict.get('OPS')
        mkt_dept = dept_dict.get('MKT')

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
            # Update existing admin user
            admin_user.role = 'FINANCE_HEAD'  # Ensure role is valid
            admin_user.save()
            self.stdout.write('Updated admin user')

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
                'role': 'FINANCE_HEAD',  # Changed role
                'department': finance_dept,
                'phone_number': '09179876543',
            },
            {
                'email': 'adibentulan@gmail.com',
                'username': 'adi123',
                'password': 'password123',
                'first_name': 'Finance',
                'last_name': 'Operator',
                'role': 'FINANCE_HEAD',
                'department': finance_dept,
                'phone_number': '09179876542',
            },
            {
                'email': 'it_operator@example.com',
                'username': 'it_operator',
                'password': 'password123',
                'first_name': 'IT',
                'last_name': 'Operator',
                'role': 'ADMIN',
                'department': it_dept,
            },
            # Additional users for other departments
            {
                'email': 'ops_head@example.com',
                'username': 'ops_head',
                'password': 'password123',
                'first_name': 'Operations',
                'last_name': 'Head',
                'role': 'FINANCE_HEAD',
                'department': ops_dept,
                'phone_number': '09171111111',
            },
            {
                'email': 'mkt_operator@example.com',
                'username': 'mkt_operator',
                'password': 'password123',
                'first_name': 'Marketing',
                'last_name': 'Operator',
                'role': 'FINANCE_HEAD',
                'department': mkt_dept,
                'phone_number': '09172222222',
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

        self.stdout.write(self.style.SUCCESS(
            f'Created/Updated {len(created_users)} test users'))
        return admin_user, created_users

    def create_account_types(self):
        self.stdout.write('Creating account types...')
        account_types = [
            {'name': 'Asset', 'description': 'Resources owned by the company'},
            {'name': 'Liability', 'description': 'Obligations owed by the company'},
            {'name': 'Equity', 'description': 'Ownership interest in the company'},
            {'name': 'Revenue', 'description': 'Income earned from operations'},
            {'name': 'Expense', 'description': 'Costs incurred in operations'}
        ]

        created_types = []
        for type_data in account_types:
            acct_type, created = AccountType.objects.update_or_create(
                name=type_data['name'],
                defaults={
                    'description': type_data['description'],
                    'is_active': True
                }
            )
            created_types.append(acct_type)

        self.stdout.write(self.style.SUCCESS(
            f'Created/Updated {len(created_types)} account types'))
        return created_types

    def create_accounts(self, account_types, created_by):
        self.stdout.write('Creating accounts...')

        # Get account types by name for easier reference
        acct_type_dict = {acct.name: acct for acct in account_types}

        # Create parent accounts first
        parent_accounts = [
            {
                'code': '1000',
                'name': 'Assets',
                'description': 'All company assets',
                'account_type': acct_type_dict['Asset'],
                'parent_account': None,
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '2000',
                'name': 'Liabilities',
                'description': 'All company liabilities',
                'account_type': acct_type_dict['Liability'],
                'parent_account': None,
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '3000',
                'name': 'Equity',
                'description': 'All company equity',
                'account_type': acct_type_dict['Equity'],
                'parent_account': None,
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '4000',
                'name': 'Revenue',
                'description': 'All company revenue',
                'account_type': acct_type_dict['Revenue'],
                'parent_account': None,
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '5000',
                'name': 'Expenses',
                'description': 'All company expenses',
                'account_type': acct_type_dict['Expense'],
                'parent_account': None,
                'accomplished': False,
                'accomplishment_date': None
            }
        ]

        created_parents = []
        for acct_data in parent_accounts:
            account, created = Account.objects.update_or_create(
                code=acct_data['code'],
                defaults={
                    'name': acct_data['name'],
                    'description': acct_data['description'],
                    'account_type': acct_data['account_type'],
                    'parent_account': None,
                    'created_by': created_by,
                    'is_active': True,
                    'accomplished': acct_data['accomplished'],
                    'accomplishment_date': acct_data['accomplishment_date']
                }
            )
            created_parents.append(account)

        # Create parent account dictionary for easier reference
        parent_dict = {acct.code: acct for acct in created_parents}

        # Create child accounts
        child_accounts = [
            # Asset child accounts
            {
                'code': '1100',
                'name': 'Cash and Cash Equivalents',
                'description': 'Cash on hand and in bank',
                'account_type': acct_type_dict['Asset'],
                'parent_account': parent_dict['1000'],
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '1200',
                'name': 'Accounts Receivable',
                'description': 'Amounts owed to the company',
                'account_type': acct_type_dict['Asset'],
                'parent_account': parent_dict['1000'],
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '1300',
                'name': 'Inventory',
                'description': 'Items held for sale',
                'account_type': acct_type_dict['Asset'],
                'parent_account': parent_dict['1000'],
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '1400',
                'name': 'Fixed Assets',
                'description': 'Long-term tangible assets',
                'account_type': acct_type_dict['Asset'],
                'parent_account': parent_dict['1000'],
                'accomplished': False,
                'accomplishment_date': None
            },

            # Liability child accounts
            {
                'code': '2100',
                'name': 'Accounts Payable',
                'description': 'Amounts owed by the company',
                'account_type': acct_type_dict['Liability'],
                'parent_account': parent_dict['2000'],
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '2200',
                'name': 'Accrued Expenses',
                'description': 'Expenses incurred but not yet paid',
                'account_type': acct_type_dict['Liability'],
                'parent_account': parent_dict['2000'],
                'accomplished': False,
                'accomplishment_date': None
            },

            # Expense child accounts
            {
                'code': '5100',
                'name': 'Salaries and Wages',
                'description': 'Employee compensation',
                'account_type': acct_type_dict['Expense'],
                'parent_account': parent_dict['5000'],
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '5200',
                'name': 'Office Supplies',
                'description': 'Office consumables',
                'account_type': acct_type_dict['Expense'],
                'parent_account': parent_dict['5000'],
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '5300',
                'name': 'Travel and Entertainment',
                'description': 'Business travel expenses',
                'account_type': acct_type_dict['Expense'],
                'parent_account': parent_dict['5000'],
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '5400',
                'name': 'IT Equipment',
                'description': 'Technology purchases',
                'account_type': acct_type_dict['Expense'],
                'parent_account': parent_dict['5000'],
                'accomplished': False,
                'accomplishment_date': None
            },
            {
                'code': '5500',
                'name': 'Professional Development',
                'description': 'Training and education expenses',
                'account_type': acct_type_dict['Expense'],
                'parent_account': parent_dict['5000'],
                'accomplished': False,
                'accomplishment_date': None
            }
        ]

        created_children = []
        for acct_data in child_accounts:
            account, created = Account.objects.update_or_create(
                code=acct_data['code'],
                defaults={
                    'name': acct_data['name'],
                    'description': acct_data['description'],
                    'account_type': acct_data['account_type'],
                    'parent_account': acct_data['parent_account'],
                    'created_by': created_by,
                    'is_active': True,
                    'accomplished': acct_data['accomplished'],
                    'accomplishment_date': acct_data['accomplishment_date']
                }
            )
            created_children.append(account)

        all_accounts = created_parents + created_children
        self.stdout.write(self.style.SUCCESS(
            f'Created/Updated {len(all_accounts)} accounts'))
        return all_accounts

    def create_fiscal_years(self):
        self.stdout.write('Creating fiscal years...')

        # Current year and surrounding years
        current_year = datetime.now().year
        fiscal_years = [
            {
                'name': f'FY {current_year-1}',
                'start_date': datetime(current_year-1, 1, 1).date(),
                'end_date': datetime(current_year-1, 12, 31).date(),
                'is_active': False,
                'is_locked': True
            },
            {
                'name': f'FY {current_year}',
                'start_date': datetime(current_year, 1, 1).date(),
                'end_date': datetime(current_year, 12, 31).date(),
                'is_active': True,
                'is_locked': False
            },
            {
                'name': f'FY {current_year+1}',
                'start_date': datetime(current_year+1, 1, 1).date(),
                'end_date': datetime(current_year+1, 12, 31).date(),
                'is_active': False,
                'is_locked': False
            },
            {
                'name': f'FY {current_year+2}',
                'start_date': datetime(current_year+2, 1, 1).date(),
                'end_date': datetime(current_year+2, 12, 31).date(),
                'is_active': True,
                'is_locked': False
            },
        ]

        created_years = []
        for year_data in fiscal_years:
            fiscal_year, created = FiscalYear.objects.update_or_create(
                name=year_data['name'],
                defaults={
                    'start_date': year_data['start_date'],
                    'end_date': year_data['end_date'],
                    'is_active': year_data['is_active'],
                    'is_locked': year_data['is_locked']
                }
            )
            created_years.append(fiscal_year)

        self.stdout.write(self.style.SUCCESS(
            f'Created/Updated {len(created_years)} fiscal years'))
        return created_years

    def create_expense_categories(self):
        self.stdout.write('Creating hierarchical expense categories...')
        
        # Categories as nested dictionaries
        categories_hierarchy = [
            {
                'code': 'INCOME',
                'name': 'Income',
                'description': 'Incoming funds',
                'level': 1,
                'children': [
                    {
                        'code': 'PRIMARY_INCOME',
                        'name': 'Primary Income',
                        'description': 'Main revenue sources',
                        'level': 2,
                        'children': [
                            {
                                'code': 'INCOME-UTIL',
                                'name': 'Utilities',
                                'description': 'Utility payments collected',
                                'level': 3
                            }
                        ]
                    }
                ]
            },
            {
                'code': 'EXPENSE',
                'name': 'Expense',
                'description': 'Outflows for operations',
                'level': 1,
                'children': [
                    {
                        'code': 'BILLS',
                        'name': 'Bills',
                        'description': 'Monthly recurring bills',
                        'level': 2,
                        'children': [
                            {
                                'code': 'BILLS-UTIL',
                                'name': 'Utilities',
                                'description': 'Electricity, water, internet',
                                'level': 3
                            }
                        ]
                    },
                    {
                        'code': 'DISCRETIONARY',
                        'name': 'Discretionary',
                        'description': 'Flexible or optional spending',
                        'level': 2,
                        'children': [
                            {
                                'code': 'DISC-CLOUD',
                                'name': 'Cloud Hosting',
                                'description': 'AWS, Azure, etc.',
                                'level': 3
                            },
                            {
                                'code': 'DISC-SUBS',
                                'name': 'Software Subscription',
                                'description': 'SaaS apps like Figma, Slack',
                                'level': 3
                            }
                        ]
                    },
                    {
                        'code': 'OPERATIONS',
                        'name': 'Operations',
                        'description': 'Operational expenses',
                        'level': 2,
                        'children': [
                            {
                                'code': 'OPS-SUP',
                                'name': 'Office Supplies',
                                'description': 'Consumable office goods',
                                'level': 3
                            },
                            {
                                'code': 'OPS-EQM',
                                'name': 'Equipment',
                                'description': 'Equipment purchases',
                                'level': 3
                            },
                            {
                                'code': 'OPS-MAINT',
                                'name': 'Maintenance',
                                'description': 'Repairs and upkeep',
                                'level': 3
                            },
                            {
                                'code': 'OPS-TRANS',
                                'name': 'Transportation',
                                'description': 'Vehicle fuel, travel costs',
                                'level': 3
                            }
                        ]
                    }
                ]
            }
        ]
        created_categories = {}

        def create_category(code, name, description, level, parent=None):
            category, _ = ExpenseCategory.objects.update_or_create(
                code=code,
                defaults={
                    'name': name,
                    'description': description,
                    'level': level,
                    'parent_category': parent,
                    'is_active': True
                }
            )
            created_categories[code] = category
            return category

        # Define the hierarchy
        for top_level in categories_hierarchy:
            top_cat = create_category(
                code=top_level['code'],
                name=top_level['name'],
                description=top_level['description'],
                level=top_level['level'],
            )

            for mid in top_level.get('children', []):
                mid_cat = create_category(
                    code=mid['code'],
                    name=mid['name'],
                    description=mid['description'],
                    level=mid['level'],
                    parent=top_cat
                )

                for low in mid.get('children', []):
                    create_category(
                        code=low['code'],
                        name=low['name'],
                        description=low['description'],
                        level=low['level'],
                        parent=mid_cat
                    )

        self.stdout.write(self.style.SUCCESS(
            f"Created/Updated {len(created_categories)} expense categories"))
        return list(created_categories.values())

    def create_budget_proposals(self, departments, fiscal_years, users):
        self.stdout.write('Creating budget proposals...')
        STATUSES = ['SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED']
        # Get the current fiscal year
        current_year = datetime.now().year
        current_fy = next((fy for fy in fiscal_years if fy.name ==
                           f'FY {current_year}'), fiscal_years[0])

        # Get a finance user to be the submitter
        finance_user = next(
            (user for user in users if user.department and user.department.code == 'FIN'), users[0])

        # Create proposals for each department
        proposals = []

        status = choice(STATUSES)

        for i, department in enumerate(departments):
            for j in range(4):  # Create 4 quarterly proposals for each department
                start_date = current_fy.start_date + timedelta(days=90*j)
                end_date = start_date + timedelta(days=90)
                status = choice(STATUSES)
                random_user = random.choice(users)
                external_id = f"EXT-{department.code}-{current_year}-{i+1}{j+1}"

                proposal_data = {
                    'title': f"{department.name} {['Q1', 'Q2', 'Q3', 'Q4'][j]} Budget {random.choice(['Initiative', 'Plan', 'Project'])}",
                    'project_summary': f"Budget proposal for {department.name} {['Q1', 'Q2', 'Q3', 'Q4'][j]} operations",
                    'project_description': f"This budget covers all planned activities for {department.name} during {['Q1', 'Q2', 'Q3', 'Q4'][j]} including staffing, equipment, and operational expenses.",
                    'department': department,
                    'fiscal_year': current_fy,
                    'submitted_by_name': random_user.get_full_name(),
                    'performance_start_date': start_date,
                    'performance_end_date': end_date,
                    'external_system_id': external_id,
                    'status': status,
                    'performance_notes': f"Notes for {department.name} {['Q1', 'Q2', 'Q3', 'Q4'][j]}",
                    'submitted_at': timezone.now() if status in ['SUBMITTED', 'PENDING', 'APPROVED'] else None,
                    'approval_date': timezone.now() if status == 'APPROVED' else None,
                    'approved_by_name': random_user.get_full_name() if status == 'APPROVED' else None,
                    'rejected_by_name': random_user.get_full_name() if status == 'REJECTED' else None,
                    'rejection_date': timezone.now() if status == 'REJECTED' else None,
                    'sync_status': random.choice(['SYNCED', 'PENDING', 'FAILED']),
                }

                proposal, created = BudgetProposal.objects.update_or_create(
                    title=proposal_data['title'],
                    department=proposal_data['department'],
                    fiscal_year=proposal_data['fiscal_year'],
                    defaults=proposal_data
                )
                proposals.append(proposal)

        self.stdout.write(self.style.SUCCESS(
            f'Created/Updated {len(proposals)} budget proposals'))
        return proposals

    def create_budget_proposal_items(self, proposals, accounts):
        self.stdout.write('Creating budget proposal items...')

        # Get expense accounts
        expense_accounts = [
            acc for acc in accounts if acc.account_type.name == 'Expense']
        if not expense_accounts:
            expense_accounts = accounts  # Fallback

        items_created = 0

        # Since all proposals are now APPROVED, we'll create items for all of them
        for proposal in proposals:
            # Number of items for this proposal (3-7)
            num_items = random.randint(3, 7)

            for i in range(num_items):
                account = random.choice(expense_accounts)
                cost_element = f"CE-{random.randint(1000, 9999)}"

                # Generate cost that makes sense for the account
                if 'Salaries' in account.name:
                    cost = Decimal(random.randint(500000, 2000000))
                elif 'Equipment' in account.name:
                    cost = Decimal(random.randint(50000, 500000))
                else:
                    cost = Decimal(random.randint(10000, 100000))

                item, created = BudgetProposalItem.objects.update_or_create(
                    proposal=proposal,
                    cost_element=cost_element,
                    defaults={
                        'description': f"{account.name} expenses for {proposal.department.name}",
                        'estimated_cost': cost,
                        'account': account,
                        'notes': f"Based on {proposal.fiscal_year.name} projections"
                    }
                )

                items_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Created/Updated {items_created} budget proposal items'))

    def create_budget_allocations(self, projects, accounts, created_by, categories):
        """
        Creates BudgetAllocations for Projects, ensuring uniqueness constraints are respected.
        """
        self.stdout.write('Creating budget allocations...')

        # Filter to active Expense-type accounts
        expense_accounts = [
            acc for acc in accounts if acc.account_type.name == 'Expense'
        ]

        if not expense_accounts:
            self.stdout.write(self.style.WARNING(
                'No expense accounts found, using all accounts'))
            expense_accounts = accounts

        allocations = []
        allocation_keys = set()  # Track unique (fiscal_year, department, account) combinations

        for project in projects:
            # Calculate total from proposal items
            if project.budget_proposal.status != 'APPROVED':
                continue
            total_estimated_cost = BudgetProposalItem.objects.filter(
                proposal=project.budget_proposal
            ).aggregate(total=Sum('estimated_cost'))['total'] or 0

            # Get fiscal_year and department from the linked BudgetProposal
            fy = project.budget_proposal.fiscal_year
            department = project.budget_proposal.department

            # Find an account that doesn't cause a unique constraint violation
            # Make copy that can be modified
            available_accounts = list(expense_accounts)
            random.shuffle(available_accounts)  # Randomize order

            selected_account = None
            for account in available_accounts:
                key = (fy.id, department.id, account.id)
                if key not in allocation_keys:
                    selected_account = account
                    allocation_keys.add(key)
                    break

            if not selected_account:
                self.stdout.write(self.style.WARNING(
                    f"Couldn't find unique account for project {project.id}. Skipping."
                ))
                continue

            # Pick a random category from the provided list
            selected_category = random.choice(
                categories) if categories else None

            try:
                alloc = BudgetAllocation.objects.create(
                    project=project,
                    proposal=project.budget_proposal,
                    fiscal_year=fy,
                    department=department,
                    account=selected_account,
                    amount=total_estimated_cost,
                    created_by_name=created_by.get_full_name(),
                    category=selected_category,
                    is_active=True
                )
                allocations.append(alloc)
                self.stdout.write(
                    f"Created allocation for project {project.id} in category {selected_category.name if selected_category else 'N/A'}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f"Error creating allocation for project {project.id}: {str(e)}"
                ))

        self.stdout.write(self.style.SUCCESS(
            f'Created {len(allocations)} budget allocations'
        ))
        return allocations

    def create_budget_transfers(self, fiscal_years, allocations, users):
        """
        Creates sample BudgetTransfers between allocations in the same fiscal year.
        """
        self.stdout.write('Creating budget transfers...')

        transfers = []
        # Group allocations by fiscal year
        fy_groups = {}
        for alloc in allocations:
            fy_id = alloc.fiscal_year.id
            if fy_id not in fy_groups:
                fy_groups[fy_id] = []
            fy_groups[fy_id].append(alloc)

        # For each year with at least 2 allocations, generate transfers
        for fy_id, allocs in fy_groups.items():
            if len(allocs) < 2:
                continue  # Skip years with insufficient allocations

            # Get the actual fiscal year object
            fy = allocs[0].fiscal_year

            for _ in range(min(3, len(allocs))):  # Create up to 3 transfers per fiscal year
                source = random.choice(allocs)
                dest = random.choice([a for a in allocs if a != source])

                transfer = BudgetTransfer.objects.create(
                    fiscal_year=fy,
                    source_allocation=source,
                    destination_allocation=dest,
                    transferred_by=random.choice(users),
                    amount=Decimal(random.randint(10_000, 100_000)),
                    reason=(
                        f"Reallocating from {source.project.name} "
                        f"to {dest.project.name}"
                    ),
                    status=random.choice(['PENDING', 'APPROVED', 'REJECTED'])
                )
                transfers.append(transfer)

        self.stdout.write(self.style.SUCCESS(
            f'Created {len(transfers)} budget transfers'
        ))
        return transfers

    def create_journal_entries(self, users):
        """
        Unchanged: creates JournalEntry records and populates total_amount via lines.
        """
        self.stdout.write('Creating journal entries...')
        entries = []
        for _ in range(20):
            entry = JournalEntry.objects.create(
                category=random.choice(['EXPENSES', 'ASSETS', 'PROJECTS']),
                description=f"JE – {random.choice(['month-end', 'adjustment', 'reconciliation'])}",
                date=timezone.now() - timedelta(days=random.randint(1, 365)),
                total_amount=Decimal(0),  # adjusted after lines
                status='POSTED',
                created_by=random.choice(users)
            )
            entries.append(entry)
        self.stdout.write(self.style.SUCCESS(
            f'Created {len(entries)} journal entries'))
        return entries

    def create_journal_entry_lines(self, journal_entries, accounts):
        self.stdout.write('Creating journal entry lines...')
        for entry in journal_entries:
            total = Decimal(0)
            for _ in range(random.randint(2, 4)):
                amount = Decimal(random.randint(1_000, 100_000))
                tran_type = random.choice(['DEBIT', 'CREDIT'])
                line = JournalEntryLine.objects.create(
                    journal_entry=entry,
                    account=random.choice(accounts),
                    transaction_type=tran_type,
                    journal_transaction_type=random.choice(
                        ['OPERATIONAL_EXPENDITURE', 'CAPITAL_EXPENDITURE']
                    ),
                    amount=amount
                )
                total += amount if tran_type == 'DEBIT' else -amount

            entry.total_amount = abs(total)
            entry.save()
        self.stdout.write(self.style.SUCCESS(
            f'Added lines to {len(journal_entries)} journal entries'
        ))

    def create_expenses(self, departments, accounts, budget_allocations, users, expense_categories):
        """
        Creates Expense records against budget allocations.

        Since we're working with a system that only receives APPROVED budget proposals,
        our expenses should reflect appropriate workflow states that happen AFTER
        the proposals are approved.
        """
        self.stdout.write('Creating expenses...')
        expenses = []

        # We should still have a variety of expense statuses as these represent
        # the expense approval workflow, not the proposal workflow
        # In a real system, expenses would start as DRAFT and move through a workflow
        STATUS_CHOICES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']
        # Weight more toward APPROVED for realism
        STATUS_WEIGHTS = [3, 4, 8, 1]

        # Skip if there are no allocations
        if not budget_allocations:
            self.stdout.write(self.style.WARNING(
                "No budget allocations to create expenses for"))
            return []

        for i in range(100):  # Create 100 expenses across all allocations
            alloc = random.choice(budget_allocations)
            txn_id = f"TXN-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}"

            # Use weighted choice for more realistic status distribution
            status = random.choices(
                STATUS_CHOICES, weights=STATUS_WEIGHTS, k=1)[0]

            # Select an appropriate expense category
            category = random.choice(expense_categories)

            expense = Expense.objects.create(
                transaction_id=txn_id,
                project=alloc.project,
                budget_allocation=alloc,
                account=alloc.account,
                department=alloc.department,
                date=timezone.now() - timedelta(days=random.randint(1, 90)),
                amount=Decimal(random.randint(1_000, 50_000)),
                description=f"{alloc.project.name} – {random.choice(['supplies', 'services', 'equipment'])}",
                vendor=random.choice(['Vendor A', 'Vendor B', 'Vendor C']),
                submitted_by=random.choice(users),
                status=status,
                category=category
            )

            if status == 'APPROVED':
                approvers = [u for u in users if u.role in (
                    'ADMIN', 'FINANCE_HEAD')]
                if approvers:
                    expense.approved_by = random.choice(approvers)
                    expense.approved_at = timezone.now()
                    expense.save()

            expenses.append(expense)

        self.stdout.write(self.style.SUCCESS(
            f'Created {len(expenses)} expenses'))
        return expenses

    # def create_documents(self, proposals, expenses, users, departments):
    #     self.stdout.write('Creating documents...')

    #     documents = []
    #     for proposal in proposals:
    #         if random.random() < 0.7:  # 70% chance to add doc to proposal
    #             doc = Document.objects.create(
    #                 name=f"Proposal Document - {proposal.title}",
    #                 document_type='PROPOSAL',
    #                 uploaded_by=proposal.submitted_by,
    #                 department=proposal.department,
    #                 proposal=proposal,
    #                 file=f"documents/proposal_{proposal.id}.pdf"
    #             )
    #             documents.append(doc)

    #     for expense in expenses:
    #         if random.random() < 0.5:  # 50% chance to add receipt
    #             doc = Document.objects.create(
    #                 name=f"Receipt for {expense.description}",
    #                 document_type='RECEIPT',
    #                 uploaded_by=expense.submitted_by,
    #                 department=expense.department,
    #                 expense=expense,
    #                 file=f"receipts/expense_{expense.id}.pdf"
    #             )
    #             documents.append(doc)

    #     self.stdout.write(self.style.SUCCESS(
    #         f'Created {len(documents)} documents'))
    #     return documents

    def create_proposal_history(self, proposals, users):
        self.stdout.write('Creating proposal history...')

        actions = []
        for proposal in proposals:
            submitter = next((u for u in users if u.department ==
                             proposal.department), random.choice(users))
            admin_user = next((u for u in users if u.is_staff),
                              random.choice(users))

            # Simulate approval
            actions.append(ProposalHistory(
                proposal=proposal,
                action='APPROVED',
                action_by_name=admin_user.get_full_name(),
                previous_status='SUBMITTED',
                new_status='APPROVED'
            ))

            # Simulate submission
            if proposal.status != 'DRAFT':
                actions.append(ProposalHistory(
                    proposal=proposal,
                    action='SUBMITTED',
                    action_by_name=submitter.get_full_name(),
                    previous_status='DRAFT',
                    new_status='SUBMITTED'
                ))

            if proposal.status in ['APPROVED', 'REJECTED']:
                actions.append(ProposalHistory(
                    proposal=proposal,
                    action=proposal.status,
                    action_by_name=admin_user.get_full_name(),
                    previous_status='UNDER_REVIEW',
                    new_status=proposal.status
                ))

        ProposalHistory.objects.bulk_create(actions)
        self.stdout.write(self.style.SUCCESS(
            f'Created {len(actions)} proposal history entries'))

    def create_proposal_comments(self, proposals, users):
        self.stdout.write('Creating proposal comments...')

        comments = []
        for proposal in proposals:
            for _ in range(random.randint(0, 3)):  # 0-3 comments per proposal
                comments.append(ProposalComment(
                    proposal=proposal,
                    user=random.choice(users),
                    comment=random.choice([
                        "Need more details in section 3",
                        "Budget numbers look reasonable",
                        "Please clarify the timeline",
                        "Approved pending final review"
                    ])
                ))

        ProposalComment.objects.bulk_create(comments)
        self.stdout.write(self.style.SUCCESS(
            f'Created {len(comments)} proposal comments'))

    def create_projects(self, departments, proposals):
        self.stdout.write('Creating projects...')

        used_proposals = set()
        projects = []
        status_weights = [('PLANNING', 2), ('IN_PROGRESS', 5),
                          ('COMPLETED', 2), ('ON_HOLD', 1)]
        statuses = [s for s, w in status_weights for _ in range(w)]

        for dept in departments:
            available_proposals = [
                p for p in proposals if p.department == dept and p.id not in used_proposals
            ]

            selected = random.sample(available_proposals,
                                     min(3, len(available_proposals))) if available_proposals else []

            for proposal in selected:
                used_proposals.add(proposal.id)

                project, _ = Project.objects.get_or_create(
                    budget_proposal=proposal,
                    defaults={
                        'name': f"{dept.code} {random.choice(['Automation', 'Optimization', 'Renewal'])} Project",
                        'description': f"{dept.name} strategic initiative",
                        'start_date': (datetime.now() - timedelta(days=random.randint(30, 180))).date(),
                        'end_date':   (datetime.now() + timedelta(days=random.randint(90, 365))).date(),
                        'department': dept,
                        'status': random.choice(statuses),
                    }
                )
                projects.append(project)

        self.stdout.write(self.style.SUCCESS(
            f'Created {len(projects)} projects'))
        return projects

    def create_risk_metrics(self, projects, users):
        self.stdout.write('Creating risk metrics...')

        metrics = []
        for project in projects:
            for risk_type in ['BUDGET', 'TIMELINE', 'RESOURCES']:
                metrics.append(RiskMetric(
                    project=project,
                    risk_type=risk_type,
                    risk_level=random.randint(0, 100),
                    description=f"{risk_type} risk assessment",
                    updated_by=random.choice(users)
                ))

        RiskMetric.objects.bulk_create(metrics)
        self.stdout.write(self.style.SUCCESS(
            f'Created {len(metrics)} risk metrics'))

    def create_dashboard_metrics(self, fiscal_years, departments):
        self.stdout.write('Creating dashboard metrics...')

        metrics = []
        current_fy = next(fy for fy in fiscal_years if fy.is_active)

        for dept in departments:
            # Budget utilization metric
            metrics.append(DashboardMetric(
                metric_type='BUDGET_UTILIZATION',
                value=random.uniform(60, 95),
                percentage=random.uniform(60, 95),
                status='WARNING' if random.random() < 0.3 else 'NORMAL',
                fiscal_year=current_fy,
                department=dept
            ))

            # Project completion metric
            metrics.append(DashboardMetric(
                metric_type='PROJECT_COMPLETION',
                value=random.uniform(30, 100),
                percentage=random.uniform(30, 100),
                status='ON_TRACK' if random.random() < 0.7 else 'DELAYED',
                fiscal_year=current_fy,
                department=dept
            ))

        DashboardMetric.objects.bulk_create(metrics)
        self.stdout.write(self.style.SUCCESS(
            f'Created {len(metrics)} dashboard metrics'))

    def create_user_activity_logs(self, users):
        self.stdout.write('Creating user activity logs...')

        logs = []
        actions = [
            ('LOGIN', 'SUCCESS', 20),
            ('EXPORT', 'SUCCESS', 5),
            ('CREATE', 'SUCCESS', 15),
            ('UPDATE', 'SUCCESS', 25),
            ('ERROR', 'FAILED', 3)
        ]

        for _ in range(100):  # Create 100 log entries
            user = random.choice(users)
            log_type, status = random.choices(
                [a[:2] for a in actions],
                weights=[a[2] for a in actions]
            )[0]

            logs.append(UserActivityLog(
                user=user,
                log_type=log_type,
                action=f"{log_type} action performed",
                status=status,
                details={
                    'ip': f"192.168.1.{random.randint(1, 255)}"} if log_type == 'LOGIN' else None
            ))

        UserActivityLog.objects.bulk_create(logs)
        self.stdout.write(self.style.SUCCESS(
            f'Created {len(logs)} user activity logs'))
