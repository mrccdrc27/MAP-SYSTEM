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
        
        self.stdout.write(self.style.WARNING('\n=== Creating Fallback Category ==='))
        fallback, created = ExpenseCategory.objects.get_or_create(
            code='GEN-MISC',
            defaults={
                'name': 'General/Miscellaneous',
                'description': 'Fallback category for uncategorized expenses from external systems',
                'level': 2,
                'classification': 'OPEX',
                'is_active': True,
                'parent_category': ExpenseCategory.objects.filter(
                    code='OPEX', level=1
                ).first()  # Link to top-level OPEX if it exists
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Created fallback category: {fallback.code} - {fallback.name}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'✓ Fallback category already exists: {fallback.code}'))


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
        # UPDATED: Added all missing categories with logical percentages
        SUB_CAT_CAPS = {
            'MERCH': [
                ('MERCH-PLAN',  15.0, 'HARD'),  # Product Range Planning
                ('MERCH-BUY',   30.0, 'SOFT'),  # Buying Costs (largest expense)
                ('MERCH-RES',   10.0, 'SOFT'),  # Market Research
                ('MERCH-INV',   10.0, 'HARD'),  # Inventory Handling
                ('MERCH-TOOLS', 10.0, 'SOFT'),  # Seasonal Planning Tools
                ('MERCH-SUP',    8.0, 'SOFT'),  # Supplier Coordination
                ('MERCH-TRN',    5.0, 'SOFT'),  # Training
                ('MERCH-TRV',    7.0, 'SOFT'),  # Travel
                ('MERCH-SW',     5.0, 'SOFT'),  # Software Subscription
            ],
            'SALES': [
                ('SALES-CONS', 10.0, 'HARD'),  # Store Consumables
                ('SALES-POS',  10.0, 'HARD'),  # POS Maintenance
                ('SALES-REP',  15.0, 'SOFT'),  # Store Repairs
                ('SALES-OPEN', 20.0, 'SOFT'),  # Store Opening
                ('SALES-INC',  15.0, 'SOFT'),  # Sales Incentives
                ('SALES-UNI',   8.0, 'SOFT'),  # Uniforms
                ('SALES-SUP',  10.0, 'SOFT'),  # Store Supplies
                ('SALES-UTIL', 12.0, 'HARD'),  # Utilities (fixed cost)
            ],
            'MKT': [
                ('MKT-CAMP',   30.0, 'SOFT'),  # Campaign Budget (largest)
                ('MKT-ADS',    20.0, 'SOFT'),  # Digital Ads
                ('MKT-SOCIAL', 10.0, 'HARD'),  # Social Media
                ('MKT-EVENT',  10.0, 'SOFT'),  # Events
                ('MKT-BRAND',  12.0, 'SOFT'),  # Branding Materials
                ('MKT-INFL',    8.0, 'SOFT'),  # Influencer Fees
                ('MKT-PHOTO',  10.0, 'SOFT'),  # Photography/Videography
            ],
            'OPS': [
                ('OPS-MAINT',  20.0, 'HARD'),  # Equipment Maintenance
                ('OPS-FLEET',  20.0, 'SOFT'),  # Fleet (large variable cost)
                ('OPS-SUP',    15.0, 'HARD'),  # Operational Supplies
                ('OPS-PERMIT',  5.0, 'HARD'),  # Business Permits (fixed)
                ('OPS-UTIL',   25.0, 'HARD'),  # Facility Utilities (major fixed cost)
                ('OPS-COMP',   15.0, 'HARD'),  # Compliance Costs (regulatory)
            ],
            'IT': [
                ('IT-HOST',    20.0, 'HARD'),  # Server Hosting
                ('IT-SW',      20.0, 'SOFT'),  # Software Licenses
                ('IT-CLOUD',   15.0, 'SOFT'),  # Cloud Subscriptions
                ('CAP-IT-HW',  20.0, 'SOFT'),  # Hardware Purchases (CAPEX)
                ('IT-SEC',     10.0, 'HARD'),  # Cybersecurity (critical)
                ('IT-DATA',     5.0, 'SOFT'),  # Data Tools
                ('IT-API',      5.0, 'SOFT'),  # API Subscription Fees
                ('IT-DOMAIN',   5.0, 'SOFT'),  # Domain Renewals
            ],
            'LOG': [
                ('LOG-SHIP',   25.0, 'SOFT'),  # Shipping Costs (largest variable)
                ('LOG-EQUIP',  20.0, 'SOFT'),  # Warehouse Equipment
                ('LOG-FUEL',   20.0, 'HARD'),  # Transport & Fuel (volatile)
                ('LOG-FREIGHT', 10.0, 'SOFT'), # Freight Fees
                ('LOG-DELIV',   8.0, 'SOFT'),  # Vendor Delivery Charges
                ('LOG-STOR',   10.0, 'SOFT'),  # Storage Fees
                ('LOG-PACK',    5.0, 'SOFT'),  # Packaging Materials
                ('LOG-SAFE',    2.0, 'SOFT'),  # Safety Gear
            ],
            'HR': [
                ('HR-RECRUIT', 25.0, 'HARD'),  # Recruitment
                ('HRM-TRN',    20.0, 'HARD'),  # Training (compliance critical)
                ('HR-ENGAGE',  15.0, 'HARD'),  # Engagement
                ('HR-POST',     5.0, 'SOFT'),  # Job Posting Fees
                ('HR-MED',     20.0, 'HARD'),  # Medical & Wellness (employee benefit)
                ('HR-CHECK',    5.0, 'HARD'),  # Background Checks (compliance)
                ('HR-SYS',     10.0, 'SOFT'),  # HR Systems/Payroll Software
            ],
            'FIN': [
                ('FIN-PROF',   60.0, 'HARD'),  # Professional Services (largest)
                ('FIN-AUDIT',  40.0, 'HARD'),  # Audit Fees (mandatory)
            ]
        }

        # --- EXECUTION ---

        # 1. Create Department Caps
        dept_count = 0
        for code, (pct, cap_type) in DEPT_CAPS.items():
            try:
                dept = Department.objects.get(code=code)
                obj, created = DepartmentBudgetCap.objects.update_or_create(
                    department=dept,
                    fiscal_year=fiscal_year,
                    defaults={
                        'percentage_of_total': pct,
                        'cap_type': cap_type,
                        'is_active': True
                    }
                )
                action = "Created" if created else "Updated"
                self.stdout.write(f"  {action} Dept Cap for {code}: {pct}% ({cap_type})")
                dept_count += 1
            except Department.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"  Dept {code} not found!"))

        # 2. Create Sub-Category Caps
        subcat_count = 0
        missing_categories = []
        
        for dept_code, caps in SUB_CAT_CAPS.items():
            try:
                dept = Department.objects.get(code=dept_code)
                
                for (cat_code, pct, cap_type) in caps:
                    try:
                        category = ExpenseCategory.objects.get(code=cat_code)
                        
                        obj, created = SubCategoryBudgetCap.objects.update_or_create(
                            expense_category=category,
                            department=dept,
                            fiscal_year=fiscal_year,
                            defaults={
                                'percentage_of_department': pct,
                                'cap_type': cap_type,
                                'is_active': True
                            }
                        )
                        action = "Created" if created else "Updated"
                        self.stdout.write(f"    {action} Sub-Cap for {cat_code}: {pct}% ({cap_type})")
                        subcat_count += 1
                        
                    except ExpenseCategory.DoesNotExist:
                        missing_categories.append(f"{dept_code}:{cat_code}")
                        self.stdout.write(self.style.WARNING(f"    Category {cat_code} not found (will be skipped)"))
                        
            except Department.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"  Dept {dept_code} not found during sub-cap seeding!"))

        # Summary
        self.stdout.write(self.style.SUCCESS(f'\n=== Seeding Complete ==='))
        self.stdout.write(self.style.SUCCESS(f'Department Caps: {dept_count}'))
        self.stdout.write(self.style.SUCCESS(f'Sub-Category Caps: {subcat_count}'))
        
        if missing_categories:
            self.stdout.write(self.style.WARNING(f'\nMissing Categories (not in database):'))
            for cat in missing_categories:
                self.stdout.write(f'  - {cat}')
            self.stdout.write(self.style.WARNING(f'Run controlled_seeder.py first to create all categories.'))