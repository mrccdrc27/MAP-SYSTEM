# Attachment Viewing & PDF Conversion System

## Quick Start Setup Guide

This document provides step-by-step instructions to get the attachment viewing and PDF conversion system running.

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend   │ ──▶ │ workflow_api │ ──▶ │   helpdesk   │
│   (React)   │     │  (Port 8002) │     │  (Port 8000) │
└─────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Celery    │
                    │   Worker     │
                    │(PDF Convert) │
                    └──────────────┘
```

**Key Points:**
- **helpdesk** owns original attachment files
- **workflow_api** handles PDF conversion and caching
- Frontend never talks directly to helpdesk
- Conversions are async via Celery

---

## Step 1: Environment Configuration

### helpdesk (.env or environment)

```bash
# Service-to-service auth key (must match workflow_api)
INTERNAL_SERVICE_KEY=your-secure-key-here-change-in-production
```

### workflow_api (.env)

```bash
# Helpdesk service URL
DJANGO_HELPDESK_SERVICE_URL=http://localhost:8000

# Service-to-service auth key (must match helpdesk)
HELPDESK_SERVICE_KEY=your-secure-key-here-change-in-production

# PDF conversion settings
PDF_CONVERSION_MAX_FILE_SIZE=52428800  # 50MB
PDF_CONVERSION_TIMEOUT=120             # 2 minutes
PDF_CACHE_MAX_AGE_DAYS=30
PDF_CACHE_MAX_SIZE_GB=10

# Celery queue for PDF conversion
DJANGO_PDF_CONVERSION_QUEUE=pdf_conversion_queue
```

---

## Step 2: Install LibreOffice (Required for PDF conversion)

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install libreoffice-writer libreoffice-calc libreoffice-impress
```

### macOS
```bash
brew install --cask libreoffice
```

### Windows
Download from: https://www.libreoffice.org/download/download/

### Docker
Add to your Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
```

---

## Step 3: Database Migrations

### workflow_api
```bash
cd tts/workflow_api
python manage.py makemigrations attachments
python manage.py migrate
```

---

## Step 4: Start Celery Worker

The PDF conversion runs in a separate Celery worker:

```bash
cd tts/workflow_api
celery -A workflow_api worker --pool=solo --loglevel=info -Q pdf_conversion_queue
```

For multiple queues including PDF conversion:
```bash
celery -A workflow_api worker --pool=solo --loglevel=info \
  -Q pdf_conversion_queue,TICKET_TASKS_PRODUCTION,notification-queue-default
```

---

## Step 5: Test the Endpoints

### List Attachments
```bash
curl -X GET http://localhost:8002/api/tickets/TKT-2025-0001/attachments \
  -H "Authorization: Bearer <token>"
```

### View as PDF
```bash
curl -X GET http://localhost:8002/api/tickets/TKT-2025-0001/attachments/42/view \
  -H "Authorization: Bearer <token>"
```

**Response if conversion needed (202):**
```json
{
  "status": "processing",
  "message": "File is being converted to PDF",
  "poll_url": "/api/attachments/42/conversion-status",
  "estimated_wait_seconds": 15
}
```

### Check Conversion Status
```bash
curl -X GET http://localhost:8002/api/attachments/42/conversion-status \
  -H "Authorization: Bearer <token>"
```

### Download Original
```bash
curl -X GET http://localhost:8002/api/tickets/TKT-2025-0001/attachments/42/download \
  -H "Authorization: Bearer <token>" \
  -O
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets/{ticket}/attachments` | List all attachments |
| GET | `/api/tickets/{ticket}/attachments/{id}/view` | View as PDF |
| GET | `/api/tickets/{ticket}/attachments/{id}/download` | Download original |
| GET | `/api/attachments/{id}/conversion-status` | Poll conversion status |

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success (PDF ready or download) |
| 202 | Accepted (conversion in progress) |
| 404 | Attachment not found |
| 415 | Unsupported file type |
| 503 | Conversion failed |

---

## Frontend Integration

### Using the React Hook

```tsx
import { useAttachmentView } from './hooks/useAttachmentView';

function MyComponent({ ticketNumber, attachmentId }) {
  const { status, pdfUrl, viewAttachment, downloadAttachment } = 
    useAttachmentView(ticketNumber, attachmentId);

  return (
    <div>
      <button onClick={viewAttachment} disabled={status === 'loading'}>
        {status === 'loading' ? 'Loading...' : 'View PDF'}
      </button>
      
      {status === 'ready' && (
        <iframe src={pdfUrl} title="PDF Viewer" />
      )}
      
      <button onClick={downloadAttachment}>
        Download Original
      </button>
    </div>
  );
}
```

### Using the Component

```tsx
import { AttachmentList } from './components/AttachmentViewer';
import './styles/AttachmentViewer.css';

function TicketDetail({ ticket }) {
  return (
    <AttachmentList 
      ticketNumber={ticket.ticket_number}
      attachments={ticket.attachments}
    />
  );
}
```

---

## Cache Management

### Manual Cleanup
```bash
cd tts/workflow_api
python manage.py cleanup_pdf_cache --max-age-days=7 --dry-run
python manage.py cleanup_pdf_cache --max-age-days=7
```

### Scheduled Cleanup (Celery Beat)
Add to your periodic tasks:
```python
CELERY_BEAT_SCHEDULE = {
    'cleanup-pdf-cache-daily': {
        'task': 'attachments.tasks.cleanup_pdf_cache',
        'schedule': crontab(hour=3, minute=0),  # Run at 3 AM
        'kwargs': {'max_age_days': 30, 'max_size_gb': 10},
    },
}
```

---

## Supported File Types

| Category | Extensions |
|----------|------------|
| **Documents** | .pdf, .doc, .docx, .odt, .rtf, .txt |
| **Spreadsheets** | .xls, .xlsx, .ods, .csv |
| **Presentations** | .ppt, .pptx, .odp |
| **Images** | .jpg, .jpeg, .png, .gif, .bmp, .tiff, .webp |

Files not in this list will return `415 Unsupported Media Type` and can only be downloaded.

---

## Troubleshooting

### LibreOffice not found
```
ConversionError: LibreOffice not found at 'libreoffice'
```
**Solution:** Install LibreOffice or set `LIBREOFFICE_PATH` in settings.

### Conversion timeout
```
ConversionTimeoutError: Conversion timed out after 120 seconds
```
**Solution:** Increase `PDF_CONVERSION_TIMEOUT` for large files.

### Service key mismatch
```
403 Forbidden: Invalid service key
```
**Solution:** Ensure `INTERNAL_SERVICE_KEY` in helpdesk matches `HELPDESK_SERVICE_KEY` in workflow_api.

### Cache not invalidating
If old PDFs are served after source file changes, the content hash may not be computing correctly. Check that helpdesk is returning `X-Content-Hash` header.

---

## Files Created

### workflow_api
- `attachments/__init__.py`
- `attachments/apps.py`
- `attachments/models.py` - AttachmentPDFCache model
- `attachments/views.py` - REST API endpoints
- `attachments/urls.py` - URL routing
- `attachments/tasks.py` - Celery conversion tasks
- `attachments/services.py` - Helpdesk client
- `attachments/admin.py` - Django admin config
- `attachments/management/commands/cleanup_pdf_cache.py`

### helpdesk
- `core/views/internal_views.py` - Internal API endpoints

### frontend
- `src/hooks/useAttachmentView.ts` - React hook
- `src/components/AttachmentViewer.tsx` - React component
- `src/styles/AttachmentViewer.css` - Styles

### Documentation
- `ATTACHMENT_VIEW_CONVERSION_ARCHITECTURE.py` - Full architecture spec
- `ATTACHMENT_SETUP_GUIDE.md` - This file
