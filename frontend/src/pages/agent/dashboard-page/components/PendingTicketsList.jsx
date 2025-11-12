import React from "react";

function TicketItem({ t }) {
  return (
    <div style={{ padding: 8, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{t.ticket_number} - {t.subject}</div>
        <div style={{ fontSize: 12, color: "#666" }}>{t.workflow_name} • {t.current_step_name}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12 }}>{t.priority}</div>
        <div style={{ fontSize: 12, color: "#999" }}>{(t.created_at || "").split("T")[0]}</div>
      </div>
    </div>
  );
}

export default function PendingTicketsList({ tasks = [] }) {
  return (
    <section style={{ marginTop: 12 }}>
      <h3 style={{ margin: "8px 0" }}>All Pending Tickets</h3>
      <div style={{ border: "1px solid #eee", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
        {tasks.length === 0 && <div style={{ padding: 12, color: "#666" }}>No pending tickets</div>}
        {tasks.slice(0, 10).map((t) => (
          <TicketItem key={t.ticket_id || t.ticket_number} t={t} />
        ))}
      </div>
    </section>
  );
}
