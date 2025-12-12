from django.core.management.base import BaseCommand
from core.models import Employee
import random

FIRST_NAMES = [
    'James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','William','Elizabeth',
    'David','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen',
    'Christopher','Nancy','Daniel','Lisa','Matthew','Betty','Anthony','Margaret','Donald','Sandra',
    'Mark','Ashley','Paul','Kimberly','Steven','Emily','Andrew','Donna','Kenneth','Michelle',
    'George','Dorothy','Joshua','Carol','Kevin','Amanda','Brian','Melissa','Edward','Deborah'
]

LAST_NAMES = [
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
    'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
    'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson'
]

MIDDLE_NAMES = [
    'Alexander','Benjamin','Christopher','Daniel','Ethan','Frederick','George','Harold','Isaac','Jacob',
    'Kenneth','Lawrence','Matthew','Nathaniel','Oliver','Patrick','Quentin','Robert','Samuel','Thomas',
    'Ulysses','Victor','William','Xavier','Yosef','Zachary','Marie','Louise','Ann','Rose'
]

SUFFIXES = [None, 'Jr.', 'Sr.', 'III']

# Restrict departments strictly to the three requested
DEPARTMENTS = ['IT Department', 'Asset Department', 'Budget Department']
ROLES = ['Employee', 'Ticket Coordinator', 'System Admin']
STATUSES = ['Pending', 'Approved', 'Denied']


def generate_company_id(existing_ids):
    # format MA0001 -> MA9999
    for _ in range(10000):
        num = random.randint(1, 9999)
        cid = f"MA{num:04d}"
        if cid not in existing_ids:
            existing_ids.add(cid)
            return cid
    raise RuntimeError('Exhausted company id space')


class Command(BaseCommand):
    help = 'Seed the database with 150 Employee users (gmail addresses).'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=150, help='Number of users to create')

    def handle(self, *args, **options):
        count = options['count']
        created = 0
        existing_emails = set(Employee.objects.values_list('email', flat=True))
        existing_company_ids = set(Employee.objects.values_list('company_id', flat=True))

        # Distribute roles roughly (total count will be --count)
        role_cycle = (['Employee'] * 80) + (['Ticket Coordinator'] * 40) + (['System Admin'] * 30)
        random.shuffle(role_cycle)

        i = 0
        while created < count:
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            # mostly include a full middle name (not initials); occasionally leave it blank
            middle = random.choice(MIDDLE_NAMES) if random.random() > 0.05 else ''
            # suffix optional; many users won't have one
            suffix = random.choice(SUFFIXES) if random.random() > 0.9 else ''

            # ensure unique email; use numbers to avoid collisions with existing company IDs
            base_email = f"{first.lower()}.{last.lower()}"
            email = base_email + '@gmail.com'
            suffix_num = 1
            while email in existing_emails:
                email = f"{base_email}{suffix_num}@gmail.com"
                suffix_num += 1

            # generate unique company id
            company_id = generate_company_id(existing_company_ids)

            department = DEPARTMENTS[created % len(DEPARTMENTS)]
            role = role_cycle[i % len(role_cycle)]
            status = random.choice(STATUSES)

            # password: set a default usable password 'Password123' (will be hashed)
            password = 'Password123'

            emp = Employee(
                first_name=first,
                last_name=last,
                middle_name=middle or None,
                suffix=suffix or None,
                email=email,
                company_id=company_id,
                department=department,
                role=role,
                status=status,
            )
            emp.set_password(password)
            try:
                emp.full_clean()
                emp.save()
                created += 1
                existing_emails.add(email)
                i += 1
                if created % 10 == 0:
                    self.stdout.write(self.style.SUCCESS(f'Created {created} users'))
            except Exception as e:
                self.stderr.write(f'Failed to create user {email}: {e}')

        self.stdout.write(self.style.SUCCESS(f'Finished creating {created} users'))
