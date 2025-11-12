import React from "react";

export default function TicketCountsToday({ date, actedToday = 0, notActedToday = 0 }) {
  return (
    <section style={{ marginTop: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ padding: 12, borderRadius: 8, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Today ({date})</h3>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Not acted</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{notActedToday}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Acted</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{actedToday}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
