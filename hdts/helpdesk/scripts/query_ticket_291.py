import sqlite3
import os
import json
import sys

# Locate DB relative to this script (backend/db.sqlite3)
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB = os.path.join(BASE, 'db.sqlite3')
if not os.path.exists(DB):
    print('DB not found at', DB)
    sys.exit(1)

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
try:
    # Allow optional ticket id via command line: python query_ticket_291.py 292
    tid = 291
    if len(sys.argv) > 1:
        try:
            tid = int(sys.argv[1])
        except Exception:
            print('Invalid ticket id provided, using default id=291')
    cur.execute("SELECT id, ticket_number, status, csat_rating, feedback, date_completed FROM core_ticket WHERE id = ?", (tid,))
    row = cur.fetchone()
    if not row:
        print(f'No ticket with id={tid} found in core_ticket')
    else:
        # Convert Row to dict
        out = {k: (v if v is not None else None) for k, v in zip(row.keys(), row)}
        # Ensure date serializable
        print(json.dumps(out, default=str, indent=2))
finally:
    conn.close()
