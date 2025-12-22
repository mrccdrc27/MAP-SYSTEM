# Import/Export System - Complete Setup

## Status: ✅ Complete and Working

### Backend Import Structure Fixed
- ✅ Import paths corrected (using `contexts_ms.models` and `contexts_ms.serializer`)
- ✅ Default upsert strategy changed to `natural` (no ID needed)
- ✅ All services running without errors

### Frontend Import Wired
- ✅ `importCategories()` API helper added to `contextsApi.js`
- ✅ `CategoryRegistration.jsx` updated with upload and feedback UI
- ✅ File validation implemented (size, format)
- ✅ Success/error messages displayed

---

## How Each Import Works

### File Structure
```
backend/contexts/contexts_ms/api/
├── imports/
│   ├── base.py                 # Shared logic, default to 'natural' upsert
│   ├── category.py             # CategoryImportAPIView
│   ├── supplier.py             # SupplierImportAPIView
│   ├── depreciation.py         # DepreciationImportAPIView
│   ├── manufacturer.py         # ManufacturerImportAPIView
│   └── status.py               # StatusImportAPIView
└── import_export_api.py        # Export classes only
```

### Key Implementation Details

#### 1. **Natural Key Matching (Default)**
- **No ID field required** in XLSX file
- Matches by business key (name and type for categories, name for others)
- Duplicates within same import run are tracked and skipped
- Better for user-friendly imports (no need to export then re-import IDs)

**Default upsert_by**: `'natural'` (set in `base.py` line ~175)

#### 2. **Validation Flow**
1. File uploaded to `/import/<resource>/`
2. Openpyxl reads XLSX (lazy import to avoid ModuleNotFoundError)
3. Headers normalized to Django field names (case-insensitive)
4. Each row validated via serializer
5. Duplicates by natural key are skipped (via `import_seen_names` context)
6. Returns: `{created: N, updated: M, errors: []}`

#### 3. **Header Normalization**
Headers are automatically normalized from common variants:
- `contact name` → `contact_name`
- `phone number` → `phone_number`
- `status type` → `type`
- etc.

#### 4. **Import Endpoints**

| Resource | Endpoint | Natural Key |
|----------|----------|-------------|
| Category | `POST /import/categories/` | (name, type) |
| Supplier | `POST /import/suppliers/` | name |
| Manufacturer | `POST /import/manufacturers/` | name |
| Depreciation | `POST /import/depreciations/` | name |
| Status | `POST /import/statuses/` | (name, category, type) |

---

## Example: Category Import XLSX

### Headers (case-insensitive, flexible naming)
```
name    | type      | notes
--------|-----------|------------------
Laptop  | asset     | Dell XPS models
Monitor | asset     | 24" and above
RAM     | component | DDR4 modules
```

### Response
```json
{
  "created": 3,
  "updated": 0,
  "errors": []
}
```

### If Duplicate Found
- Row with (name="Laptop", type="asset") already exists → **skipped** (not an error)
- Returns: `{created: 2, updated: 0, errors: []}`

---

## Frontend Implementation

### File: `frontend/src/pages/More/CategoryRegistration.jsx`

**Features:**
- Import button in the page header
- File validation (5MB max, .xlsx only)
- Real-time status messages (Uploading..., success, error)
- Automatic callback to `importCategories(file)`

**Handler Flow:**
```
User selects .xlsx → Validate size/format → Upload via POST /import/categories/
→ Backend processes → Returns {created, updated, errors}
→ Show result message
```

**Key Code:**
```javascript
const handleImportFile = (e) => {
  const file = e.target.files[0]
  // Validate size (5MB) and extension (.xlsx)
  // Upload via importCategories(file)
  // Show success/error message
}
```

### API Helper: `frontend/src/api/contextsApi.js`

```javascript
export async function importCategories(file, options = {}) {
  const form = new FormData()
  form.append('file', file)
  // Optional: allow_update, upsert_by
  const res = await contextsApi.post(`/import/categories/`, form, { params, headers })
  return res.data
}
```

---

## Testing the Import (Backend)

### Simple Test
```bash
# 1. Create an XLSX file with headers: name, type
#    Rows: Laptop, asset | Monitor, asset | RAM, component

# 2. Upload
curl -X POST -F "file=@categories.xlsx" \
  http://localhost:8003/import/categories/

# 3. Response
# {"created": 3, "updated": 0, "errors": []}
```

### Test with Updates (natural key)
```bash
curl -X POST -F "file=@categories.xlsx" \
  -H "X-IMPORT-API-KEY: your-server-key" \
  "http://localhost:8003/import/categories/?allow_update=true&upsert_by=natural"
```

---

## Testing the Import (Frontend)

1. Navigate to **Categories → New Category** page
2. Click the **Import** button in the header
3. Select a `.xlsx` file (e.g., `categories.xlsx`)
4. Observe:
   - "Uploading..." message appears
   - Success message shows count: "Import complete. Created 3. Updated 0."
   - Or error message if file is invalid

---

## Common Use Cases

### Create-Only Import
```
→ User provides: name, type, notes
→ Backend creates new records
→ Duplicates by (name, type) are skipped
→ No API key needed
→ No ID column required
```

### Update & Create (UpsertNatural)
```
→ User provides: name, type, notes (no ID)
→ Backend finds by (name, type)
→ If found: update; if not: create
→ Requires API key in header
→ URL param: ?allow_update=true&upsert_by=natural
```

---

## Validation Rules

### Categories
- **name**: required, max 50 chars, must be unique by (name, type)
- **type**: required, must be 'asset' or 'component'
- **notes**: optional

### Suppliers
- **name**: required, max 50 chars, must be unique
- **phone_number**: optional, must have 7-13 digits if provided
- **fax**: optional, must have 7-20 digits if provided

### Status
- **name**: required
- **category**: required, must be 'asset' or 'repair'
- **type**: required if category='asset', forbidden if category='repair'

---

## Error Handling

### File-Level Errors
```json
{
  "detail": "Uploaded file is too large. Max size is 5242880 bytes."
}
```

### Row-Level Errors
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

---

## Performance Notes

- **Batch Size**: Default 50 rows per transaction (configurable)
- **Duplicate Tracking**: Uses in-memory set (efficient for ~1000 rows)
- **Max File Size**: 5 MB enforced at both frontend and backend

---

## Next Steps (Optional Enhancements)

1. **Bulk Updates**: Add `--update-existing` option to seeder for re-running seeds
2. **Progress UI**: Show row count during upload for large files
3. **Template Download**: Add "Download Template" button to show column headers
4. **Import History**: Log imports in audit table with user/timestamp
5. **Dry Run UI**: Add checkbox to preview changes before committing

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| ModuleNotFoundError in imports | Check import paths use `contexts_ms.models` (not relative `..models`) |
| File too large error | Max 5 MB; compress or split file |
| Duplicate skipped (not error) | This is normal; natural key match found existing record |
| API key required error | Enable `?allow_update=true` but server has no `IMPORT_API_KEY` env |
| Phone number validation fails | Must have 7-13 digits (strip formatting if needed) |
