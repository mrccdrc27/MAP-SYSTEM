from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import datetime
from core.models import (
    Department, AccountType, Account, FiscalYear, ExpenseCategory,
    DepartmentBudgetCap
)
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Initializes the system with required Master Data. Safe to run multiple times.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Initializing Master Data...'))

        with transaction.atomic():
            # 1. Fiscal Year (Current Year)
            current_year = datetime.now().year
            fy, created = FiscalYear.objects.get_or_create(
                name=f"FY {current_year}",
                defaults={
                    'start_date': datetime(current_year, 1, 1).date(),
                    'end_date': datetime(current_year, 12, 31).date(),
                    'is_active': True,
                    'is_locked': False
                }
            )
            self.stdout.write(f"- Fiscal Year: {fy.name}")

            # 2. Departments
            depts = [
                {'code': 'MERCH', 'name': 'Merchandising / Merchandise Planning'},
                {'code': 'SALES', 'name': 'Sales / Store Operations'},
                {'code': 'MKT', 'name': 'Marketing / Marketing Communications'},
                {'code': 'OPS', 'name': 'Operations Department'},
                {'code': 'IT', 'name': 'IT Application & Data'},
                {'code': 'LOG', 'name': 'Logistics Management'},
                {'code': 'HR', 'name': 'Human Resources'},
                {'code': 'FIN', 'name': 'Finance Department'},
            ]
            for d in depts:
                Department.objects.get_or_create(
                    code=d['code'], 
                    defaults={'name': d['name'], 'is_active': True}
                )
            self.stdout.write(f"- Departments: {len(depts)} verified.")

            # 3. Account Types
            types = ['Asset', 'Liability', 'Equity', 'Expense', 'Revenue']
            type_objs = {}
            for t in types:
                obj, _ = AccountType.objects.get_or_create(name=t)
                type_objs[t] = obj

            # 4. GL Accounts (Required for Budget Allocation Logic)
            accounts = [
                {'code': '1010', 'name': 'Cash in Bank', 'type': 'Asset'},
                {'code': '3000', 'name': 'Retained Earnings', 'type': 'Equity'},
                {'code': '1500', 'name': 'Property, Plant & Equipment', 'type': 'Asset'},
                {'code': '5000', 'name': 'General Expenses', 'type': 'Expense'},
                {'code': '2010', 'name': 'Accounts Payable', 'type': 'Liability'},
            ]
            
            # System User ID placeholder (usually 1 or 0)
            sys_id = 1 

            for acc in accounts:
                Account.objects.update_or_create(
                    code=acc['code'],
                    defaults={
                        'name': acc['name'],
                        'account_type': type_objs[acc['type']],
                        'is_active': True,
                        'created_by_user_id': sys_id,
                        'created_by_username': 'System Init'
                    }
                )
            self.stdout.write(f"- GL Accounts: {len(accounts)} verified.")

            # 5. Expense Categories (Essential Structure)
            root_capex, _ = ExpenseCategory.objects.get_or_create(
                code='CAPEX', defaults={'name': 'Capital Expenditure', 'level': 1, 'classification': 'CAPEX'}
            )
            root_opex, _ = ExpenseCategory.objects.get_or_create(
                code='OPEX', defaults={'name': 'Operational Expenditure', 'level': 1, 'classification': 'OPEX'}
            )

            # Standard Categories needed for UI dropdowns
            categories = [
                # IT
                ('IT-HOST', 'Server Hosting', 'OPEX'),
                ('CAP-IT-HW', 'Hardware Purchases', 'CAPEX'),
                ('IT-SW', 'Software Licenses', 'OPEX'),
                # Marketing
                ('MKT-ADS', 'Digital Ads', 'OPEX'),
                # Operations
                ('OPS-UTIL', 'Facility Utilities', 'OPEX'),
                # General Fallback
                ('GEN-MISC', 'General/Miscellaneous', 'OPEX'),
            ]

            for code, name, classification in categories:
                parent = root_capex if classification == 'CAPEX' else root_opex
                ExpenseCategory.objects.update_or_create(
                    code=code,
                    defaults={
                        'name': name,
                        'level': 2,
                        'classification': classification,
                        'parent_category': parent,
                        'is_active': True
                    }
                )
            self.stdout.write(f"- Basic Categories: {len(categories)} verified.")

            # 6. Default Budget Caps (Prevent Soft Cap Crashes)
            for dept in Department.objects.all():
                DepartmentBudgetCap.objects.get_or_create(
                    department=dept,
                    fiscal_year=fy,
                    defaults={
                        'percentage_of_total': 15.00, 
                        'cap_type': 'SOFT', 
                        'is_active': True
                    }
                )
            # 7. Ensure System Admin Exists (For Login/Management)
            User = get_user_model()
            
            if not User.objects.filter(is_superuser=True).exists():
                self.stdout.write("Creating Default Superuser (admin)...")
                # Create a default admin if none exists
                # Password setting is handled by Auth Service, but we need the record here
                User.objects.create_superuser(
                    username='admin',
                    email='admin@example.com',
                    password='admin', # Placeholder
                    role='ADMIN'
                )
            else:
                self.stdout.write("- Superuser exists.")

        self.stdout.write(self.style.SUCCESS('SUCCESS: System Master Data Initialized.'))