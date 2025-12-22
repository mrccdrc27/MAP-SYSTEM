# Import/Export API Guide

## Overview
The import/export system is organized into:
- **Imports**: `contexts_ms/api/imports/` (separate file per resource)
- **Exports**: `contexts_ms/api/import_export_api.py` (export classes only)

## File Structure

```
contexts_ms/api/
├── imports/                    # New imports subpackage
│   ├── __init__.py            # Exports all import views
│   ├── base.py                # BaseImportAPIView + normalize_header_to_field()
│   ├── category.py            # CategoryImportAPIView
│   ├── supplier.py            # SupplierImportAPIView
│   ├── depreciation.py        # DepreciationImportAPIView
│   ├── manufacturer.py        # ManufacturerImportAPIView
│   └── status.py              # StatusImportAPIView
│
└── import_export_api.py       # Exports only (not imports)
```

## Import Endpoints

All imports use **natural key matching by default** (no ID field needed).

### Category Import
- **Endpoint**: `POST /import/categories/`
- **File Format**: XLSX with headers: `name`, `type`
- **Required Fields**: `name`, `type` (asset or component)
- **Optional Fields**: `notes`
- **Natural Key**: (name, type) — duplicates by (name, type) are skipped
- **Example Headers**: name, type, notes

### Supplier Import
- **Endpoint**: `POST /import/suppliers/`
- **File Format**: XLSX with headers
- **Required Fields**: `name`
- **Optional Fields**: `address`, `city`, `zip`, `contact_name`, `phone_number`, `email`, `url`, `notes`
- **Natural Key**: name (case-insensitive)
- **Phone Validation**: 7-13 digits

### Manufacturer Import
- **Endpoint**: `POST /import/manufacturers/`
- **Required Fields**: `name`
- **Optional Fields**: `manu_url`, `support_url`, `support_phone`, `support_email`, `notes`
- **Natural Key**: name

### Depreciation Import
- **Endpoint**: `POST /import/depreciations/`
- **Required Fields**: `name`, `duration`
- **Optional Fields**: `minimum_value`, `notes`
- **Natural Key**: name

### Status Import
- **Endpoint**: `POST /import/statuses/`
- **Required Fields**: `name`, `category` (asset or repair)
- **Conditional**: If category=asset, `type` is required (deployable, deployed, undeployable, pending, archived)
- **Natural Key**: (name, category, type) for assets; (name) for repair statuses

## Import Behavior

### Default (No ID Provided)
- **Upsert Strategy**: `natural` (default)
- **Behavior**: Matches by natural key; creates new if not found, skips if exists
- **No API Key Required**

### With Updates (ID-Based)
- **URL Parameter**: `?upsert_by=id&allow_update=true`
- **Headers Required**: `X-IMPORT-API-KEY: <value>` (from server env `IMPORT_API_KEY`)
- **Behavior**: Matches by ID; updates existing or creates new

### With Updates (Natural Key)
- **URL Parameter**: `?upsert_by=natural&allow_update=true`
- **Headers Required**: `X-IMPORT-API-KEY: <value>`
- **Behavior**: Matches by natural key; updates existing or creates new

## Example XLSX Structure (Categories)

| name | type | notes |
|------|------|-------|
| Laptop | asset | Dell XPS models |
| Monitor | asset | 24" and above |
| RAM | component | DDR4 modules |

## Response Format

```json
{
  "created": 3,
  "updated": 0,
  "errors": []
}
```

If there are errors:
```json
{
  "created": 2,
  "updated": 0,
  "errors": [
    {
      "row": 4,
      "errors": "A category with this name and type already exists."
    }
  ]
}
```

## Header Mapping

The import system automatically normalizes XLSX header names:

### Supplier/Manufacturer Headers
| Original | Normalized |
|----------|-----------|
| Contact Name, contact name, contact | contact_name |
| Phone Number, phone, phonenumber | phone_number |
| Manu URL, manuurl | manu_url |
| Support URL, supporturl | support_url |
| Support Phone, supportphone | support_phone |
| Support Email, supportemail | support_email |
| Created At, createdat | created_at |
| Updated At, updatedat | updated_at |

### Status Headers
| Original | Normalized |
|----------|-----------|
| Status Type, statustype | type |

## Best Practices

1. **No ID Column Needed** — Just provide name and required fields
2. **Natural Keys Work Best** — Matches by (name, type) for categories, name for others
3. **Validation Happens** — All serializer validations apply (uniqueness, field formats, etc.)
4. **Header Flexibility** — Headers are case-insensitive and support common variations
5. **Max File Size** — 5 MB limit per file
6. **Duplicate Handling** — Duplicates within the same import run are tracked and skipped
7. **Timestamps** — `created_at` and `updated_at` are automatically set; cannot be provided in XLSX

## Testing the Import

```bash
# Create a simple XLSX file with categories and POST to:
curl -X POST -F "file=@categories.xlsx" http://localhost:8003/import/categories/

# With updates enabled (requires API key):
curl -X POST -F "file=@categories.xlsx" \
  -H "X-IMPORT-API-KEY: your-key" \
  "http://localhost:8003/import/categories/?allow_update=true&upsert_by=natural"
```
