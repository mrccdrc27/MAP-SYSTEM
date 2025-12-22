import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db.sqlite3')
if not os.path.exists(DB_PATH):
    print('DB_NOT_FOUND', DB_PATH)
    raise SystemExit(1)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
company_id = 'MA0520'
cur.execute("SELECT id FROM core_employee WHERE company_id=?", (company_id,))
row = cur.fetchone()
if not row:
    print('EMP_NOT_FOUND')
    raise SystemExit(0)
empid = row[0]
cur.execute("SELECT id, action_type, message, ticket_id, timestamp FROM core_activitylog WHERE user_id=? ORDER BY timestamp DESC", (empid,))
logs = cur.fetchall()
cur.execute("SELECT id, ticket_number, subject, submit_date FROM core_ticket WHERE employee_id=? ORDER BY submit_date DESC", (empid,))
tickets = cur.fetchall()
output = {
    'employee_id': empid,
    'company_id': company_id,
    'logs': logs,
    'tickets': tickets,
}
print(json.dumps(output, default=str))
