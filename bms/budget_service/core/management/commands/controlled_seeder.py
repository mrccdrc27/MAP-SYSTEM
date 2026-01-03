from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import datetime
import random
import calendar
from decimal import Decimal
from django.contrib.auth import get_user_model # Standard Django way

# Import models
from core.models import (
    Department, AccountType, Account, FiscalYear, BudgetProposal, BudgetProposalItem,
    BudgetAllocation, ExpenseCategory, Expense, Project, ProjectFiscalYear, ProposalHistory
)

# Get the active User model (whether it's custom or default)
User = get_user_model()

# ... (SIMULATED_USERS, DEPARTMENTS_CONFIG, CATEGORY_TREE - KEEP SAME) ...
SIMULATED_USERS = [
    {'id': 1, 'username': 'admin_auth', 'full_name': 'AuthAdmin User',
        'dept': 'FIN', 'role': 'ADMIN'},
    {'id': 2, 'username': 'finance_head_auth', 'full_name': 'Finance Head',
        'dept': 'FIN', 'role': 'FINANCE_HEAD'},
    {'id': 3, 'username': 'it_user_auth',
        'full_name': 'IT Support', 'dept': 'IT', 'role': 'ADMIN'},
    {'id': 4, 'username': 'ops_user_auth', 'full_name': 'Operations Staff',
        'dept': 'OPS', 'role': 'GENERAL_USER'},
    {'id': 5, 'username': 'adi123', 'full_name': 'Eldrin Adi',
        'dept': 'IT', 'role': 'ADMIN'},
    {'id': 6, 'username': 'mkt_user_auth', 'full_name': 'Marketing Specialist',
        'dept': 'MKT', 'role': 'GENERAL_USER'},
    {'id': 7, 'username': 'hr_user_auth', 'full_name': 'HR Manager',
        'dept': 'HR', 'role': 'GENERAL_USER'},
    {'id': 8, 'username': 'sales_user', 'full_name': 'Sales Manager',
        'dept': 'SALES', 'role': 'GENERAL_USER'},
    {'id': 9, 'username': 'logistics_user', 'full_name': 'Logistics Manager',
        'dept': 'LOG', 'role': 'GENERAL_USER'},
    {'id': 10, 'username': 'merch_user', 'full_name': 'Merch Planner',
        'dept': 'MERCH', 'role': 'GENERAL_USER'},
]

DEPARTMENTS_CONFIG = [
    {'code': 'MERCH', 'name': 'Merchandising / Merchandise Planning'},
    {'code': 'SALES', 'name': 'Sales / Store Operations'},
    {'code': 'MKT', 'name': 'Marketing / Marketing Communications'},
    {'code': 'OPS', 'name': 'Operations Department'},
    {'code': 'IT', 'name': 'IT Application & Data'},
    {'code': 'LOG', 'name': 'Logistics Management'},
    {'code': 'HR', 'name': 'Human Resources'},
    {'code': 'FIN', 'name': 'Finance Department'},
]

CATEGORY_TREE = {
    'MERCH': [
        ('Product Range Planning', 'OPEX'),
        ('Buying Costs', 'MIXED'),
        ('Market Research', 'OPEX'),
        ('Inventory Handling Fees', 'OPEX'),
        ('Supplier Coordination', 'OPEX'),
        ('Seasonal Planning Tools', 'CAPEX'),
        ('Training', 'OPEX'),
        ('Travel', 'OPEX'),
        ('Software Subscription', 'OPEX'),
    ],
    'SALES': [
        ('Store Consumables', 'OPEX'),
        ('POS Maintenance', 'OPEX'),
        ('Store Repairs', 'MIXED'),
        ('Sales Incentives', 'OPEX'),
        ('Uniforms', 'MIXED'),
        ('Store Opening Expenses', 'CAPEX'),
        ('Store Supplies', 'OPEX'),
        ('Utilities', 'OPEX'),
    ],
    'MKT': [
        ('Campaign Budget', 'OPEX'),
        ('Branding Materials', 'MIXED'),
        ('Digital Ads', 'OPEX'),
        ('Social Media Management', 'OPEX'),
        ('Events Budget', 'OPEX'),
        ('Influencer Fees', 'OPEX'),
        ('Photography/Videography', 'MIXED'),
    ],
    'OPS': [
        ('Equipment Maintenance', 'OPEX'),
        ('Fleet/Vehicle Expenses', 'MIXED'),
        ('Operational Supplies', 'OPEX'),
        ('Business Permits', 'OPEX'),
        ('Facility Utilities', 'OPEX'),
        ('Compliance Costs', 'OPEX'),
    ],
    'IT': [
        ('Server Hosting', 'OPEX'),
        ('Software Licenses', 'MIXED'),
        ('Cloud Subscriptions', 'OPEX'),
        ('Hardware Purchases', 'CAPEX'),
        ('Data Tools', 'MIXED'),
        ('Cybersecurity Costs', 'OPEX'),
        ('API Subscription Fees', 'OPEX'),
        ('Domain Renewals', 'OPEX'),
    ],
    'LOG': [
        ('Shipping Costs', 'OPEX'),
        ('Warehouse Equipment', 'CAPEX'),
        ('Transport & Fuel', 'OPEX'),
        ('Freight Fees', 'OPEX'),
        ('Vendor Delivery Charges', 'OPEX'),
        ('Storage Fees', 'OPEX'),
        ('Packaging Materials', 'OPEX'),
        ('Safety Gear', 'MIXED'),
    ],
    'HR': [
        ('Recruitment Expenses', 'OPEX'),
        ('Job Posting Fees', 'OPEX'),
        ('Employee Engagement Activities', 'OPEX'),
        ('Training & Workshops', 'OPEX'),
        ('Medical & Wellness Programs', 'OPEX'),
        ('Background Checks', 'OPEX'),
        ('HR Systems/Payroll Software', 'MIXED'),
    ],
    'FIN': [
        ('Professional Services', 'OPEX'),
        ('Audit Fees', 'OPEX'),
    ]
}


def calendar_month_name(number):
    return calendar.month_name[number]


class Command(BaseCommand):
    help = 'Controlled, idempotent seeder for BMS.'

    def handle(self, *args, **options):
        # MODIFICATION START: Make seeding deterministic
        random.seed(42)
        # MODIFICATION END

        self.stdout.write(self.style.WARNING(
            'Starting CONTROLLED seeding process...'))

        try:
            with transaction.atomic():
                # Verify DB is clean or print what exists
                current_cats = ExpenseCategory.objects.count()
                self.stdout.write(
                    f"Current Category Count before run: {current_cats}")

                fiscal_years = self.seed_fiscal_years()
                departments = self.seed_departments()
                
                # NEW: Seed Users
                self.seed_users(departments) 
                
                accounts = self.seed_accounts()

                categories = self.seed_categories(departments)
                self.stdout.write(
                    f"Categories seeded map keys: {list(categories.keys())}")

                projects = self.seed_proposals_and_projects(
                    departments, fiscal_years, accounts, categories)
                self.stdout.write(f"Projects created: {len(projects)}")

                allocations = self.seed_allocations(
                    projects, categories, fiscal_years)
                self.stdout.write(f"Allocations created: {len(allocations)}")

                self.seed_expenses(allocations, fiscal_years)

                self.stdout.write(self.style.SUCCESS(
                    'Successfully seeded database with controlled data.'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Seeding Failed: {str(e)}'))
            import traceback
            traceback.print_exc()

    # --- MODIFIED METHOD ---
    def seed_users(self, departments):
        self.stdout.write("Seeding Local BMS Users...")
        
        dept_name_map = {d['code']: d['name'] for d in DEPARTMENTS_CONFIG}

        # Introspect the User model to see which fields are valid
        # This prevents crashes if the custom model isn't active
        valid_fields = {f.name for f in User._meta.get_fields()}

        for u_data in SIMULATED_USERS:
            dept_code = u_data['dept']
            dept_name = dept_name_map.get(dept_code)
            
            defaults = {
                'first_name': u_data['full_name'].split(' ')[0],
                'last_name': ' '.join(u_data['full_name'].split(' ')[1:]),
                'is_active': True,
                'is_staff': u_data['role'] in ['ADMIN', 'FINANCE_HEAD']
            }
            
            # Only add these fields if the User model actually has them
            if 'role' in valid_fields:
                defaults['role'] = u_data['role']
            
            if 'department_name' in valid_fields:
                defaults['department_name'] = dept_name
            
            # Create user
            user, created = User.objects.update_or_create(
                username=u_data['username'],
                defaults=defaults
            )
            
            if created:
                self.stdout.write(f"  Created local user: {u_data['username']}")
    # ------------------

    def seed_fiscal_years(self):
        self.stdout.write("Seeding Fiscal Years (2023-2026)...")
        fys = {}
        # Always include previous 3 years plus current year for realism/history
        current_year = datetime.now().year
        years_to_seed = list(range(current_year - 3, current_year + 1))  # e.g., 2023-2026

        for year in years_to_seed:
            name = f"FY {year}"
            is_active = (year == current_year)
            is_locked = (year < current_year)

            fy, _ = FiscalYear.objects.update_or_create(
                name=name,
                defaults={
                    'start_date': datetime(year, 1, 1).date(),
                    'end_date': datetime(year, 12, 31).date(),
                    'is_active': is_active,
                    'is_locked': is_locked
                }
            )
            fys[year] = fy
        return fys

    def seed_departments(self):
        self.stdout.write("Seeding Departments...")
        dept_map = {}
        for d in DEPARTMENTS_CONFIG:
            dept, _ = Department.objects.update_or_create(
                code=d['code'],
                defaults={'name': d['name'], 'is_active': True}
            )
            dept_map[d['code']] = dept
        return dept_map

    def seed_accounts(self):
        self.stdout.write("Seeding Accounts...")
        asset_type, _ = AccountType.objects.get_or_create(name='Asset')
        expense_type, _ = AccountType.objects.get_or_create(name='Expense')
        liability_type, _ = AccountType.objects.get_or_create(
            name='Liability')  # NEW

        creator_id = 1
        creator_name = 'admin_auth'

        acc_map = {}

        # 1. Cash / Bank (Asset)
        acc_cash, _ = Account.objects.update_or_create(
            code='1010',
            defaults={'name': 'Cash in Bank', 'account_type': asset_type,
                      'created_by_user_id': creator_id, 'created_by_username': creator_name}
        )
        acc_map['CASH'] = acc_cash

        # 2. Accounts Payable (Liability)
        acc_payable, _ = Account.objects.update_or_create(
            code='2010',
            defaults={'name': 'Accounts Payable', 'account_type': liability_type,
                      'created_by_user_id': creator_id, 'created_by_username': creator_name}
        )
        acc_map['PAYABLE'] = acc_payable

        # 3. General Asset
        acc_asset, _ = Account.objects.update_or_create(
            code='1500',
            defaults={'name': 'Property, Plant & Equipment', 'account_type': asset_type,
                      'created_by_user_id': creator_id, 'created_by_username': creator_name}
        )
        acc_map['ASSET'] = acc_asset

        # 4. General Expense
        acc_expense, _ = Account.objects.update_or_create(
            code='5000',
            defaults={'name': 'General Expenses', 'account_type': expense_type,
                      'created_by_user_id': creator_id, 'created_by_username': creator_name}
        )
        acc_map['EXPENSE'] = acc_expense

        return acc_map

    def seed_categories(self, departments):
        self.stdout.write("Seeding Categories (The Tree)...")
        cat_map = {}

        # 1. Root Categories
        root_capex, _ = ExpenseCategory.objects.update_or_create(
            code='CAPEX', defaults={'name': 'Capital Expenditure', 'level': 1, 'classification': 'CAPEX'}
        )
        root_opex, _ = ExpenseCategory.objects.update_or_create(
            code='OPEX', defaults={'name': 'Operational Expenditure', 'level': 1, 'classification': 'OPEX'}
        )

        # 2. Sub-Categories
        for dept_code, items in CATEGORY_TREE.items():
            for item_name, classification in items:
                slug = item_name.upper().replace(
                    ' ', '-').replace('/', '-')[:15]
                code = f"{dept_code}-{slug}"
                parent = root_capex if classification == 'CAPEX' else root_opex

                cat, created = ExpenseCategory.objects.update_or_create(
                    code=code,
                    defaults={
                        'name': item_name,
                        'level': 2,
                        'parent_category': parent,
                        'classification': classification
                    }
                )
                if created:
                    print(f"  Created Category: {code}")

                if dept_code not in cat_map:
                    cat_map[dept_code] = []
                cat_map[dept_code].append(cat)
        return cat_map

    def seed_proposals_and_projects(self, departments, fiscal_years, accounts, categories):
        self.stdout.write("Seeding Proposals and Projects...")
        projects = []

        # MODIFICATION: Use dynamic year range instead of hard-coded list
        current_year = datetime.now().year
        years_to_seed = list(range(current_year - 3, current_year + 1))  # e.g., 2023-2026
        
        for year in years_to_seed:  # CHANGED: Now includes 2026
            fy = fiscal_years[year]
            for dept_code, dept_obj in departments.items():
                user = next(
                    (u for u in SIMULATED_USERS if u['dept'] == dept_code), SIMULATED_USERS[0])
                finance_head = SIMULATED_USERS[1]
                dept_cats = categories.get(dept_code, [])
                if not dept_cats:
                    continue

                # Seed 5 proposals per department
                for i in range(1, 6):
                    cat = random.choice(dept_cats)
                    
                    # MODIFICATION: Adjust status logic for current year (2026)
                    if year < current_year:
                        # Historical years: Force APPROVED to ensure data exists
                        status = 'APPROVED'
                    elif year == current_year:
                        # Current year: Mix of statuses for realism
                        status = random.choice(['APPROVED', 'APPROVED', 'SUBMITTED', 'REJECTED'])
                    else:
                        # Future years: Should not occur with current logic
                        status = 'SUBMITTED'

                    ticket_id = f"TKT-{dept_code}-{year}-{i:03d}"
                    amount = Decimal(str(random.randint(5000, 500000)))
                    # Set logical submission date: early January for that year
                    submission_date = datetime(year, 1, random.randint(
                        5, 14), random.randint(8, 17), random.randint(0, 59))
                    
                    # Make submission date timezone aware
                    submission_dt = timezone.make_aware(submission_date)

                    proposal, created = BudgetProposal.objects.update_or_create(
                        external_system_id=ticket_id,
                        defaults={
                            'title': f"{cat.name} Request {year} #{i}",
                            'department': dept_obj,
                            'fiscal_year': fy,
                            'project_summary': f"Request for {cat.name} to support operations.",
                            'project_description': f"Detailed description for {cat.name}. Validated by {user['full_name']}.",
                            'submitted_by_name': user['full_name'],
                            'status': status,
                            'performance_start_date': datetime(year, 1, 15).date(),
                            'performance_end_date': datetime(year, 12, 15).date(),
                            'sync_status': 'SYNCED',
                            'finance_operator_name': finance_head['full_name'] if status != 'SUBMITTED' else '',
                            'submitted_at': submission_dt,
                        }
                    )

                    if created or not proposal.items.exists():
                        BudgetProposalItem.objects.create(
                            proposal=proposal,
                            category=cat,
                            cost_element=cat.name,
                            description=f"Specific item for {cat.name}",
                            estimated_cost=amount,
                            account=accounts['ASSET'] if cat.classification == 'CAPEX' else accounts['EXPENSE']
                        )
                        
                        # Create Initial History (Submitted)
                        ProposalHistory.objects.get_or_create(
                            proposal=proposal,
                            action='SUBMITTED',
                            defaults={
                                'action_by_name': user['full_name'],
                                'action_at': submission_dt,
                                'new_status': 'SUBMITTED',
                                'comments': f"Initial submission via seeder."
                            }
                        )

                    if status == 'APPROVED':
                        proposal.approved_by_name = finance_head['full_name']
                        proposal.approval_date = datetime(year, 1, 20)
                        proposal.save()
                        
                        # Create Approval History
                        approval_dt = timezone.make_aware(datetime(year, 1, 20, 10, 0, 0))
                        ProposalHistory.objects.get_or_create(
                            proposal=proposal,
                            action='APPROVED',
                            defaults={
                                'action_by_name': finance_head['full_name'],
                                'action_at': approval_dt,
                                'previous_status': 'SUBMITTED',
                                'new_status': 'APPROVED',
                                'comments': "Approved via controlled seeder."
                            }
                        )

                        # MODIFICATION: Adjust project status for current year
                        project_status = 'IN_PROGRESS' if year == current_year else 'COMPLETED'
                        
                        project, _ = Project.objects.update_or_create(
                            budget_proposal=proposal,
                            defaults={
                                'name': proposal.title,
                                'description': proposal.project_description,
                                'start_date': proposal.performance_start_date,
                                'end_date': proposal.performance_end_date,
                                'department': dept_obj,
                                'status': project_status,
                                'completion_percentage': random.randint(10, 90)
                            }
                        )
                        ProjectFiscalYear.objects.get_or_create(
                            project=project, fiscal_year=fy)
                        projects.append(project)
                    elif status == 'REJECTED':
                        proposal.rejected_by_name = finance_head['full_name']
                        proposal.rejection_date = datetime(year, 1, 25)
                        proposal.save()
                        
                        # Create Rejection History
                        rejection_dt = timezone.make_aware(datetime(year, 1, 25, 14, 30, 0))
                        ProposalHistory.objects.get_or_create(
                            proposal=proposal,
                            action='REJECTED',
                            defaults={
                                'action_by_name': finance_head['full_name'],
                                'action_at': rejection_dt,
                                'previous_status': 'SUBMITTED',
                                'new_status': 'REJECTED',
                                'comments': "Rejected due to budget constraints (Seeder)."
                            }
                        )
                        
        return projects

    def seed_allocations(self, projects, categories, fiscal_years):
        self.stdout.write("Seeding Budget Allocations...")
        allocations = []
        finance_head = SIMULATED_USERS[1]

        for project in projects:
            item = project.budget_proposal.items.first()
            if not item:
                continue

            cat_name = item.cost_element
            category = None
            for dept_cats in categories.values():
                for c in dept_cats:
                    if c.name == cat_name:
                        category = c
                        break
                if category:
                    break

            if not category:
                continue

            allocation, created = BudgetAllocation.objects.update_or_create(
                project=project,
                defaults={
                    'fiscal_year': project.budget_proposal.fiscal_year,
                    'department': project.department,
                    'category': category,
                    'account': item.account,
                    'proposal': project.budget_proposal,
                    'amount': item.estimated_cost,
                    'created_by_name': finance_head['full_name'],
                    'is_active': True,
                    'is_locked': False
                }
            )
            allocations.append(allocation)
        return allocations

    def seed_expenses(self, allocations, fiscal_years):
        self.stdout.write("Seeding Historical Expenses...")

        current_month = datetime.now().month
        current_year = datetime.now().year

        # Seasonal multipliers to create realistic curves
        SEASONAL_MULTIPLIERS = {
            1: 0.9, 2: 0.85, 3: 1.0, 4: 1.1, 5: 1.05, 6: 1.15,
            7: 0.95, 8: 0.9, 9: 1.2, 10: 1.1, 11: 1.25, 12: 1.3
        }

        created_count = 0
        global_txn_counter = 0

        for alloc in allocations:
            year = alloc.fiscal_year.start_date.year
            project_end = alloc.project.end_date

            # Only create expenses within project timeline
            end_month = min(12, project_end.month) if year <= project_end.year else 12
            
            for month in range(1, end_month + 1):
                # 70% chance of expense in any given month
                if random.random() < 0.3:
                    continue
                
                # If it's the project end month, limit the day
                if month == project_end.month and year == project_end.year:
                    max_day = min(28, project_end.day)
                else:
                    max_day = 28
                
                # Calculate day ONCE and use it
                day = random.randint(1, max_day)
                expense_date = datetime(year, month, day).date()
                
                # Double-check: Skip if expense would be after project end
                if expense_date > project_end:
                    continue

                # Pick users
                user = next(
                    (u for u in SIMULATED_USERS if u['dept'] == alloc.department.code),
                    SIMULATED_USERS[0]
                )
                finance_head = SIMULATED_USERS[1]

                # --- NEW CALCULATION LOGIC ---
                # 1. Base burn rate: 1.5% to 3.5% of total budget per expense
                burn_rate = Decimal(random.uniform(0.015, 0.035))

                # 2. Apply Seasonal Multiplier
                seasonal_factor = Decimal(str(SEASONAL_MULTIPLIERS.get(month, 1.0)))

                # 3. Apply Yearly Growth (Inflation)
                year_diff = year - 2023
                growth_factor = Decimal(1.0 + (year_diff * 0.05))

                amount = alloc.amount * burn_rate * seasonal_factor * growth_factor
                amount = round(amount, 2)

                # Ensure we don't overspend the allocation
                if alloc.get_remaining_budget() < amount:
                    continue

                # Current year data might be mixed status
                if year == current_year:
                    if month < current_month:
                        status = 'APPROVED'
                    else:
                        status = random.choice(['APPROVED', 'SUBMITTED', 'SUBMITTED'])
                else:
                    status = 'APPROVED'

                global_txn_counter += 1
                txn_id = f"TXN-{year}{month:02d}-{global_txn_counter:05d}"

                # Use update_or_create to avoid unique violations on re-runs
                Expense.objects.update_or_create(
                    transaction_id=txn_id,
                    defaults={
                        'project': alloc.project,
                        'budget_allocation': alloc,
                        'account': alloc.account,
                        'department': alloc.department,
                        'category': alloc.category,
                        'date': expense_date,
                        'amount': amount,
                        'description': f"Purchase for {alloc.project.name} - {calendar_month_name(month)}",
                        'vendor': random.choice(['Supplier A', 'Vendor B', 'Service Corp', 'Logistics Inc']),
                        'status': status,
                        'submitted_by_user_id': user['id'],
                        'submitted_by_username': user['username'],
                        'submitted_at': timezone.make_aware(datetime(year, month, day, 9, 0, 0)),
                        'approved_by_user_id': finance_head['id'] if status == 'APPROVED' else None,
                        'approved_by_username': finance_head['username'] if status == 'APPROVED' else None,
                        'approved_at': timezone.make_aware(datetime(year, month, day, 14, 0, 0)) if status == 'APPROVED' else None,
                        'is_accomplished': True if status == 'APPROVED' else False
                    }
                )

                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Generated {created_count} expense records.")
        )