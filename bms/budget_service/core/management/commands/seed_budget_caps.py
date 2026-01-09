from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import (
    Department, ExpenseCategory, FiscalYear, 
    DepartmentBudgetCap, SubCategoryBudgetCap
)

class Command(BaseCommand):
    help = 'Seed Budget Caps (Department & Sub-Category limits) for the current Fiscal Year.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Seeding Budget Caps...'))

        # 1. Get Active Fiscal Year (Assuming 2026)
        today = timezone.now().date()
        # Fallback to finding the FY that covers "today", or just the most recent one
        fiscal_year = FiscalYear.objects.filter(
            start_date__lte=today, 
            end_date__gte=today, 
            is_active=True
        ).first()

        if not fiscal_year:
            # Fallback for seeding if date is off
            fiscal_year = FiscalYear.objects.filter(is_active=True).first() or FiscalYear.objects.last()
        
        if not fiscal_year:
            self.stdout.write(self.style.ERROR('No Fiscal Year found. Run controlled_seeder first.'))
            return

        self.stdout.write(f"Targeting Fiscal Year: {fiscal_year.name}")

        # --- DATA DEFINITIONS (From Business Requirements) ---

        # Department Caps: (Percentage of Total Org Budget, Type)
        DEPT_CAPS = {
            'MERCH': (15.00, 'SOFT'),
            'SALES': (18.00, 'SOFT'),
            'MKT':   (12.00, 'SOFT'),
            'OPS':   (20.00, 'SOFT'),
            'IT':    (15.00, 'SOFT'),
            'LOG':   (12.00, 'SOFT'),
            'HR':    (6.00,  'HARD'),
            'FIN':   (2.00,  'HARD'),
        }

        # Sub-Category Caps: { DEPT_CODE: [ (CATEGORY_CODE, % of Dept Budget, Type), ... ] }
        SUB_CAT_CAPS = {
            'MERCH': [
                ('MERCH-PLAN',  15.0, 'HARD'), # Product Range Planning
                ('MERCH-BUY',   30.0, 'SOFT'), # Buying Costs
                ('MERCH-RES',   10.0, 'SOFT'), # Market Research
                ('MERCH-INV',   10.0, 'HARD'), # Inventory Handling
                ('MERCH-TOOLS', 10.0, 'SOFT'), # Seasonal Planning Tools
            ],
            'SALES': [
                ('SALES-CONS', 10.0, 'HARD'), # Store Consumables
                ('SALES-POS',  10.0, 'HARD'), # POS Maintenance
                ('SALES-REP',  15.0, 'SOFT'), # Store Repairs
                ('SALES-OPEN', 20.0, 'SOFT'), # Store Opening
            ],
            'MKT': [
                ('MKT-CAMP',   30.0, 'SOFT'), # Campaign Budget
                ('MKT-ADS',    20.0, 'SOFT'), # Digital Ads
                ('MKT-SOCIAL', 10.0, 'HARD'), # Social Media
                ('MKT-EVENT',  10.0, 'SOFT'), # Events
            ],
            'OPS': [
                ('OPS-MAINT',  20.0, 'HARD'), # Equipment Maintenance
                ('OPS-FLEET',  20.0, 'SOFT'), # Fleet
                ('OPS-SUP',    15.0, 'HARD'), # Operational Supplies
                ('OPS-PERMIT',  5.0, 'HARD'), # Business Permits
            ],
            'IT': [
                ('IT-HOST',    20.0, 'HARD'), # Server Hosting
                ('IT-SW',      20.0, 'SOFT'), # Software Licenses
                ('IT-CLOUD',   15.0, 'SOFT'), # Cloud Subscriptions
                ('CAP-IT-HW',  20.0, 'SOFT'), # Hardware Purchases (CAPEX)
                ('IT-SEC',     10.0, 'HARD'), # Cybersecurity
            ],
            'LOG': [
                ('LOG-SHIP',   25.0, 'SOFT'), # Shipping Costs
                ('LOG-EQUIP',  20.0, 'SOFT'), # Warehouse Equipment
                ('LOG-FUEL',   20.0, 'HARD'), # Transport & Fuel
            ],
            'HR': [
                ('HR-RECRUIT', 25.0, 'HARD'), # Recruitment
                ('HRM-TRN',    20.0, 'HARD'), # Training
                ('HR-ENGAGE',  15.0, 'HARD'), # Engagement
            ],
            'FIN': [
                ('FIN-PROF',   60.0, 'HARD'), # Professional Services
                ('FIN-AUDIT',  40.0, 'HARD'), # Audit Fees
            ]
        }

        # --- EXECUTION ---

        # 1. Create Department Caps
        for code, (pct, cap_type) in DEPT_CAPS.items():
            try:
                dept = Department.objects.get(code=code)
                DepartmentBudgetCap.objects.update_or_create(
                    department=dept,
                    fiscal_year=fiscal_year,
                    defaults={
                        'percentage_of_total': pct,
                        'cap_type': cap_type,
                        'is_active': True
                    }
                )
                self.stdout.write(f"  Set Dept Cap for {code}: {pct}% ({cap_type})")
            except Department.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"  Dept {code} not found!"))

        # 2. Create Sub-Category Caps
        for dept_code, caps in SUB_CAT_CAPS.items():
            try:
                dept = Department.objects.get(code=dept_code)
                
                for (cat_code, pct, cap_type) in caps:
                    try:
                        category = ExpenseCategory.objects.get(code=cat_code)
                        
                        SubCategoryBudgetCap.objects.update_or_create(
                            expense_category=category,
                            department=dept,
                            fiscal_year=fiscal_year,
                            defaults={
                                'percentage_of_department': pct,
                                'cap_type': cap_type,
                                'is_active': True
                            }
                        )
                        # self.stdout.write(f"    Set Sub-Cap for {cat_code}: {pct}% ({cap_type})")
                    except ExpenseCategory.DoesNotExist:
                        self.stdout.write(self.style.ERROR(f"    Category {cat_code} not found!"))
                        
            except Department.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"  Dept {dept_code} not found during sub-cap seeding!"))

        self.stdout.write(self.style.SUCCESS('Successfully seeded Budget Caps.'))