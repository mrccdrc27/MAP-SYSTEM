"""
Seed tickets with unique file attachments (Word, Excel, PDF, PNG).
Cloned from seed_tickets_open with attachment generation.
"""
import os
import io
import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.conf import settings
from django.utils import timezone

from core.models import Ticket, TicketAttachment, Employee


# ============================================================================
# Sample file generators - create unique content each time
# ============================================================================

def generate_sample_pdf(ticket_number: str, content_type: str = "report") -> tuple:
    """
    Generate a simple PDF file with unique content.
    Returns (filename, content_bytes, mime_type, file_size).
    """
    # Using a simple text-based PDF structure (minimal valid PDF)
    unique_id = uuid.uuid4().hex[:8]
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Create a basic valid PDF document
    pdf_content = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
50 750 Td
(Ticket Attachment: {ticket_number}) Tj
0 -20 Td
(Document Type: {content_type}) Tj
0 -20 Td
(Generated: {timestamp}) Tj
0 -20 Td
(Document ID: {unique_id}) Tj
0 -20 Td
(This is a sample PDF attachment for testing purposes.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000518 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
595
%%EOF"""
    
    content_bytes = pdf_content.encode('latin-1')
    filename = f"{content_type}_{ticket_number}_{unique_id}.pdf"
    
    return filename, content_bytes, "application/pdf", len(content_bytes)


def generate_sample_docx(ticket_number: str, doc_type: str = "memo") -> tuple:
    """
    Generate a simple DOCX file with unique content.
    Returns (filename, content_bytes, mime_type, file_size).
    
    DOCX is a ZIP archive with XML files inside.
    """
    import zipfile
    
    unique_id = uuid.uuid4().hex[:8]
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Create document.xml content
    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Ticket Attachment: {ticket_number}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Document Type: {doc_type}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Generated: {timestamp}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Document ID: {unique_id}</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>This is a sample Word document attachment for testing purposes.</w:t></w:r></w:p>
    <w:p><w:r><w:t>It contains unique identifiers to ensure each generated file is different.</w:t></w:r></w:p>
  </w:body>
</w:document>"""

    # Content types XML
    content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

    # Relationships XML
    rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    # Create the DOCX as a ZIP archive
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('[Content_Types].xml', content_types_xml)
        zf.writestr('_rels/.rels', rels_xml)
        zf.writestr('word/document.xml', document_xml)
    
    content_bytes = buffer.getvalue()
    filename = f"{doc_type}_{ticket_number}_{unique_id}.docx"
    
    return filename, content_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", len(content_bytes)


def generate_sample_xlsx(ticket_number: str, sheet_type: str = "data") -> tuple:
    """
    Generate a simple XLSX file with unique content.
    Returns (filename, content_bytes, mime_type, file_size).
    
    XLSX is also a ZIP archive with XML files inside.
    """
    import zipfile
    
    unique_id = uuid.uuid4().hex[:8]
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Create sheet1.xml content with some data
    sheet_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Ticket Number</t></is></c>
      <c r="B1" t="inlineStr"><is><t>{ticket_number}</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Sheet Type</t></is></c>
      <c r="B2" t="inlineStr"><is><t>{sheet_type}</t></is></c>
    </row>
    <row r="3">
      <c r="A3" t="inlineStr"><is><t>Generated</t></is></c>
      <c r="B3" t="inlineStr"><is><t>{timestamp}</t></is></c>
    </row>
    <row r="4">
      <c r="A4" t="inlineStr"><is><t>Document ID</t></is></c>
      <c r="B4" t="inlineStr"><is><t>{unique_id}</t></is></c>
    </row>
    <row r="5">
      <c r="A5" t="inlineStr"><is><t>Description</t></is></c>
      <c r="B5" t="inlineStr"><is><t>Sample Excel attachment for testing</t></is></c>
    </row>
    <row r="7">
      <c r="A7" t="inlineStr"><is><t>Item</t></is></c>
      <c r="B7" t="inlineStr"><is><t>Quantity</t></is></c>
      <c r="C7" t="inlineStr"><is><t>Cost</t></is></c>
    </row>
    <row r="8">
      <c r="A8" t="inlineStr"><is><t>Sample Item 1</t></is></c>
      <c r="B8"><v>{random.randint(1, 100)}</v></c>
      <c r="C8"><v>{random.randint(100, 5000)}</v></c>
    </row>
    <row r="9">
      <c r="A9" t="inlineStr"><is><t>Sample Item 2</t></is></c>
      <c r="B9"><v>{random.randint(1, 100)}</v></c>
      <c r="C9"><v>{random.randint(100, 5000)}</v></c>
    </row>
  </sheetData>
</worksheet>"""

    # Workbook XML
    workbook_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>"""

    # Content types XML
    content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>"""

    # Root relationships
    rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

    # Workbook relationships
    workbook_rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>"""

    # Create the XLSX as a ZIP archive
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('[Content_Types].xml', content_types_xml)
        zf.writestr('_rels/.rels', rels_xml)
        zf.writestr('xl/workbook.xml', workbook_xml)
        zf.writestr('xl/_rels/workbook.xml.rels', workbook_rels_xml)
        zf.writestr('xl/worksheets/sheet1.xml', sheet_xml)
    
    content_bytes = buffer.getvalue()
    filename = f"{sheet_type}_{ticket_number}_{unique_id}.xlsx"
    
    return filename, content_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", len(content_bytes)


def generate_sample_png(ticket_number: str, image_type: str = "screenshot") -> tuple:
    """
    Generate a simple PNG image with unique content.
    Returns (filename, content_bytes, mime_type, file_size).
    
    Creates a simple colored PNG with embedded text pattern.
    """
    import struct
    import zlib
    
    unique_id = uuid.uuid4().hex[:8]
    
    # Image dimensions
    width = 400
    height = 200
    
    # Generate a unique color based on the ticket number hash
    color_seed = hash(ticket_number + unique_id) & 0xFFFFFF
    r = (color_seed >> 16) & 0xFF
    g = (color_seed >> 8) & 0xFF
    b = color_seed & 0xFF
    
    # Ensure minimum brightness
    if r + g + b < 300:
        r = min(255, r + 100)
        g = min(255, g + 100)
        b = min(255, b + 100)
    
    # Create raw image data (RGB with filter byte for each row)
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # Filter type: None
        for x in range(width):
            # Create a gradient/pattern effect
            gradient = int((x / width) * 50)
            row_r = min(255, r + gradient)
            row_g = min(255, g + gradient)
            row_b = min(255, b + gradient)
            
            # Add some variation based on position
            if (x + y) % 20 < 10:
                row_r = max(0, row_r - 30)
                row_g = max(0, row_g - 30)
                row_b = max(0, row_b - 30)
            
            raw_data += bytes([row_r, row_g, row_b])
    
    def create_png_chunk(chunk_type: bytes, data: bytes) -> bytes:
        """Create a PNG chunk with CRC."""
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)
    
    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk (image header)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)  # 8-bit depth, RGB color
    ihdr_chunk = create_png_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk (compressed image data)
    compressed_data = zlib.compress(raw_data, 9)
    idat_chunk = create_png_chunk(b'IDAT', compressed_data)
    
    # IEND chunk (image end)
    iend_chunk = create_png_chunk(b'IEND', b'')
    
    # Combine all chunks
    content_bytes = png_signature + ihdr_chunk + idat_chunk + iend_chunk
    filename = f"{image_type}_{ticket_number}_{unique_id}.png"
    
    return filename, content_bytes, "image/png", len(content_bytes)


# ============================================================================
# File type configurations
# ============================================================================

FILE_GENERATORS = {
    'pdf': {
        'generator': generate_sample_pdf,
        'types': ['report', 'invoice', 'receipt', 'approval', 'request_form', 'specification'],
    },
    'docx': {
        'generator': generate_sample_docx,
        'types': ['memo', 'letter', 'proposal', 'minutes', 'policy', 'procedure'],
    },
    'xlsx': {
        'generator': generate_sample_xlsx,
        'types': ['data', 'budget', 'inventory', 'schedule', 'tracking', 'summary'],
    },
    'png': {
        'generator': generate_sample_png,
        'types': ['screenshot', 'diagram', 'photo', 'chart', 'evidence', 'reference'],
    },
}


# ============================================================================
# Ticket data configurations (from seed_tickets_open)
# ============================================================================

CATEGORY_CHOICES = [
    'IT Support', 'Asset Check In', 'Asset Check Out', 'New Budget Proposal', 'Others'
]

IT_SUBCATS = [
    'Technical Assistance',
    'Software Installation/Update',
    'Hardware Troubleshooting',
    'Email/Account Access Issue',
    'Internet/Network Connectivity Issue',
    'Printer/Scanner Setup or Issue',
    'System Performance Issue',
    'Virus/Malware Check',
    'IT Consultation Request',
    'Data Backup/Restore',
]

DEVICE_TYPES = ['Laptop', 'Printer', 'Projector', 'Monitor', 'Other']

ASSET_NAMES = {
    'Laptop': ['Dell Latitude 5420', 'HP ProBook 450 G9', 'Lenovo ThinkPad X1'],
    'Printer': ['HP LaserJet Pro M404dn', 'Canon imageCLASS MF445dw'],
    'Projector': ['Epson PowerLite 2247U', 'BenQ MH535A'],
    'Mouse': ['Logitech MX Master 3', 'Microsoft Surface Mouse'],
    'Keyboard': ['Logitech K380', 'Microsoft Ergonomic Keyboard'],
}

LOCATIONS = [
    'Main Office - 1st Floor',
    'Main Office - 2nd Floor',
    'Main Office - 3rd Floor',
    'Branch Office - North',
    'Branch Office - South',
    'Warehouse',
    'Remote/Home Office',
]

BUDGET_SUBCATS = [
    'Capital Expenses (CapEx)',
    'Operational Expenses (OpEx)',
    'Reimbursement Claim (Liabilities)',
    'Charging Department (Cost Center)'
]

COST_ELEMENTS = {
    'Capital Expenses (CapEx)': ['Equipment', 'Software', 'Furniture'],
    'Operational Expenses (OpEx)': ['Utilities', 'Supplies', 'IT Services', 'Software Subscriptions'],
    'Reimbursement Claim (Liabilities)': ['Payable', 'Loans'],
    'Charging Department (Cost Center)': ['IT Operations', 'System Development', 'Infrastructure & Equipment', 'Training and Seminars'],
}

PRIORITIES = ['Critical', 'High', 'Medium', 'Low']


class Command(BaseCommand):
    help = 'Seed tickets with unique file attachments (Word, Excel, PDF, PNG)'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Number of tickets to create')
        parser.add_argument('--min-attachments', type=int, default=2, help='Minimum attachments per ticket')
        parser.add_argument('--max-attachments', type=int, default=4, help='Maximum attachments per ticket')
        parser.add_argument('--status', type=str, default='Open', choices=['New', 'Open'], help='Status for created tickets')

    def generate_random_attachments(self, ticket: Ticket, min_count: int, max_count: int) -> list:
        """
        Generate random attachments for a ticket.
        Ensures at least 2 different file types.
        """
        # Determine how many attachments
        num_attachments = random.randint(min_count, max_count)
        
        # Ensure we use at least 2 different file types
        file_types = list(FILE_GENERATORS.keys())
        selected_types = random.sample(file_types, min(2, len(file_types)))
        
        # Fill remaining slots with random types
        while len(selected_types) < num_attachments:
            selected_types.append(random.choice(file_types))
        
        # Shuffle to randomize order
        random.shuffle(selected_types)
        
        created_attachments = []
        
        for file_type in selected_types:
            config = FILE_GENERATORS[file_type]
            generator = config['generator']
            doc_type = random.choice(config['types'])
            
            # Generate the file
            filename, content_bytes, mime_type, file_size = generator(
                ticket.ticket_number or f"TKT{ticket.id}",
                doc_type
            )
            
            # Create Django file object
            content_file = ContentFile(content_bytes, name=filename)
            
            # Create the TicketAttachment
            attachment = TicketAttachment.objects.create(
                ticket=ticket,
                file=content_file,
                file_name=filename,
                file_type=mime_type,
                file_size=file_size,
                uploaded_by=ticket.employee  # May be None for external users
            )
            
            created_attachments.append(attachment)
            self.stdout.write(f"    + {filename} ({file_size} bytes)")
        
        return created_attachments

    def handle(self, *args, **options):
        count = options['count']
        min_attachments = options['min_attachments']
        max_attachments = options['max_attachments']
        target_status = options['status']
        
        employees = list(Employee.objects.all())
        if not employees:
            self.stderr.write(self.style.ERROR(
                'No employees found. Please run: python manage.py seed_employees'
            ))
            return

        self.stdout.write(self.style.NOTICE(
            f'Creating {count} tickets with {min_attachments}-{max_attachments} attachments each...'
        ))

        created = 0
        total_attachments = 0
        
        for i in range(count):
            category = random.choice(CATEGORY_CHOICES)
            employee = random.choice(employees)
            ticket_kwargs = {}
            
            # Build descriptive subject
            descriptor = ''
            if category == 'IT Support':
                descriptor = random.choice(IT_SUBCATS)
            elif category in ('Asset Check In', 'Asset Check Out'):
                descriptor = random.choice(list(ASSET_NAMES.keys()))
            elif category == 'New Budget Proposal':
                descriptor = random.choice(BUDGET_SUBCATS)
            else:
                descriptor = 'General Inquiry'

            subject = f"{category} - {descriptor} ({employee.company_id}) {datetime.now().strftime('%Y%m%d%H%M%S%f')}"
            description = f"This is a seeded ticket for {category} with file attachments. Details autogenerated for testing."

            ticket_kwargs['subject'] = subject
            ticket_kwargs['description'] = description
            ticket_kwargs['employee'] = employee

            # Category-specific fields
            if category == 'IT Support':
                sub = random.choice(IT_SUBCATS)
                ticket_kwargs['category'] = 'IT Support'
                ticket_kwargs['sub_category'] = sub
                device = random.choice(DEVICE_TYPES)
                ticket_kwargs['dynamic_data'] = {'device_type': device}
                if device in ASSET_NAMES:
                    asset = random.choice(ASSET_NAMES[device])
                    ticket_kwargs['asset_name'] = asset
                    ticket_kwargs['serial_number'] = f"SN-{abs(hash(asset)) % 1000000:06d}"
                ticket_kwargs['department'] = 'IT Department'
                ticket_kwargs['priority'] = random.choice(PRIORITIES) if random.random() < 0.5 else None
                ticket_kwargs['location'] = random.choice(LOCATIONS)

            elif category in ('Asset Check In', 'Asset Check Out'):
                ticket_kwargs['category'] = category
                product = random.choice(list(ASSET_NAMES.keys()))
                ticket_kwargs['sub_category'] = product
                ticket_kwargs['asset_name'] = random.choice(ASSET_NAMES.get(product, []))
                ticket_kwargs['serial_number'] = f"SN-{random.randint(100000,999999)}"
                ticket_kwargs['department'] = 'Asset Department'
                if category == 'Asset Check Out':
                    days = random.randint(1, 60)
                    exp = datetime.now() + timedelta(days=days)
                    ticket_kwargs['expected_return_date'] = exp.date()

            elif category == 'New Budget Proposal':
                ticket_kwargs['category'] = 'New Budget Proposal'
                sub = random.choice(BUDGET_SUBCATS)
                ticket_kwargs['sub_category'] = sub
                if random.random() < 0.7:
                    ce = random.choice(COST_ELEMENTS.get(sub, []))
                    ticket_kwargs['cost_items'] = {'cost_element': ce}
                    val = Decimal(str(round(random.uniform(1000, 500000), 2))).quantize(
                        Decimal('0.01'), rounding=ROUND_HALF_UP
                    )
                    ticket_kwargs['requested_budget'] = val
                ticket_kwargs['department'] = 'Budget Department'
                start = datetime.now().date()
                end = start + timedelta(days=random.randint(30, 365))
                ticket_kwargs['performance_start_date'] = start
                ticket_kwargs['performance_end_date'] = end

            else:
                ticket_kwargs['category'] = 'Others'
                ticket_kwargs['sub_category'] = None
                ticket_kwargs['department'] = None

            # Set priority and department
            ticket_kwargs['priority'] = random.choice(PRIORITIES)
            if not ticket_kwargs.get('department'):
                if ticket_kwargs['category'] == 'IT Support':
                    ticket_kwargs['department'] = 'IT Department'
                elif ticket_kwargs['category'] in ('Asset Check In', 'Asset Check Out'):
                    ticket_kwargs['department'] = 'Asset Department'
                elif ticket_kwargs['category'] == 'New Budget Proposal':
                    ticket_kwargs['department'] = 'Budget Department'
                else:
                    ticket_kwargs['department'] = random.choice([
                        'IT Department', 'Asset Department', 'Budget Department'
                    ])

            # Scheduled date
            if random.random() < 0.3:
                ticket_kwargs['scheduled_date'] = datetime.now().date() + timedelta(
                    days=random.randint(0, 30)
                )

            # Create the ticket
            try:
                # Create with 'New' status first
                ticket = Ticket(**ticket_kwargs, status='New')
                ticket.full_clean()
                ticket.save()
                
                self.stdout.write(f"  Ticket #{ticket.ticket_number} ({category})")
                
                # Generate and attach files
                attachments = self.generate_random_attachments(
                    ticket, min_attachments, max_attachments
                )
                total_attachments += len(attachments)
                
                # Update to target status if needed
                if target_status == 'Open':
                    ticket.status = 'Open'
                    ticket.save()
                
                created += 1
                
            except Exception as e:
                self.stderr.write(self.style.ERROR(
                    f'Failed to create ticket #{i+1}: {e}'
                ))
                import traceback
                traceback.print_exc()

        self.stdout.write(self.style.SUCCESS(
            f'\nFinished: Created {created} tickets with {total_attachments} total attachments'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'Attachments saved to: {settings.MEDIA_ROOT}/ticket_attachments/'
        ))
