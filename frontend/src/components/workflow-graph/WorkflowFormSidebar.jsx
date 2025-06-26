// WorkflowFormSidebar.jsx
import React, { useEffect, useState } from "react";

export default function WorkflowFormSidebar({ element, onClose, onUpdateNode, onUpdateEdge }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (element) setForm({ ...element.data });
  }, [element]);

  if (!element) return null;

  const isNode = !element.source; // Edges have source/target

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (isNode) {
      onUpdateNode(element.id, form);
    } else {
      onUpdateEdge(element.id, form);
    }
    onClose();
  };

  return (
    
    <div style={{ width: 300, padding: 16, background: "#f7f7f7", borderLeft: "1px solid #ccc" }}>
      <h3>{isNode ? "Edit Step" : "Edit Transition"}</h3>
      {isNode ? (
        <>
          <label>Label:</label>
          <input
            name="label"
            value={form.label || ""}
            onChange={handleChange}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <label>Role:</label>
          <input
            name="role"
            value={form.role || ""}
            onChange={handleChange}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <label>Instruction:</label>
          <textarea
            name="instruction"
            value={form.instruction || ""}
            onChange={handleChange}
            style={{ width: "100%", marginBottom: 8 }}
          />
        </>
      ) : (
        <>
          <label>Action:</label>
          <input
            name="action"
            value={form.action || ""}
            onChange={handleChange}
            style={{ width: "100%", marginBottom: 8 }}
          />
        </>
      )}
      <button onClick={handleSave} style={{ marginRight: 8 }}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}