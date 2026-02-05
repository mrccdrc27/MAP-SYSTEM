from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import datetime
import random
import calendar
from decimal import Decimal
from django.contrib.auth import get_user_model

# Import models
from core.models import (
    Department, AccountType, Account, FiscalYear, BudgetProposal, BudgetProposalItem,
    BudgetAllocation, ExpenseCategory, Expense, Project, ProjectFiscalYear, ProposalHistory
)

# Get the active User model (whether it's custom or default)
User = get_user_model()

# ✅ MODIFIED: Changed SIMULATED_USERS to include email
SIMULATED_USERS = [
    {'id': 1, 'username': 'admin_auth', 'email': 'admin@example.com', 'full_name': 'AuthAdmin User',
        'dept': 'FIN', 'role': 'ADMIN'},
    {'id': 2, 'username': 'finance_head_auth', 'email': 'finance_head@example.com', 'full_name': 'Finance Head',
        'dept': 'FIN', 'role': 'FINANCE_HEAD'},
    {'id': 3, 'username': 'it_user_auth', 'email': 'it_user@example.com',
        'full_name': 'IT Support', 'dept': 'IT', 'role': 'ADMIN'},
    {'id': 4, 'username': 'ops_user_auth', 'email': 'ops_user@example.com', 'full_name': 'Operations Staff',
        'dept': 'OPS', 'role': 'GENERAL_USER'},
    {'id': 5, 'username': 'adi123', 'email': 'adi@example.com', 'full_name': 'Eldrin Adi',
        'dept': 'IT', 'role': 'ADMIN'},
    {'id': 6, 'username': 'mkt_user_auth', 'email': 'marketing@example.com', 'full_name': 'Marketing Specialist',
        'dept': 'MKT', 'role': 'GENERAL_USER'},
    {'id': 7, 'username': 'hr_user_auth', 'email': 'hr_user@example.com', 'full_name': 'HR Manager',
        'dept': 'HR', 'role': 'GENERAL_USER'},
    {'id': 8, 'username': 'sales_user', 'email': 'sales@example.com', 'full_name': 'Sales Manager',
        'dept': 'SALES', 'role': 'GENERAL_USER'},
    {'id': 9, 'username': 'logistics_user', 'email': 'logistics@example.com', 'full_name': 'Logistics Manager',
        'dept': 'LOG', 'role': 'GENERAL_USER'},
    {'id': 10, 'username': 'merch_user', 'email': 'merch@example.com', 'full_name': 'Merch Planner',
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
        ('Product Range Planning', 'OPEX', 'MERCH-PLAN'),
        ('Buying Costs', 'MIXED', 'MERCH-BUY'),
        ('Market Research', 'OPEX', 'MERCH-RES'),
        ('Inventory Handling Fees', 'OPEX', 'MERCH-INV'),
        ('Supplier Coordination', 'OPEX', 'MERCH-SUP'),
        ('Seasonal Planning Tools', 'CAPEX', 'MERCH-TOOLS'),
        ('Training', 'OPEX', 'MERCH-TRN'),
        ('Travel', 'OPEX', 'MERCH-TRV'),
        ('Software Subscription', 'OPEX', 'MERCH-SW'),
    ],
    'SALES': [
        ('Store Consumables', 'OPEX', 'SALES-CONS'),
        ('POS Maintenance', 'OPEX', 'SALES-POS'),
        ('Store Repairs', 'MIXED', 'SALES-REP'),
        ('Sales Incentives', 'OPEX', 'SALES-INC'),
        ('Uniforms', 'MIXED', 'SALES-UNI'),
        ('Store Opening Expenses', 'CAPEX', 'SALES-OPEN'),
        ('Store Supplies', 'OPEX', 'SALES-SUP'),
        ('Utilities', 'OPEX', 'SALES-UTIL'),
    ],
    'MKT': [
        ('Campaign Budget', 'OPEX', 'MKT-CAMP'),
        ('Branding Materials', 'MIXED', 'MKT-BRAND'),
        ('Digital Ads', 'OPEX', 'MKT-ADS'),
        ('Social Media Management', 'OPEX', 'MKT-SOCIAL'),
        ('Events Budget', 'OPEX', 'MKT-EVENT'),
        ('Influencer Fees', 'OPEX', 'MKT-INFL'),
        ('Photography/Videography', 'MIXED', 'MKT-PHOTO'),
    ],
    'OPS': [
        ('Equipment Maintenance', 'OPEX', 'OPS-MAINT'),
        ('Fleet/Vehicle Expenses', 'MIXED', 'OPS-FLEET'),
        ('Operational Supplies', 'OPEX', 'OPS-SUP'),
        ('Business Permits', 'OPEX', 'OPS-PERMIT'),
        ('Facility Utilities', 'OPEX', 'OPS-UTIL'),
        ('Compliance Costs', 'OPEX', 'OPS-COMP'),
    ],
    'IT': [
        ('Server Hosting', 'OPEX', 'IT-HOST'),
        ('Software Licenses', 'MIXED', 'IT-SW'),
        ('Cloud Subscriptions', 'OPEX', 'IT-CLOUD'),
        ('Hardware Purchases', 'CAPEX', 'CAP-IT-HW'),
        ('Data Tools', 'MIXED', 'IT-DATA'),
        ('Cybersecurity Costs', 'OPEX', 'IT-SEC'),
        ('API Subscription Fees', 'OPEX', 'IT-API'),
        ('Domain Renewals', 'OPEX', 'IT-DOMAIN'),
    ],
    'LOG': [
        ('Shipping Costs', 'OPEX', 'LOG-SHIP'),
        ('Warehouse Equipment', 'CAPEX', 'LOG-EQUIP'),
        ('Transport & Fuel', 'OPEX', 'LOG-FUEL'),
        ('Freight Fees', 'OPEX', 'LOG-FREIGHT'),
        ('Vendor Delivery Charges', 'OPEX', 'LOG-DELIV'),
        ('Storage Fees', 'OPEX', 'LOG-STOR'),
        ('Packaging Materials', 'OPEX', 'LOG-PACK'),
        ('Safety Gear', 'MIXED', 'LOG-SAFE'),
    ],
    'HR': [
        ('Recruitment Expenses', 'OPEX', 'HR-RECRUIT'),
        ('Job Posting Fees', 'OPEX', 'HR-POST'),
        ('Employee Engagement Activities', 'OPEX', 'HR-ENGAGE'),
        ('Training & Workshops', 'OPEX', 'HRM-TRN'),
        ('Medical & Wellness Programs', 'OPEX', 'HR-MED'),
        ('Background Checks', 'OPEX', 'HR-CHECK'),
        ('HR Systems/Payroll Software', 'MIXED', 'HR-SYS'),
    ],
    'FIN': [
        ('Professional Services', 'OPEX', 'FIN-PROF'),
        ('Audit Fees', 'OPEX', 'FIN-AUDIT'),
    ],
    '_SYSTEM': [
        ('General/Miscellaneous', 'OPEX', 'GEN-MISC'),
    ]
}


def calendar_month_name(number):
    return calendar.month_name[number]


class Command(BaseCommand):
    help = 'Controlled, idempotent seeder for BMS.'

    def handle(self, *args, **options):
        random.seed(42)
        self.stdout.write(self.style.WARNING(
            'Starting CONTROLLED seeding process...'))

        try:
            with transaction.atomic():
                current_cats = ExpenseCategory.objects.count()
                self.stdout.write(
                    f"Current Category Count before run: {current_cats}")

                fiscal_years = self.seed_fiscal_years()
                departments = self.seed_departments()

                # ✅ CRITICAL FIX: Seed users FIRST, before anything references them
                user_map = self.seed_users(departments)

                accounts = self.seed_accounts(user_map)
                categories = self.seed_categories(departments)
                self.stdout.write(
                    f"Categories seeded map keys: {list(categories.keys())}")

                projects = self.seed_proposals_and_projects(
                    departments, fiscal_years, accounts, categories, user_map)
                self.stdout.write(f"Projects created: {len(projects)}")

                allocations = self.seed_allocations(
                    projects, categories, fiscal_years, user_map)
                self.stdout.write(f"Allocations created: {len(allocations)}")

                self.seed_expenses(allocations, fiscal_years, user_map)
                
                self.reset_sequences()

                self.stdout.write(self.style.SUCCESS(
                    'Successfully seeded database with controlled data.'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Seeding Failed: {str(e)}'))
            import traceback
            traceback.print_exc()

    # ✅ COMPLETELY REWRITTEN: Now returns a user_map for referencing
    def seed_users(self, departments):
        """
        Create or update BMS mirror users from SIMULATED_USERS.
        Returns a dict mapping usernames to User instances.
        """
        self.stdout.write("Seeding Local BMS Mirror Users...")

        dept_name_map = {d['code']: d['name'] for d in DEPARTMENTS_CONFIG}
        user_map = {}

        for u_data in SIMULATED_USERS:
            dept_code = u_data['dept']
            dept_name = dept_name_map.get(dept_code)
            username = u_data['username']
            email = u_data['email']  # ✅ Now required in SIMULATED_USERS

            # Split full_name into first/last
            name_parts = u_data['full_name'].split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            # ✅ CRITICAL: Use email as primary lookup (matches JIT provisioning logic)
            user, created = User.objects.update_or_create(
                email=email,  # Primary lookup key
                defaults={
                    'username': username,
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': u_data['role'],
                    'department_name': dept_name,
                    'is_active': True,
                    'is_staff': u_data['role'] in ['ADMIN', 'FINANCE_HEAD'],
                }
            )

            user_map[username] = user  # Map username → User instance

            if created:
                self.stdout.write(
                    f"  ✅ Created mirror user: {username} (id={user.id}, email={email})")
            else:
                self.stdout.write(
                    f"  🔄 Updated mirror user: {username} (id={user.id})")

        return user_map

    def seed_fiscal_years(self):
        """Seed Fiscal Years with STABLE IDs for external system compatibility"""
        self.stdout.write("Seeding Fiscal Years (2023-2026) with stable IDs...")
        fys = {}
        current_year = datetime.now().year
        years_to_seed = list(range(current_year - 3, current_year + 1))
        
        # ✅ STABLE ID MAPPING - External systems can hardcode these
        STABLE_FY_IDS = {
            2023: 1,
            2024: 2,
            2025: 3,
            2026: 4,
        }

        for year in years_to_seed:
            name = f"FY {year}"
            is_active = (year == current_year)
            is_locked = (year < current_year)
            stable_id = STABLE_FY_IDS.get(year)
            
            if not stable_id:
                self.stdout.write(self.style.WARNING(
                    f"⚠️  No stable ID for year {year}. Add to STABLE_FY_IDS mapping."
                ))
                continue
            
            fy, created = FiscalYear.objects.update_or_create(
                id=stable_id,  # ✅ Force specific ID
                defaults={
                    'name': name,
                    'start_date': datetime(year, 1, 1).date(),
                    'end_date': datetime(year, 12, 31).date(),
                    'is_active': is_active,
                    'is_locked': is_locked
                }
            )
            fys[year] = fy
            
            if created:
                self.stdout.write(f"  ✅ Created {name} with ID={stable_id}")
        
        return fys

    def seed_departments(self):
        """Seed Departments with STABLE IDs for external system compatibility"""
        self.stdout.write("Seeding Departments with stable IDs...")
        dept_map = {}
        
        # ✅ STABLE ID MAPPING - Matches DEPARTMENTS_CONFIG order
        STABLE_DEPARTMENTS = [
            (1, 'MERCH', 'Merchandising / Merchandise Planning'),
            (2, 'SALES', 'Sales / Store Operations'),
            (3, 'MKT', 'Marketing / Marketing Communications'),
            (4, 'OPS', 'Operations Department'),
            (5, 'IT', 'IT Application & Data'),
            (6, 'LOG', 'Logistics Management'),
            (7, 'HR', 'Human Resources'),
            (8, 'FIN', 'Finance Department'),
        ]
        
        for stable_id, code, name in STABLE_DEPARTMENTS:
            dept, created = Department.objects.update_or_create(
                id=stable_id,  # ✅ Force specific ID
                defaults={
                    'code': code,
                    'name': name,
                    'is_active': True
                }
            )
            dept_map[code] = dept
        
        return dept_map

    def seed_accounts(self, user_map):
        """Seed GL Accounts with STABLE IDs for external system compatibility"""
        self.stdout.write("Seeding Accounts with stable IDs...")
        
        # Get or create account types (these can have auto IDs, not critical)
        asset_type, _ = AccountType.objects.get_or_create(name='Asset')
        expense_type, _ = AccountType.objects.get_or_create(name='Expense')
        liability_type, _ = AccountType.objects.get_or_create(name='Liability')
        equity_type, _ = AccountType.objects.get_or_create(name='Equity')
        
        creator = user_map.get('admin_auth')
        creator_id = creator.id if creator else 1
        creator_name = creator.username if creator else 'admin_auth'
        
        acc_map = {}
        
        # ✅ STABLE ID MAPPING - These are the core GL accounts
        STABLE_ACCOUNTS = [
            (1, '1010', 'Cash in Bank', asset_type),
            (2, '2010', 'Accounts Payable', liability_type),
            (3, '1500', 'Property, Plant & Equipment', asset_type),
            (4, '5000', 'General Expenses', expense_type),
            (5, '3000', 'Retained Earnings', equity_type),
        ]
        
        for stable_id, code, name, acc_type in STABLE_ACCOUNTS:
            obj, created = Account.objects.update_or_create(
                id=stable_id,  # ✅ Force specific ID
                defaults={
                    'code': code,
                    'name': name,
                    'account_type': acc_type,
                    'created_by_user_id': creator_id,
                    'created_by_username': creator_name,
                    'is_active': True
                }
            )
            
            # Use code as key for backwards compatibility
            if code == '1010':
                acc_map['CASH'] = obj
            elif code == '2010':
                acc_map['PAYABLE'] = obj
            elif code == '1500':
                acc_map['ASSET'] = obj
            elif code == '5000':
                acc_map['EXPENSE'] = obj
            elif code == '3000':
                acc_map['EQUITY'] = obj
        
        return acc_map

    def seed_categories(self, departments):
        """Seed Expense Categories with STABLE IDs for external system compatibility"""
        self.stdout.write("Seeding Categories (The Tree) with stable IDs...")
        cat_map = {}
        
        # ✅ ROOT CATEGORIES - Critical that these have stable IDs
        root_capex, _ = ExpenseCategory.objects.update_or_create(
            id=1,  # ✅ Force ID=1 for CAPEX
            defaults={
                'code': 'CAPEX',
                'name': 'Capital Expenditure',
                'level': 1,
                'classification': 'CAPEX'
            }
        )
        root_opex, _ = ExpenseCategory.objects.update_or_create(
            id=2,  # ✅ Force ID=2 for OPEX
            defaults={
                'code': 'OPEX',
                'name': 'Operational Expenditure',
                'level': 1,
                'classification': 'OPEX'
            }
        )
        
        # ✅ STABLE ID MAPPING FOR ALL SUB-CATEGORIES
        # Organized by department, IDs grouped in blocks of 10
        STABLE_CATEGORY_IDS = {
            # MERCH Department (10-18)
            'MERCH-PLAN': 10,
            'MERCH-BUY': 11,
            'MERCH-RES': 12,
            'MERCH-INV': 13,
            'MERCH-SUP': 14,
            'MERCH-TOOLS': 15,
            'MERCH-TRN': 16,
            'MERCH-TRV': 17,
            'MERCH-SW': 18,
            
            # SALES Department (20-27)
            'SALES-CONS': 20,
            'SALES-POS': 21,
            'SALES-REP': 22,
            'SALES-INC': 23,
            'SALES-UNI': 24,
            'SALES-OPEN': 25,
            'SALES-SUP': 26,
            'SALES-UTIL': 27,
            
            # MKT Department (30-36)
            'MKT-CAMP': 30,
            'MKT-BRAND': 31,
            'MKT-ADS': 32,
            'MKT-SOCIAL': 33,
            'MKT-EVENT': 34,
            'MKT-INFL': 35,
            'MKT-PHOTO': 36,
            
            # OPS Department (40-45)
            'OPS-MAINT': 40,
            'OPS-FLEET': 41,
            'OPS-SUP': 42,
            'OPS-PERMIT': 43,
            'OPS-UTIL': 44,
            'OPS-COMP': 45,
            
            # IT Department (50-57)
            'IT-HOST': 50,
            'IT-SW': 51,
            'IT-CLOUD': 52,
            'CAP-IT-HW': 53,
            'IT-DATA': 54,
            'IT-SEC': 55,
            'IT-API': 56,
            'IT-DOMAIN': 57,
            
            # LOG Department (60-67)
            'LOG-SHIP': 60,
            'LOG-EQUIP': 61,
            'LOG-FUEL': 62,
            'LOG-FREIGHT': 63,
            'LOG-DELIV': 64,
            'LOG-STOR': 65,
            'LOG-PACK': 66,
            'LOG-SAFE': 67,
            
            # HR Department (70-76)
            'HR-RECRUIT': 70,
            'HR-POST': 71,
            'HR-ENGAGE': 72,
            'HRM-TRN': 73,
            'HR-MED': 74,
            'HR-CHECK': 75,
            'HR-SYS': 76,
            
            # FIN Department (80-81)
            'FIN-PROF': 80,
            'FIN-AUDIT': 81,
            
            # Fallback category (90-99 reserved for system categories)
            'GEN-MISC': 90,
        }
        
        # Process the CATEGORY_TREE as before, but with stable IDs
        for dept_code, items in CATEGORY_TREE.items():
            for item_name, classification, code in items:
                parent = root_capex if classification == 'CAPEX' else root_opex
                stable_id = STABLE_CATEGORY_IDS.get(code)
                
                if stable_id:
                    # ✅ Create with stable ID
                    cat, created = ExpenseCategory.objects.update_or_create(
                        id=stable_id,  # ✅ Force specific ID
                        defaults={
                            'code': code,
                            'name': item_name,
                            'level': 2,
                            'parent_category': parent,
                            'classification': classification
                        }
                    )
                    
                    if created:
                        print(f"  ✅ Created Category: {code} (ID={stable_id})")
                else:
                    # ⚠️ Fallback for unmapped categories (should not happen if mapping is complete)
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
                        print(f"  ⚠️  WARNING: Category {code} created WITHOUT stable ID! Add to mapping.")
                
                # Build department → category mapping for rest of seeder
                if dept_code not in cat_map:
                    cat_map[dept_code] = []
                cat_map[dept_code].append(cat)
        
        return cat_map

    # ✅ MODIFIED: Now uses user_map to get actual User instances
    def seed_proposals_and_projects(self, departments, fiscal_years, accounts, categories, user_map):
        self.stdout.write("Seeding Proposals and Projects...")
        projects = []

        current_year = datetime.now().year
        years_to_seed = list(range(current_year - 3, current_year + 1))

        # ✅ FIXED: Get finance head User instance
        finance_head_user = user_map.get('finance_head_auth')

        for year in years_to_seed:
            fy = fiscal_years[year]
            for dept_code, dept_obj in departments.items():
                # ✅ FIXED: Get department user from user_map
                user_data = next(
                    (u for u in SIMULATED_USERS if u['dept'] == dept_code), SIMULATED_USERS[0])
                dept_user = user_map.get(user_data['username'])

                dept_cats = categories.get(dept_code, [])
                if not dept_cats:
                    continue

                for i in range(1, 6):
                    cat = random.choice(dept_cats)

                    if year < current_year:
                        status = 'APPROVED'
                    elif year == current_year:
                        status = random.choice(
                            ['APPROVED', 'APPROVED', 'SUBMITTED', 'REJECTED'])
                    else:
                        status = 'SUBMITTED'

                    ticket_id = f"TKT-{dept_code}-{year}-{i:03d}"
                    amount = Decimal(str(random.randint(5000, 500000)))
                    submission_date = datetime(year, 1, random.randint(5, 14),
                                               random.randint(8, 17), random.randint(0, 59))
                    submission_dt = timezone.make_aware(submission_date)

                    proposal, created = BudgetProposal.objects.update_or_create(
                        external_system_id=ticket_id,
                        defaults={
                            'title': f"{cat.name} Request {year} #{i}",
                            'department': dept_obj,
                            'fiscal_year': fy,
                            'project_summary': f"Request for {cat.name} to support operations.",
                            'project_description': f"Detailed description for {cat.name}. Validated by {user_data['full_name']}.",
                            'submitted_by_name': user_data['full_name'],
                            'status': status,
                            'performance_start_date': datetime(year, 1, 15).date(),
                            'performance_end_date': datetime(year, 12, 15).date(),
                            'sync_status': 'SYNCED',
                            'finance_manager_name': finance_head_user.get_full_name() if status != 'SUBMITTED' else '',
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

                        ProposalHistory.objects.get_or_create(
                            proposal=proposal,
                            action='SUBMITTED',
                            defaults={
                                'action_by_name': user_data['full_name'],
                                'action_at': submission_dt,
                                'new_status': 'SUBMITTED',
                                'comments': f"Initial submission via seeder."
                            }
                        )

                    if status == 'APPROVED':
                        proposal.approved_by_name = finance_head_user.get_full_name()
                        proposal.approval_date = datetime(year, 1, 20)
                        proposal.save()

                        approval_dt = timezone.make_aware(
                            datetime(year, 1, 20, 10, 0, 0))
                        ProposalHistory.objects.get_or_create(
                            proposal=proposal,
                            action='APPROVED',
                            defaults={
                                'action_by_name': finance_head_user.get_full_name(),
                                'action_at': approval_dt,
                                'previous_status': 'SUBMITTED',
                                'new_status': 'APPROVED',
                                'comments': "Approved via controlled seeder."
                            }
                        )

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
                        proposal.rejected_by_name = finance_head_user.get_full_name()
                        proposal.rejection_date = datetime(year, 1, 25)
                        proposal.save()

                        rejection_dt = timezone.make_aware(
                            datetime(year, 1, 25, 14, 30, 0))
                        ProposalHistory.objects.get_or_create(
                            proposal=proposal,
                            action='REJECTED',
                            defaults={
                                'action_by_name': finance_head_user.get_full_name(),
                                'action_at': rejection_dt,
                                'previous_status': 'SUBMITTED',
                                'new_status': 'REJECTED',
                                'comments': "Rejected due to budget constraints (Seeder)."
                            }
                        )

        return projects

    # ✅ MODIFIED: Now uses user_map
    def seed_allocations(self, projects, categories, fiscal_years, user_map):
        self.stdout.write("Seeding Budget Allocations...")
        allocations = []
        finance_head_user = user_map.get('finance_head_auth')

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
                    'created_by_name': finance_head_user.get_full_name(),
                    'is_active': True,
                    'is_locked': False
                }
            )
            allocations.append(allocation)
        return allocations

    # ✅ MODIFIED: Now uses user_map to get actual User instances with correct IDs
    def seed_expenses(self, allocations, fiscal_years, user_map):
        self.stdout.write("Seeding Historical Expenses...")

        current_month = datetime.now().month
        current_year = datetime.now().year
        current_day = datetime.now().day

        SEASONAL_MULTIPLIERS = {
            1: 0.9, 2: 0.85, 3: 1.0, 4: 1.1, 5: 1.05, 6: 1.15,
            7: 0.95, 8: 0.9, 9: 1.2, 10: 1.1, 11: 1.25, 12: 1.3
        }

        created_count = 0
        global_txn_counter = 0

        # ✅ FIXED: Get finance head User instance
        finance_head_user = user_map.get('finance_head_auth')

        for alloc in allocations:
            year = alloc.fiscal_year.start_date.year
            project_end = alloc.project.end_date

            if year < current_year:
                end_month = min(
                    12, project_end.month) if year <= project_end.year else 12
            elif year == current_year:
                end_month = current_month
            else:
                continue

            for month in range(1, end_month + 1):
                if random.random() < 0.3:
                    continue

                if year == current_year and month == current_month:
                    max_day = min(28, current_day - 1)
                elif month == project_end.month and year == project_end.year:
                    max_day = min(28, project_end.day)
                else:
                    max_day = 28

                if max_day < 1:
                    continue

                day = random.randint(1, max_day)
                expense_date = datetime(year, month, day).date()

                if expense_date > project_end:
                    continue

                # ✅ FIXED: Get department user from user_map
                user_data = next(
                    (u for u in SIMULATED_USERS if u['dept']
                     == alloc.department.code),
                    SIMULATED_USERS[0]
                )
                dept_user = user_map.get(user_data['username'])

                burn_rate = Decimal(random.uniform(0.015, 0.035))
                seasonal_factor = Decimal(
                    str(SEASONAL_MULTIPLIERS.get(month, 1.0)))
                year_diff = year - 2023
                growth_factor = Decimal(1.0 + (year_diff * 0.05))
                amount = alloc.amount * burn_rate * seasonal_factor * growth_factor
                amount = round(amount, 2)

                if alloc.get_remaining_budget() < amount:
                    continue

                if year == current_year:
                    if month < current_month:
                        status = 'APPROVED'
                    elif month == current_month:
                        status = random.choice(
                            ['APPROVED', 'APPROVED', 'SUBMITTED'])
                    else:
                        continue
                else:
                    status = 'APPROVED'

                global_txn_counter += 1
                txn_id = f"TXN-{year}{month:02d}-{global_txn_counter:05d}"

                # ✅ CRITICAL FIX: Use actual User.id from BMS database
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
                        'submitted_by_user_id': dept_user.id,  # ✅ FIXED: Use actual BMS User ID
                        'submitted_by_username': dept_user.username,
                        'submitted_at': timezone.make_aware(datetime(year, month, day, 9, 0, 0)),
                        'approved_by_user_id': finance_head_user.id if status == 'APPROVED' else None,  # ✅ FIXED
                        'approved_by_username': finance_head_user.username if status == 'APPROVED' else None,
                        'approved_at': timezone.make_aware(datetime(year, month, day, 14, 0, 0)) if status == 'APPROVED' else None,
                        'is_accomplished': True if status == 'APPROVED' else False
                    }
                )

                created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Generated {created_count} expense records."))

    def reset_sequences(self):
        """Reset PostgreSQL auto-increment sequences after manual ID assignment"""
        from django.db import connection
        
        self.stdout.write("Resetting PostgreSQL sequences...")
        
        with connection.cursor() as cursor:
            # Reset FiscalYear sequence to max ID + 1
            cursor.execute("""
                SELECT setval(
                    pg_get_serial_sequence('core_fiscalyear', 'id'),
                    COALESCE((SELECT MAX(id) FROM core_fiscalyear), 1),
                    true
                );
            """)
            
            # Reset Department sequence
            cursor.execute("""
                SELECT setval(
                    pg_get_serial_sequence('core_department', 'id'),
                    COALESCE((SELECT MAX(id) FROM core_department), 1),
                    true
                );
            """)
            
            # Reset Account sequence
            cursor.execute("""
                SELECT setval(
                    pg_get_serial_sequence('core_account', 'id'),
                    COALESCE((SELECT MAX(id) FROM core_account), 1),
                    true
                );
            """)
            
            # Reset ExpenseCategory sequence (CRITICAL)
            cursor.execute("""
                SELECT setval(
                    pg_get_serial_sequence('core_expensecategory', 'id'),
                    COALESCE((SELECT MAX(id) FROM core_expensecategory), 1),
                    true
                );
            """)
        
        self.stdout.write(self.style.SUCCESS("✅ Sequences reset successfully"))