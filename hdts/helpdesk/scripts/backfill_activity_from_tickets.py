import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db.sqlite3')
if not os.path.exists(DB_PATH):
    print('DB_NOT_FOUND', DB_PATH)
    raise SystemExit(1)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Find tickets that have an employee and do NOT have a corresponding activity log
cur.execute("SELECT id, employee_id, subject, category, submit_date FROM core_ticket WHERE employee_id IS NOT NULL")
all_tickets = cur.fetchall()
new_rows = 0
for t in all_tickets:
    ticket_id, employee_id, subject, category, submit_date = t
    # Check if an activity log exists for this ticket
    cur.execute("SELECT COUNT(*) FROM core_activitylog WHERE ticket_id=?", (ticket_id,))
    count = cur.fetchone()[0]
    if count == 0:
        message = f'Created new ticket: {subject}' if subject else 'Created new ticket'
        metadata = json.dumps({'category': category}) if category else json.dumps({})
        # Insert into core_activitylog. Fields: id (autoinc), user_id, action_type, actor_id, message, ticket_id, metadata, timestamp
        cur.execute(
            "INSERT INTO core_activitylog (user_id, action_type, actor_id, message, ticket_id, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (employee_id, 'ticket_created', None, message, ticket_id, metadata, submit_date)
        )
        new_rows += 1

conn.commit()
print(f'Backfill complete. Inserted {new_rows} new activity log(s).')
