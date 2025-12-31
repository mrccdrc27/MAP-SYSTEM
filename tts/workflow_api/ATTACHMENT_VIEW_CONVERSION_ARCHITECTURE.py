"""
===============================================================================
ATTACHMENT VIEWING & CONVERSION SYSTEM ARCHITECTURE
===============================================================================

System Design Document for TTS Ticket Tracking System
Version: 1.0.0
Date: December 2025

This document defines the architecture for secure attachment viewing and
PDF conversion across the helpdesk → workflow_api → frontend integration.

===============================================================================
TABLE OF CONTENTS
===============================================================================

1. HIGH-LEVEL ARCHITECTURE
2. SERVICE RESPONSIBILITIES & OWNERSHIP BOUNDARIES
3. DATA MODELS
4. API CONTRACTS
5. DETAILED FLOWS
6. CONVERSION STRATEGY
7. FRONTEND INTERACTION PATTERNS
8. NON-GOALS & ANTI-PATTERNS
9. IMPLEMENTATION EXAMPLES

===============================================================================
1. HIGH-LEVEL ARCHITECTURE
===============================================================================

                    ┌─────────────────────────────────────────────────────────┐
                    │                      FRONTEND                           │
                    │                   (React/Vite)                          │
                    │                                                         │
                    │  Requests:                                              │
                    │  • GET /api/tickets/{id}/attachments/{att_id}/view      │
                    │  • GET /api/tickets/{id}/attachments/{att_id}/download  │
                    │  • GET /api/attachments/{att_id}/conversion-status      │
                    └────────────────────────┬────────────────────────────────┘
                                             │
                                             ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                          WORKFLOW_API (Port 8002)                        │
    │                      "Orchestration & Caching Layer"                     │
    │                                                                          │
    │  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────────┐ │
    │  │  Attachment    │  │  PDF Conversion │  │  AttachmentPDFCache Model  │ │
    │  │  Views         │  │  Worker (Celery)│  │  (Stores derived PDFs)     │ │
    │  │                │  │                 │  │                             │ │
    │  │  - view        │  │  - fetch_file() │  │  - original_attachment_id  │ │
    │  │  - download    │  │  - convert()    │  │  - pdf_file                │ │
    │  │  - status      │  │  - store()      │  │  - conversion_status       │ │
    │  └────────────────┘  └────────────────┘  │  - original_file_hash      │ │
    │                                           └─────────────────────────────┘ │
    └──────────────────────────────────┬───────────────────────────────────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     │                 │                 │
                     ▼                 ▼                 ▼
    ┌────────────────────┐  ┌──────────────┐  ┌─────────────────────────────────┐
    │    HELPDESK        │  │   RABBITMQ   │  │     PDF STORAGE                 │
    │   (Port 8000)      │  │              │  │   (workflow_api/media/pdf_cache)│
    │                    │  │  Queues:     │  │                                 │
    │  Original Files:   │  │  - convert_q │  │  Cached PDF conversions         │
    │  • TicketAttachment│  │              │  │  organized by attachment ID     │
    │  • /api/media/...  │  │              │  │                                 │
    └────────────────────┘  └──────────────┘  └─────────────────────────────────┘


DESIGN PRINCIPLES:
─────────────────────────────────────────────────────────────────────────────────
1. SINGLE SOURCE OF TRUTH: helpdesk owns all original files
2. DERIVED VIEWS: PDFs are generated copies, never replacements
3. LAZY CONVERSION: Convert on first view request, cache for reuse
4. ASYNC PROCESSING: Non-blocking conversion via Celery
5. FRONTEND ABSTRACTION: workflow_api hides helpdesk internals completely
6. CACHE INVALIDATION: Hash-based detection of source file changes


===============================================================================
2. SERVICE RESPONSIBILITIES & OWNERSHIP BOUNDARIES
===============================================================================
"""

SERVICE_RESPONSIBILITIES = {
    "helpdesk": {
        "port": 8000,
        "role": "Source of Truth for Attachments",
        "owns": [
            "TicketAttachment model",
            "Original file storage (media/ticket_attachments/)",
            "File upload endpoints",
            "Direct media serving for internal access",
        ],
        "provides_to_workflow_api": [
            "GET /api/attachments/<id>/file - Returns file binary + metadata",
            "GET /api/attachments/<id>/metadata - Returns file info without binary",
            "Authentication via service API key (X-Service-Key header)",
        ],
        "does_NOT_do": [
            "PDF conversion",
            "Caching derived views",
            "Serving files to frontend directly",
        ]
    },
    
    "workflow_api": {
        "port": 8002,
        "role": "Orchestration, Conversion, and Frontend Gateway",
        "owns": [
            "AttachmentPDFCache model",
            "PDF file storage (media/pdf_cache/)",
            "Conversion worker and queue",
            "All frontend-facing attachment endpoints",
        ],
        "provides_to_frontend": [
            "GET /api/tickets/{id}/attachments/{att_id}/view - PDF view (browser)",
            "GET /api/tickets/{id}/attachments/{att_id}/download - Original file",
            "GET /api/attachments/{att_id}/conversion-status - Status polling",
        ],
        "does_NOT_do": [
            "Store original files",
            "Expose helpdesk URLs to frontend",
            "Frontend-initiated conversion",
        ]
    },
    
    "conversion_worker": {
        "runs_in": "workflow_api Celery worker",
        "queue": "pdf_conversion_queue",
        "role": "Async PDF Generation",
        "owns": [
            "Fetching files from helpdesk securely",
            "LibreOffice/unoconv conversion calls",
            "Storing generated PDFs to cache",
            "Retry logic and failure handling",
        ],
        "sandboxing": [
            "File size limits (configurable, default 50MB)",
            "Timeout per conversion (configurable, default 120s)",
            "Temp directory isolation",
            "Non-executable output",
        ]
    }
}


"""
===============================================================================
3. DATA MODELS
===============================================================================
"""

# ─────────────────────────────────────────────────────────────────────────────
# HELPDESK: Existing Model (DO NOT MODIFY)
# ─────────────────────────────────────────────────────────────────────────────
HELPDESK_TICKET_ATTACHMENT_MODEL = """
class TicketAttachment(models.Model):
    ticket = models.ForeignKey('Ticket', on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='ticket_attachments/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)  # MIME type
    file_size = models.IntegerField()  # Size in bytes
    upload_date = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    # NEW: Add hash for change detection
    content_hash = models.CharField(max_length=64, blank=True, null=True, db_index=True,
                                    help_text="SHA-256 hash of file content for change detection")
"""

# ─────────────────────────────────────────────────────────────────────────────
# WORKFLOW_API: New Model
# ─────────────────────────────────────────────────────────────────────────────
WORKFLOW_API_ATTACHMENT_PDF_CACHE_MODEL = """
from django.db import models
from django.utils import timezone


class AttachmentPDFCache(models.Model):
    '''
    Stores PDF conversions of ticket attachments for browser viewing.
    This is a CACHE of derived content - original files remain in helpdesk.
    '''
    
    class ConversionStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        NOT_SUPPORTED = 'not_supported', 'File type not supported'
        PASSTHROUGH = 'passthrough', 'Original is already PDF'
    
    # Reference to helpdesk attachment (we don't store the file itself)
    helpdesk_attachment_id = models.IntegerField(db_index=True, unique=True)
    ticket_number = models.CharField(max_length=64, db_index=True)
    
    # Original file metadata (cached for display purposes)
    original_file_name = models.CharField(max_length=255)
    original_file_type = models.CharField(max_length=100)
    original_file_size = models.IntegerField()
    original_content_hash = models.CharField(max_length=64, db_index=True,
                                              help_text="Hash of original file for invalidation")
    
    # Conversion state
    status = models.CharField(max_length=20, choices=ConversionStatus.choices, 
                              default=ConversionStatus.PENDING, db_index=True)
    error_message = models.TextField(blank=True, null=True)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    
    # Converted PDF file (stored locally in workflow_api)
    pdf_file = models.FileField(upload_to='pdf_cache/', blank=True, null=True)
    pdf_file_size = models.IntegerField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    conversion_started_at = models.DateTimeField(blank=True, null=True)
    conversion_completed_at = models.DateTimeField(blank=True, null=True)
    
    # Cache control
    last_accessed_at = models.DateTimeField(default=timezone.now)
    access_count = models.IntegerField(default=0)
    
    class Meta:
        indexes = [
            models.Index(fields=['helpdesk_attachment_id']),
            models.Index(fields=['ticket_number']),
            models.Index(fields=['status']),
            models.Index(fields=['original_content_hash']),
            models.Index(fields=['last_accessed_at']),
        ]
        verbose_name = 'Attachment PDF Cache'
        verbose_name_plural = 'Attachment PDF Caches'
    
    def __str__(self):
        return f"PDFCache({self.helpdesk_attachment_id}) - {self.status}"
    
    def is_valid(self, current_hash: str) -> bool:
        '''Check if cached PDF is still valid (source hasn't changed)'''
        if self.status != self.ConversionStatus.COMPLETED:
            return False
        return self.original_content_hash == current_hash
    
    def can_retry(self) -> bool:
        '''Check if failed conversion can be retried'''
        return self.status == self.ConversionStatus.FAILED and self.retry_count < self.max_retries
    
    def mark_accessed(self):
        '''Update access statistics'''
        self.last_accessed_at = timezone.now()
        self.access_count += 1
        self.save(update_fields=['last_accessed_at', 'access_count'])
"""


"""
===============================================================================
4. API CONTRACTS
===============================================================================
"""

API_CONTRACTS = {
    # ─────────────────────────────────────────────────────────────────────────
    # HELPDESK INTERNAL API (Called by workflow_api, NOT exposed to frontend)
    # ─────────────────────────────────────────────────────────────────────────
    "helpdesk": {
        "get_attachment_metadata": {
            "endpoint": "GET /api/internal/attachments/{attachment_id}/metadata",
            "auth": "X-Service-Key header",
            "purpose": "Get attachment metadata without downloading file",
            "response": {
                "id": 42,
                "ticket_id": 123,
                "ticket_number": "TKT-2025-001234",
                "file_name": "document.docx",
                "file_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "file_size": 245678,
                "content_hash": "sha256:abc123...",
                "upload_date": "2025-12-30T10:30:00Z",
            }
        },
        
        "get_attachment_file": {
            "endpoint": "GET /api/internal/attachments/{attachment_id}/file",
            "auth": "X-Service-Key header",
            "purpose": "Download original file binary",
            "response_headers": {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": 'attachment; filename="document.docx"',
                "Content-Length": "245678",
                "X-Content-Hash": "sha256:abc123...",
            },
            "response_body": "<binary file content>"
        }
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # WORKFLOW_API PUBLIC API (Exposed to frontend)
    # ─────────────────────────────────────────────────────────────────────────
    "workflow_api": {
        "view_attachment": {
            "endpoint": "GET /api/tickets/{ticket_number}/attachments/{attachment_id}/view",
            "auth": "Bearer JWT token",
            "purpose": "View attachment as PDF in browser",
            "query_params": {
                "force_refresh": "boolean, optional - Force re-conversion even if cached"
            },
            "responses": {
                200: {
                    "description": "PDF ready - returns PDF binary",
                    "headers": {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": 'inline; filename="document.pdf"',
                        "X-Conversion-Source": "cache|fresh|passthrough"
                    },
                    "body": "<PDF binary>"
                },
                202: {
                    "description": "Conversion in progress",
                    "body": {
                        "status": "processing",
                        "message": "File is being converted to PDF",
                        "poll_url": "/api/attachments/42/conversion-status",
                        "estimated_wait_seconds": 15
                    }
                },
                404: {
                    "description": "Attachment not found",
                    "body": {"error": "Attachment not found"}
                },
                415: {
                    "description": "Unsupported file type for PDF conversion",
                    "body": {
                        "status": "not_supported",
                        "message": "This file type cannot be converted to PDF",
                        "supported_types": ["pdf", "docx", "xlsx", "pptx", "doc", "xls", "ppt", "txt", "csv", "rtf", "odt", "ods", "odp", "jpg", "jpeg", "png", "gif", "bmp", "tiff"],
                        "download_url": "/api/tickets/TKT-2025-001234/attachments/42/download"
                    }
                },
                503: {
                    "description": "Conversion failed after retries",
                    "body": {
                        "status": "failed",
                        "message": "PDF conversion failed",
                        "error_code": "CONVERSION_TIMEOUT",
                        "download_url": "/api/tickets/TKT-2025-001234/attachments/42/download"
                    }
                }
            }
        },
        
        "download_attachment": {
            "endpoint": "GET /api/tickets/{ticket_number}/attachments/{attachment_id}/download",
            "auth": "Bearer JWT token",
            "purpose": "Download original file",
            "responses": {
                200: {
                    "description": "Original file binary",
                    "headers": {
                        "Content-Type": "<original mime type>",
                        "Content-Disposition": 'attachment; filename="original_filename.ext"',
                        "Content-Length": "<file size>"
                    },
                    "body": "<original file binary>"
                },
                404: {"body": {"error": "Attachment not found"}}
            }
        },
        
        "get_conversion_status": {
            "endpoint": "GET /api/attachments/{attachment_id}/conversion-status",
            "auth": "Bearer JWT token",
            "purpose": "Poll conversion progress (for async UI)",
            "responses": {
                200: {
                    "body": {
                        "status": "pending|processing|completed|failed|not_supported|passthrough",
                        "progress_percent": 75,  # Optional, if trackable
                        "message": "Converting page 3 of 5",
                        "created_at": "2025-12-30T10:30:00Z",
                        "started_at": "2025-12-30T10:30:05Z",
                        "completed_at": None,  # null if not done
                        "error_message": None,  # null if no error
                        "retry_count": 0,
                        "view_url": "/api/tickets/TKT-2025-001234/attachments/42/view",  # When ready
                        "download_url": "/api/tickets/TKT-2025-001234/attachments/42/download"
                    }
                }
            }
        },
        
        "list_ticket_attachments": {
            "endpoint": "GET /api/tickets/{ticket_number}/attachments",
            "auth": "Bearer JWT token",
            "purpose": "List all attachments for a ticket with conversion status",
            "responses": {
                200: {
                    "body": {
                        "attachments": [
                            {
                                "id": 42,
                                "file_name": "document.docx",
                                "file_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                "file_size": 245678,
                                "file_size_display": "240 KB",
                                "upload_date": "2025-12-30T10:30:00Z",
                                "can_preview": True,
                                "preview_status": "completed",  # pending|processing|completed|failed|not_supported
                                "view_url": "/api/tickets/TKT-2025-001234/attachments/42/view",
                                "download_url": "/api/tickets/TKT-2025-001234/attachments/42/download"
                            }
                        ]
                    }
                }
            }
        }
    }
}


"""
===============================================================================
5. DETAILED FLOWS
===============================================================================
"""

FLOW_FIRST_TIME_VIEW = """
┌──────────────────────────────────────────────────────────────────────────────┐
│                    FIRST-TIME VIEW REQUEST FLOW                              │
└──────────────────────────────────────────────────────────────────────────────┘

User clicks "View" button for an attachment they've never viewed before.

SEQUENCE:

1. Frontend                                    
   │
   │ GET /api/tickets/TKT-2025-001234/attachments/42/view
   │ Authorization: Bearer <jwt>
   ▼
2. workflow_api: AttachmentViewEndpoint
   │
   ├─► Check AttachmentPDFCache for attachment_id=42
   │   └─► NOT FOUND or INVALID (hash mismatch)
   │
   ├─► Fetch metadata from helpdesk (async-safe, cached in request)
   │   │
   │   │ GET http://helpdesk:8000/api/internal/attachments/42/metadata
   │   │ X-Service-Key: <service_key>
   │   │
   │   └─► Response: {file_name, file_type, file_size, content_hash}
   │
   ├─► Check if file_type is convertible
   │   └─► IF NOT: Return 415 Unsupported Media Type
   │
   ├─► IF file_type == "application/pdf":
   │   │   (No conversion needed - passthrough)
   │   │
   │   ├─► Create AttachmentPDFCache(status=PASSTHROUGH)
   │   ├─► Stream file directly from helpdesk
   │   └─► Return 200 with PDF binary (Content-Disposition: inline)
   │
   ├─► ELSE (conversion needed):
   │   │
   │   ├─► Create AttachmentPDFCache(status=PENDING)
   │   │
   │   ├─► Enqueue Celery task: convert_attachment_to_pdf.delay(
   │   │       attachment_id=42,
   │   │       cache_id=<new_cache_id>,
   │   │       helpdesk_file_url="http://helpdesk:8000/api/internal/attachments/42/file"
   │   │   )
   │   │
   │   └─► Return 202 Accepted:
   │       {
   │           "status": "processing",
   │           "message": "File is being converted to PDF",
   │           "poll_url": "/api/attachments/42/conversion-status",
   │           "estimated_wait_seconds": 15
   │       }
   │
   ▼
3. Celery Worker: convert_attachment_to_pdf task
   │
   ├─► Update cache: status=PROCESSING, conversion_started_at=now()
   │
   ├─► Fetch file from helpdesk:
   │   │
   │   │ GET http://helpdesk:8000/api/internal/attachments/42/file
   │   │ X-Service-Key: <service_key>
   │   │
   │   └─► Save to temp file: /tmp/conversions/<uuid>/document.docx
   │
   ├─► Validate file:
   │   ├─► Check file size <= MAX_CONVERSION_SIZE (50MB)
   │   ├─► Verify MIME type matches expected
   │   └─► IF INVALID: Raise ConversionError
   │
   ├─► Convert using LibreOffice:
   │   │
   │   │ libreoffice --headless --convert-to pdf --outdir /tmp/conversions/<uuid>/ document.docx
   │   │ (with timeout: 120 seconds)
   │   │
   │   └─► Output: /tmp/conversions/<uuid>/document.pdf
   │
   ├─► Store PDF:
   │   ├─► Move to media/pdf_cache/<attachment_id>_<hash>.pdf
   │   ├─► Update cache: pdf_file=path, pdf_file_size=size
   │   └─► Update cache: status=COMPLETED, conversion_completed_at=now()
   │
   └─► Cleanup temp files
   │
   ▼
4. Frontend (polling conversion-status):
   │
   │ GET /api/attachments/42/conversion-status
   │
   └─► Response: {"status": "completed", "view_url": "..."}
   │
   ▼
5. Frontend:
   │
   │ GET /api/tickets/TKT-2025-001234/attachments/42/view
   │
   └─► workflow_api returns cached PDF (200 OK, application/pdf)
"""


FLOW_CACHED_VIEW = """
┌──────────────────────────────────────────────────────────────────────────────┐
│                       CACHED VIEW REQUEST FLOW                               │
└──────────────────────────────────────────────────────────────────────────────┘

User views an attachment that was previously converted and cached.

SEQUENCE:

1. Frontend
   │
   │ GET /api/tickets/TKT-2025-001234/attachments/42/view
   ▼
2. workflow_api: AttachmentViewEndpoint
   │
   ├─► Lookup AttachmentPDFCache(helpdesk_attachment_id=42)
   │   └─► FOUND with status=COMPLETED
   │
   ├─► (Optional) Quick hash validation:
   │   │
   │   │ GET http://helpdesk:8000/api/internal/attachments/42/metadata
   │   │ (Can be cached for N minutes to reduce calls)
   │   │
   │   ├─► IF hash matches: Cache is valid
   │   └─► IF hash differs: Invalidate cache, start new conversion (→ First-time flow)
   │
   ├─► Update access stats: cache.mark_accessed()
   │
   └─► Return 200 with cached PDF:
       │
       │ Content-Type: application/pdf
       │ Content-Disposition: inline; filename="document.pdf"
       │ X-Conversion-Source: cache
       │
       └─► <PDF binary from media/pdf_cache/>

LATENCY: ~50-100ms (cache hit, no conversion)
"""


FLOW_CONVERSION_FAILURE = """
┌──────────────────────────────────────────────────────────────────────────────┐
│                      CONVERSION FAILURE FLOW                                 │
└──────────────────────────────────────────────────────────────────────────────┘

A file fails to convert (corrupt, too complex, timeout, etc.)

SEQUENCE:

1. Celery Worker: convert_attachment_to_pdf task
   │
   ├─► Fetch file from helpdesk: SUCCESS
   │
   ├─► Attempt conversion:
   │   │
   │   │ libreoffice --headless --convert-to pdf ...
   │   │
   │   └─► FAILURE: Process timed out after 120s
   │
   ├─► Check retry count:
   │   │
   │   ├─► IF retry_count < max_retries:
   │   │   ├─► Increment retry_count
   │   │   ├─► Update cache: error_message="Timeout on attempt 1"
   │   │   └─► Re-queue task with exponential backoff:
   │   │       convert_attachment_to_pdf.apply_async(
   │   │           args=[...],
   │   │           countdown=30 * (2 ** retry_count)  # 30s, 60s, 120s
   │   │       )
   │   │
   │   └─► IF retry_count >= max_retries:
   │       ├─► Update cache: status=FAILED
   │       ├─► Update cache: error_message="Conversion failed after 3 attempts: Timeout"
   │       └─► (Optional) Send notification to ops team
   │
   └─► Cleanup temp files
   │
   ▼
2. Frontend (polling or next view request):
   │
   │ GET /api/attachments/42/conversion-status
   │ OR
   │ GET /api/tickets/.../attachments/42/view
   │
   └─► Response (503 Service Unavailable):
       {
           "status": "failed",
           "message": "PDF conversion failed",
           "error_code": "CONVERSION_TIMEOUT",
           "retry_available": false,
           "download_url": "/api/tickets/TKT-2025-001234/attachments/42/download"
       }

USER EXPERIENCE:
- Frontend shows: "Unable to preview this file. [Download Original]"
- User can always download the original file from helpdesk via workflow_api proxy
"""


"""
===============================================================================
6. CONVERSION STRATEGY
===============================================================================
"""

CONVERSION_STRATEGY = {
    "where_conversion_runs": {
        "service": "workflow_api Celery worker",
        "queue": "pdf_conversion_queue",
        "concurrency": "2 workers (configurable)",
        "tool": "LibreOffice (headless mode) via unoconv or direct CLI",
        "rationale": [
            "Backend-only: No client-side JavaScript libraries (security, consistency)",
            "Async: Doesn't block API responses",
            "Scalable: Can add more workers if conversion backlog grows",
            "Isolated: Runs in worker process, not web server process",
        ]
    },
    
    "fetching_from_helpdesk": {
        "method": "Service-to-service HTTP with shared secret",
        "auth_header": "X-Service-Key: <HELPDESK_SERVICE_KEY>",
        "endpoint": "GET http://helpdesk:8000/api/internal/attachments/{id}/file",
        "implementation": """
def fetch_attachment_from_helpdesk(attachment_id: int) -> tuple[bytes, dict]:
    '''
    Securely fetch attachment file from helpdesk service.
    Returns (file_bytes, metadata_dict).
    '''
    import requests
    from django.conf import settings
    
    url = f"{settings.HELPDESK_SERVICE_URL}/api/internal/attachments/{attachment_id}/file"
    headers = {
        "X-Service-Key": settings.HELPDESK_SERVICE_KEY,
        "Accept": "application/octet-stream",
    }
    
    response = requests.get(url, headers=headers, timeout=60, stream=True)
    response.raise_for_status()
    
    metadata = {
        "content_type": response.headers.get("Content-Type"),
        "content_hash": response.headers.get("X-Content-Hash"),
        "file_name": parse_filename_from_content_disposition(
            response.headers.get("Content-Disposition")
        ),
    }
    
    return response.content, metadata
        """
    },
    
    "pdf_storage": {
        "location": "workflow_api/media/pdf_cache/",
        "naming": "{attachment_id}_{content_hash[:12]}.pdf",
        "example": "42_abc123def456.pdf",
        "cleanup_policy": {
            "strategy": "LRU (Least Recently Used)",
            "max_cache_size_gb": 10,
            "max_age_days": 30,
            "command": "python manage.py cleanup_pdf_cache",
        }
    },
    
    "supported_file_types": {
        "documents": [".pdf", ".doc", ".docx", ".odt", ".rtf", ".txt"],
        "spreadsheets": [".xls", ".xlsx", ".ods", ".csv"],
        "presentations": [".ppt", ".pptx", ".odp"],
        "images": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"],
        "passthrough": [".pdf"],  # No conversion needed
        "unsupported": [".zip", ".exe", ".dll", ".bin", ".mp4", ".mp3"],
    },
    
    "safety_measures": {
        "file_size_limit": {
            "max_bytes": 50 * 1024 * 1024,  # 50MB
            "error": "File too large for conversion (max 50MB)"
        },
        "conversion_timeout": {
            "seconds": 120,
            "error": "Conversion timed out"
        },
        "temp_directory": {
            "base": "/tmp/pdf_conversions/",
            "per_task": "/tmp/pdf_conversions/<uuid>/",
            "cleanup": "Always delete after task, even on failure"
        },
        "sandboxing": [
            "LibreOffice runs with --nofirststartwizard --nologo",
            "No network access during conversion",
            "Temp files owned by worker user, 600 permissions",
            "Output validated: must be valid PDF",
        ],
        "output_validation": """
def validate_pdf_output(pdf_path: str) -> bool:
    '''Verify the output is a valid PDF.'''
    import subprocess
    result = subprocess.run(
        ['pdfinfo', pdf_path],
        capture_output=True,
        timeout=10
    )
    return result.returncode == 0
        """
    }
}


"""
===============================================================================
7. FRONTEND INTERACTION PATTERNS
===============================================================================
"""

FRONTEND_PATTERNS = {
    "what_frontend_calls": {
        "list_attachments": "GET /api/tickets/{ticket_number}/attachments",
        "view_as_pdf": "GET /api/tickets/{ticket_number}/attachments/{id}/view",
        "download_original": "GET /api/tickets/{ticket_number}/attachments/{id}/download",
        "poll_status": "GET /api/attachments/{id}/conversion-status",
    },
    
    "handling_processing_state": """
// React hook example for attachment viewing
const useAttachmentView = (ticketNumber: string, attachmentId: number) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const viewAttachment = async () => {
    setStatus('loading');
    
    try {
      const response = await fetch(
        `/api/tickets/${ticketNumber}/attachments/${attachmentId}/view`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200) {
        // PDF is ready
        const blob = await response.blob();
        setPdfUrl(URL.createObjectURL(blob));
        setStatus('ready');
        
      } else if (response.status === 202) {
        // Conversion in progress - start polling
        const data = await response.json();
        pollConversionStatus(data.poll_url);
        
      } else if (response.status === 415) {
        // Unsupported file type
        const data = await response.json();
        setError(`Cannot preview: ${data.message}`);
        setStatus('failed');
        
      } else {
        throw new Error('Failed to load attachment');
      }
      
    } catch (err) {
      setError(err.message);
      setStatus('failed');
    }
  };

  const pollConversionStatus = async (pollUrl: string) => {
    const maxAttempts = 60;  // 60 * 2s = 2 minutes max
    let attempts = 0;
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('Conversion timed out');
        setStatus('failed');
        return;
      }
      
      const response = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.status === 'completed') {
        // Conversion done - fetch the PDF
        viewAttachment();
      } else if (data.status === 'failed') {
        setError(data.error_message || 'Conversion failed');
        setStatus('failed');
      } else {
        // Still processing - poll again
        attempts++;
        setTimeout(poll, 2000);  // Poll every 2 seconds
      }
    };
    
    poll();
  };

  return { status, pdfUrl, error, viewAttachment };
};
    """,
    
    "what_frontend_never_knows": [
        "Helpdesk service URL or existence",
        "Internal service-to-service authentication",
        "Where original files are physically stored",
        "Celery queue names or task IDs",
        "LibreOffice or conversion tool details",
        "Internal cache file paths",
    ],
    
    "ui_states": {
        "idle": "Show 'View' button",
        "loading": "Show spinner with 'Converting...' text",
        "processing": "Show progress indicator, poll status endpoint",
        "ready": "Render PDF in viewer (iframe or react-pdf)",
        "failed": "Show error message + 'Download Original' fallback button",
        "not_supported": "Show 'Preview not available' + 'Download' button",
    }
}


"""
===============================================================================
8. NON-GOALS & ANTI-PATTERNS
===============================================================================
"""

NON_GOALS = {
    "explicitly_avoided": [
        {
            "pattern": "Frontend-based PDF conversion (pdf.js, jsPDF)",
            "reason": "Inconsistent results, security risks with user files, can't handle complex Office docs",
        },
        {
            "pattern": "Exposing helpdesk URLs to frontend",
            "reason": "Leaks internal service topology, bypasses auth, couples frontend to backend changes",
        },
        {
            "pattern": "Synchronous conversion in API request",
            "reason": "Blocks web server, causes timeouts on large files, poor UX",
        },
        {
            "pattern": "Storing converted PDFs in helpdesk",
            "reason": "Bloats source-of-truth database, mixes original data with derived views",
        },
        {
            "pattern": "Converting on every request (no caching)",
            "reason": "Wasteful compute, slow user experience, unnecessary load on LibreOffice",
        },
        {
            "pattern": "Replacing original files with PDFs",
            "reason": "Loses fidelity, some users need original format (edit, print, etc.)",
        },
        {
            "pattern": "Using online conversion APIs (CloudConvert, etc.)",
            "reason": "Data leaves internal network, privacy concerns, external dependency",
        },
        {
            "pattern": "Unlimited file size conversion",
            "reason": "DoS vector, memory exhaustion, conversion tool crashes",
        },
    ],
    
    "design_decisions": [
        {
            "decision": "workflow_api owns the PDF cache, not helpdesk",
            "rationale": "Clear separation: helpdesk = source data, workflow_api = presentation layer",
        },
        {
            "decision": "Hash-based cache invalidation, not timestamp-based",
            "rationale": "Timestamps can drift between services; content hash is definitive",
        },
        {
            "decision": "Async conversion with polling, not WebSocket",
            "rationale": "Simpler implementation, works with standard HTTP, frontend already has patterns for polling",
        },
        {
            "decision": "Return 202 Accepted for in-progress conversion",
            "rationale": "Correct HTTP semantics, clear signal to frontend that request was accepted but not complete",
        },
    ]
}


"""
===============================================================================
9. IMPLEMENTATION EXAMPLES
===============================================================================
"""

# ─────────────────────────────────────────────────────────────────────────────
# WORKFLOW_API: Attachment Views (views.py)
# ─────────────────────────────────────────────────────────────────────────────
EXAMPLE_VIEW_CODE = '''
# workflow_api/attachments/views.py

import hashlib
import logging
from django.http import FileResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AttachmentPDFCache
from .tasks import convert_attachment_to_pdf
from .services import HelpdeskClient

logger = logging.getLogger(__name__)
helpdesk = HelpdeskClient()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_attachment(request, ticket_number, attachment_id):
    """
    View attachment as PDF in browser.
    Returns PDF if ready, 202 if conversion in progress, or error.
    """
    force_refresh = request.query_params.get('force_refresh', 'false').lower() == 'true'
    
    # 1. Get metadata from helpdesk
    try:
        metadata = helpdesk.get_attachment_metadata(attachment_id)
    except HelpdeskClient.NotFoundError:
        return Response({"error": "Attachment not found"}, status=status.HTTP_404_NOT_FOUND)
    except HelpdeskClient.ServiceError as e:
        logger.error(f"Helpdesk service error: {e}")
        return Response({"error": "Service temporarily unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    # 2. Check if file type is supported
    if not is_convertible(metadata['file_type']):
        return Response({
            "status": "not_supported",
            "message": "This file type cannot be converted to PDF",
            "download_url": f"/api/tickets/{ticket_number}/attachments/{attachment_id}/download"
        }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
    
    # 3. Check for existing cache
    cache = AttachmentPDFCache.objects.filter(helpdesk_attachment_id=attachment_id).first()
    
    # 4. Validate cache (hash check for source file changes)
    if cache and not force_refresh:
        if cache.status == AttachmentPDFCache.ConversionStatus.COMPLETED:
            if cache.original_content_hash == metadata['content_hash']:
                # Cache hit - serve PDF
                cache.mark_accessed()
                return serve_pdf(cache, metadata['file_name'])
            else:
                # Source changed - invalidate and reconvert
                cache.delete()
                cache = None
        
        elif cache.status == AttachmentPDFCache.ConversionStatus.PROCESSING:
            # Conversion already in progress
            return Response({
                "status": "processing",
                "message": "File is being converted to PDF",
                "poll_url": f"/api/attachments/{attachment_id}/conversion-status",
                "estimated_wait_seconds": 15
            }, status=status.HTTP_202_ACCEPTED)
        
        elif cache.status == AttachmentPDFCache.ConversionStatus.PASSTHROUGH:
            # Original is PDF - stream directly from helpdesk
            cache.mark_accessed()
            return stream_from_helpdesk(attachment_id, metadata['file_name'])
        
        elif cache.status == AttachmentPDFCache.ConversionStatus.FAILED:
            if cache.can_retry():
                cache.delete()
                cache = None
            else:
                return Response({
                    "status": "failed",
                    "message": cache.error_message or "PDF conversion failed",
                    "download_url": f"/api/tickets/{ticket_number}/attachments/{attachment_id}/download"
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    # 5. No valid cache - initiate conversion
    if metadata['file_type'] == 'application/pdf':
        # PDF passthrough - no conversion needed
        cache = AttachmentPDFCache.objects.create(
            helpdesk_attachment_id=attachment_id,
            ticket_number=ticket_number,
            original_file_name=metadata['file_name'],
            original_file_type=metadata['file_type'],
            original_file_size=metadata['file_size'],
            original_content_hash=metadata['content_hash'],
            status=AttachmentPDFCache.ConversionStatus.PASSTHROUGH
        )
        return stream_from_helpdesk(attachment_id, metadata['file_name'])
    
    # 6. Create pending cache and enqueue conversion
    cache = AttachmentPDFCache.objects.create(
        helpdesk_attachment_id=attachment_id,
        ticket_number=ticket_number,
        original_file_name=metadata['file_name'],
        original_file_type=metadata['file_type'],
        original_file_size=metadata['file_size'],
        original_content_hash=metadata['content_hash'],
        status=AttachmentPDFCache.ConversionStatus.PENDING
    )
    
    # Enqueue async conversion task
    convert_attachment_to_pdf.delay(
        cache_id=cache.id,
        attachment_id=attachment_id,
        file_name=metadata['file_name'],
        file_type=metadata['file_type']
    )
    
    return Response({
        "status": "processing",
        "message": "File is being converted to PDF",
        "poll_url": f"/api/attachments/{attachment_id}/conversion-status",
        "estimated_wait_seconds": estimate_conversion_time(metadata['file_size'], metadata['file_type'])
    }, status=status.HTTP_202_ACCEPTED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_attachment(request, ticket_number, attachment_id):
    """
    Download original attachment file.
    Proxies request through to helpdesk to hide internal service.
    """
    try:
        file_data, metadata = helpdesk.get_attachment_file(attachment_id)
    except HelpdeskClient.NotFoundError:
        return Response({"error": "Attachment not found"}, status=status.HTTP_404_NOT_FOUND)
    
    response = FileResponse(
        io.BytesIO(file_data),
        content_type=metadata['content_type'],
        as_attachment=True,
        filename=metadata['file_name']
    )
    response['Content-Length'] = len(file_data)
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversion_status(request, attachment_id):
    """
    Get conversion status for polling UI.
    """
    cache = get_object_or_404(AttachmentPDFCache, helpdesk_attachment_id=attachment_id)
    
    return Response({
        "status": cache.status,
        "message": get_status_message(cache),
        "created_at": cache.created_at.isoformat(),
        "started_at": cache.conversion_started_at.isoformat() if cache.conversion_started_at else None,
        "completed_at": cache.conversion_completed_at.isoformat() if cache.conversion_completed_at else None,
        "error_message": cache.error_message,
        "retry_count": cache.retry_count,
        "view_url": f"/api/tickets/{cache.ticket_number}/attachments/{attachment_id}/view" if cache.status == 'completed' else None,
        "download_url": f"/api/tickets/{cache.ticket_number}/attachments/{attachment_id}/download"
    })
'''

# ─────────────────────────────────────────────────────────────────────────────
# WORKFLOW_API: Celery Task (tasks.py)
# ─────────────────────────────────────────────────────────────────────────────
EXAMPLE_CELERY_TASK = '''
# workflow_api/attachments/tasks.py

import os
import shutil
import subprocess
import tempfile
import uuid
from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

from .models import AttachmentPDFCache
from .services import HelpdeskClient

MAX_FILE_SIZE = getattr(settings, 'PDF_CONVERSION_MAX_FILE_SIZE', 50 * 1024 * 1024)  # 50MB
CONVERSION_TIMEOUT = getattr(settings, 'PDF_CONVERSION_TIMEOUT', 120)  # 2 minutes


class ConversionError(Exception):
    """Raised when PDF conversion fails."""
    pass


@shared_task(
    name='attachments.tasks.convert_attachment_to_pdf',
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(ConversionError,),
    retry_backoff=True,
    retry_backoff_max=300,
    acks_late=True,
    queue='pdf_conversion_queue'
)
def convert_attachment_to_pdf(self, cache_id, attachment_id, file_name, file_type):
    """
    Async task to convert attachment to PDF.
    
    1. Fetch file from helpdesk
    2. Convert using LibreOffice
    3. Store result in cache model
    """
    cache = AttachmentPDFCache.objects.get(id=cache_id)
    temp_dir = None
    
    try:
        # Update status to processing
        cache.status = AttachmentPDFCache.ConversionStatus.PROCESSING
        cache.conversion_started_at = timezone.now()
        cache.save(update_fields=['status', 'conversion_started_at'])
        
        # 1. Fetch file from helpdesk
        helpdesk = HelpdeskClient()
        file_bytes, metadata = helpdesk.get_attachment_file(attachment_id)
        
        # 2. Validate file size
        if len(file_bytes) > MAX_FILE_SIZE:
            raise ConversionError(f"File too large: {len(file_bytes)} bytes (max {MAX_FILE_SIZE})")
        
        # 3. Create isolated temp directory
        temp_dir = os.path.join(tempfile.gettempdir(), 'pdf_conversions', str(uuid.uuid4()))
        os.makedirs(temp_dir, mode=0o700)
        
        # 4. Write source file
        source_ext = os.path.splitext(file_name)[1]
        source_path = os.path.join(temp_dir, f'source{source_ext}')
        with open(source_path, 'wb') as f:
            f.write(file_bytes)
        
        # 5. Convert using LibreOffice
        pdf_path = convert_with_libreoffice(source_path, temp_dir)
        
        # 6. Validate output
        if not validate_pdf(pdf_path):
            raise ConversionError("Output is not a valid PDF")
        
        # 7. Store PDF in cache
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        # Generate cache filename: {attachment_id}_{hash[:12]}.pdf
        pdf_filename = f"{attachment_id}_{cache.original_content_hash[:12]}.pdf"
        cache.pdf_file.save(pdf_filename, ContentFile(pdf_content), save=False)
        cache.pdf_file_size = len(pdf_content)
        cache.status = AttachmentPDFCache.ConversionStatus.COMPLETED
        cache.conversion_completed_at = timezone.now()
        cache.error_message = None
        cache.save()
        
        return {"status": "success", "cache_id": cache_id}
        
    except ConversionError as e:
        # Conversion failed - update cache with error
        cache.retry_count = self.request.retries
        cache.error_message = str(e)
        
        if self.request.retries >= self.max_retries:
            cache.status = AttachmentPDFCache.ConversionStatus.FAILED
            cache.save()
            return {"status": "failed", "error": str(e)}
        else:
            cache.save(update_fields=['retry_count', 'error_message'])
            raise  # Trigger retry
            
    except Exception as e:
        # Unexpected error
        cache.status = AttachmentPDFCache.ConversionStatus.FAILED
        cache.error_message = f"Unexpected error: {str(e)}"
        cache.save()
        raise
        
    finally:
        # Always cleanup temp directory
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


def convert_with_libreoffice(source_path, output_dir):
    """
    Convert document to PDF using LibreOffice.
    Returns path to generated PDF.
    """
    cmd = [
        'libreoffice',
        '--headless',
        '--nofirststartwizard',
        '--nologo',
        '--norestore',
        '--convert-to', 'pdf',
        '--outdir', output_dir,
        source_path
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=CONVERSION_TIMEOUT,
            check=True
        )
    except subprocess.TimeoutExpired:
        raise ConversionError(f"Conversion timed out after {CONVERSION_TIMEOUT}s")
    except subprocess.CalledProcessError as e:
        raise ConversionError(f"LibreOffice failed: {e.stderr.decode()}")
    
    # Find generated PDF
    pdf_name = os.path.splitext(os.path.basename(source_path))[0] + '.pdf'
    pdf_path = os.path.join(output_dir, pdf_name)
    
    if not os.path.exists(pdf_path):
        raise ConversionError("LibreOffice did not produce output PDF")
    
    return pdf_path


def validate_pdf(pdf_path):
    """Verify output is a valid PDF using pdfinfo."""
    try:
        subprocess.run(
            ['pdfinfo', pdf_path],
            capture_output=True,
            timeout=10,
            check=True
        )
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return False
'''

# ─────────────────────────────────────────────────────────────────────────────
# HELPDESK: Internal API Endpoints (to be added)
# ─────────────────────────────────────────────────────────────────────────────
EXAMPLE_HELPDESK_INTERNAL_API = '''
# hdts/helpdesk/core/views/internal_views.py

import hashlib
from django.conf import settings
from django.http import FileResponse, HttpResponseForbidden
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..models import TicketAttachment


def verify_service_key(request):
    """Verify internal service-to-service API key."""
    provided_key = request.headers.get('X-Service-Key')
    expected_key = getattr(settings, 'INTERNAL_SERVICE_KEY', None)
    
    if not expected_key:
        return False  # No key configured = deny all
    
    return provided_key == expected_key


@api_view(['GET'])
def internal_attachment_metadata(request, attachment_id):
    """
    Internal API: Get attachment metadata for workflow_api.
    Requires X-Service-Key header.
    """
    if not verify_service_key(request):
        return HttpResponseForbidden("Invalid service key")
    
    try:
        attachment = TicketAttachment.objects.select_related('ticket').get(id=attachment_id)
    except TicketAttachment.DoesNotExist:
        return Response({"error": "Attachment not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Compute content hash if not cached
    content_hash = attachment.content_hash
    if not content_hash:
        content_hash = compute_file_hash(attachment.file)
        attachment.content_hash = content_hash
        attachment.save(update_fields=['content_hash'])
    
    return Response({
        "id": attachment.id,
        "ticket_id": attachment.ticket.id,
        "ticket_number": attachment.ticket.ticket_number,
        "file_name": attachment.file_name,
        "file_type": attachment.file_type,
        "file_size": attachment.file_size,
        "content_hash": content_hash,
        "upload_date": attachment.upload_date.isoformat(),
    })


@api_view(['GET'])
def internal_attachment_file(request, attachment_id):
    """
    Internal API: Get attachment file binary for workflow_api.
    Requires X-Service-Key header.
    """
    if not verify_service_key(request):
        return HttpResponseForbidden("Invalid service key")
    
    try:
        attachment = TicketAttachment.objects.get(id=attachment_id)
    except TicketAttachment.DoesNotExist:
        return Response({"error": "Attachment not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Ensure hash is computed
    if not attachment.content_hash:
        attachment.content_hash = compute_file_hash(attachment.file)
        attachment.save(update_fields=['content_hash'])
    
    response = FileResponse(
        attachment.file.open('rb'),
        content_type=attachment.file_type,
        as_attachment=True,
        filename=attachment.file_name
    )
    response['X-Content-Hash'] = attachment.content_hash
    response['Content-Length'] = attachment.file_size
    return response


def compute_file_hash(file_field):
    """Compute SHA-256 hash of file contents."""
    hasher = hashlib.sha256()
    file_field.open('rb')
    for chunk in file_field.chunks(chunk_size=8192):
        hasher.update(chunk)
    file_field.close()
    return f"sha256:{hasher.hexdigest()}"
'''

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION SETTINGS
# ─────────────────────────────────────────────────────────────────────────────
EXAMPLE_SETTINGS = '''
# workflow_api/workflow_api/settings.py (additions)

# PDF Conversion Configuration
PDF_CONVERSION_MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
PDF_CONVERSION_TIMEOUT = 120  # seconds
PDF_CACHE_MAX_AGE_DAYS = 30
PDF_CACHE_MAX_SIZE_GB = 10

# Helpdesk Internal Service Key (for service-to-service auth)
HELPDESK_SERVICE_KEY = config('HELPDESK_SERVICE_KEY', default='change-me-in-production')

# Celery queue for PDF conversion
CELERY_TASK_ROUTES.update({
    'attachments.tasks.convert_attachment_to_pdf': {'queue': 'pdf_conversion_queue'},
})
'''

print("""
===============================================================================
ATTACHMENT VIEWING & CONVERSION ARCHITECTURE
===============================================================================

This module contains the complete design specification for the attachment
viewing and PDF conversion system spanning helpdesk and workflow_api services.

Key sections:
- SERVICE_RESPONSIBILITIES: Clear ownership boundaries
- API_CONTRACTS: Request/response specifications
- FLOW_*: Step-by-step sequence diagrams
- CONVERSION_STRATEGY: Security and implementation details
- FRONTEND_PATTERNS: React integration examples
- NON_GOALS: Explicitly avoided anti-patterns
- EXAMPLE_*: Implementation code samples

To implement:
1. Add AttachmentPDFCache model to workflow_api
2. Add internal API endpoints to helpdesk  
3. Add Celery task for async conversion
4. Add frontend-facing views to workflow_api
5. Install LibreOffice on worker containers
6. Configure service keys in environment

See individual sections for detailed guidance.
===============================================================================
""")
