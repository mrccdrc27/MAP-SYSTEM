# Ticket Structure Guide for Asset Management System

## Overview

This guide documents the anticipated structure and lifecycle of checkin and checkout tickets in the Asset Management System (AMS). Tickets are created through an external ticketing system and integrated with the AMS for asset tracking.

## Ticket Object Structure

All tickets follow this base structure:

```json
{
  "id": integer,                    // Unique ticket identifier
  "location_details": {
    "id": integer,                  // Location ID
    "name": string                  // Location name (e.g., "Makati", "Manila")
  },
  "requestor_details": {
    "id": integer,                  // Employee ID
    "name": string,                 // Full name (firstname + lastname)
    "firstname": string,
    "lastname": string,
    "email": string,
    "company_id": string,           // Company identifier
    "department": string            // Department name
  },
  "ticket_number": string,          // Unique ticket number (format: TX + YYYYMMDD + sequence)
  "employee": integer,              // Employee ID (references requestor)
  "asset": string,                  // Asset ID (e.g., "AST-20260110-00097-B2FC") or empty string
  "subject": string,                // Ticket subject/description
  "location": integer,              // Location ID
  "is_resolved": boolean,           // Whether the ticket has been processed/resolved
  "created_at": string,             // ISO datetime string (creation timestamp)
  "updated_at": string,             // ISO datetime string (last update timestamp)
  "checkout_date": string|null,     // Planned checkout date (YYYY-MM-DD) or null
  "return_date": string|null,       // Planned return date (YYYY-MM-DD) or null
  "asset_checkout": string|null,    // Asset checkout record ID (set when resolved) or null
  "checkin_date": string|null,      // Actual checkin date (ISO datetime) or null
  "asset_checkin": string|null      // Asset checkin record ID (set when resolved) or null
}
```

## Checkout Tickets

Checkout tickets are created when an employee requests to borrow an asset.

### Initial State (Unresolved)
- `is_resolved`: `false`
- `checkout_date`: Set to requested checkout date
- `return_date`: Set to planned return date
- `asset_checkout`: `null`
- `checkin_date`: `null`
- `asset_checkin`: `null`
- `asset`: Contains the asset ID being requested

### Resolved State
- `is_resolved`: `true`
- `asset_checkout`: Set to the ID of the created AssetCheckout record
- Other fields remain the same

### Example Checkout Ticket

```json
{
  "id": 296,
  "location_details": {
    "id": 2,
    "name": "Makati"
  },
  "requestor_details": {
    "id": 9,
    "name": "Employee Account",
    "firstname": "Employee",
    "lastname": "Account",
    "email": "employeeaccount@gmail.com",
    "company_id": "MA8109",
    "department": "IT Department"
  },
  "ticket_number": "TX20260112820168",
  "employee": 9,
  "asset": "AST-20260110-00097-B2FC",
  "subject": "Request Printer",
  "location": 2,
  "is_resolved": false,
  "created_at": "2026-01-12T10:21:08.871912+00:00",
  "updated_at": "2026-01-12T10:48:11.507077+00:00",
  "checkout_date": "2026-01-16",
  "return_date": "2026-01-21",
  "asset_checkout": null,
  "checkin_date": null,
  "asset_checkin": null
}
```

## Checkin Tickets

Checkin tickets are created when an employee returns a borrowed asset or drops off equipment.

### Initial State (Unresolved)
- `is_resolved`: `false`
- `checkout_date`: `null`
- `return_date`: `null`
- `asset_checkout`: May contain the ID of the related checkout record
- `checkin_date`: Set to the planned/actual checkin date
- `asset_checkin`: `null`
- `asset`: May be empty (for general checkins) or contain asset ID

### Resolved State
- `is_resolved`: `true`
- `asset_checkin`: Set to the ID of the created AssetCheckin record
- Other fields remain the same

### Example Checkin Tickets

**Asset-Specific Checkin:**
```json
{
  "id": 295,
  "location_details": {
    "id": 2,
    "name": "Makati"
  },
  "requestor_details": {
    "id": 9,
    "name": "Employee Account",
    "firstname": "Employee",
    "lastname": "Account",
    "email": "employeeaccount@gmail.com",
    "company_id": "MA8109",
    "department": "IT Department"
  },
  "ticket_number": "TX20260112001788",
  "employee": 9,
  "asset": "",
  "subject": "Keyboard Drop-off",
  "location": 2,
  "is_resolved": false,
  "created_at": "2026-01-12T10:18:56.051127+00:00",
  "updated_at": "2026-01-12T10:45:30.922147+00:00",
  "checkout_date": null,
  "return_date": null,
  "asset_checkout": "44",
  "checkin_date": "2026-01-13T18:18:56.051127+00:00",
  "asset_checkin": null
}
```

**General Checkin (No Specific Asset):**
```json
{
  "id": 290,
  "location_details": {
    "id": 3,
    "name": "Manila"
  },
  "requestor_details": {
    "id": 9,
    "name": "Employee Account",
    "firstname": "Employee",
    "lastname": "Account",
    "email": "employeeaccount@gmail.com",
    "company_id": "MA8109",
    "department": "IT Department"
  },
  "ticket_number": "TX20260112827846",
  "employee": 9,
  "asset": "",
  "subject": "check in 2",
  "location": 3,
  "is_resolved": false,
  "created_at": "2026-01-12T07:52:47.493906+00:00",
  "updated_at": "2026-01-12T10:37:29.571025+00:00",
  "checkout_date": null,
  "return_date": null,
  "asset_checkout": null,
  "checkin_date": "2026-01-18T07:52:47.493906+00:00",
  "asset_checkin": null
}
```

## Ticket Lifecycle

### Checkout Ticket Flow
1. **Created**: Ticket created with checkout/return dates, `is_resolved: false`
2. **Processed**: AssetCheckout record created in AMS
3. **Resolved**: `is_resolved: true`, `asset_checkout` set to checkout record ID

### Checkin Ticket Flow
1. **Created**: Ticket created with checkin date, `is_resolved: false`
2. **Processed**: AssetCheckin record created in AMS
3. **Resolved**: `is_resolved: true`, `asset_checkin` set to checkin record ID

## Key Differences

| Aspect | Checkout Ticket | Checkin Ticket |
|--------|----------------|---------------|
| Purpose | Request to borrow asset | Return/dropdown of asset |
| `checkout_date` | Set (planned checkout) | `null` |
| `return_date` | Set (planned return) | `null` |
| `asset_checkout` | Set when resolved | May be set (references checkout) |
| `checkin_date` | `null` | Set (actual/planned checkin) |
| `asset_checkin` | `null` | Set when resolved |
| `asset` | Usually set | May be empty |

## API Integration

Tickets are fetched from the external ticket tracking API at:
- Base URL: `http://165.22.247.50:1001/`
- Endpoint: `/external/ams/tickets/`

The AMS proxies these tickets and may enrich them with additional data from internal services (authentication, locations, etc.).

## Validation Rules

- Checkout tickets require `checkout_date` and `return_date` on creation
- Checkin tickets require `checkin_date` on creation
- Asset status must be appropriate for the ticket type (deployable for checkout, deployed for checkin)
- Tickets are resolved by posting to `/external/resolve/` with the `ticket_number`</content>
<parameter name="filePath">c:\work\Capstone 2\Capstone1\TICKET_STRUCTURE_GUIDE.md