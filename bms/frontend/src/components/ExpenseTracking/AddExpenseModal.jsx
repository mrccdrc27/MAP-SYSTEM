import React, { useRef } from "react";
import { X, Paperclip, ChevronDown } from "lucide-react";
import SearchableSelect from "../BudgetAllocation/SearchableSelect"; // Reusing from BudgetAllocation

const AddExpenseModal = ({ isOpen, onClose, onSubmit, data, onChange, onProjectChange, onFileChange, onClearFiles, projectOptions, categories, selectedProject }) => {
  if (!isOpen) return null;
  const fileInputRef = useRef(null);

  const handleAmountChange = (e) => {
    // Only allow valid decimal input
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      onChange(e);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ backgroundColor: "white", borderRadius: "8px", width: "550px", maxWidth: "90%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e9ecef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>Add Expense</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: "24px", overflowY: "auto" }}>
          <form onSubmit={onSubmit}>
            {/* Project */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>Project <span style={{ color: "red" }}>*</span></label>
              <SearchableSelect options={projectOptions} value={parseInt(data.project_id)} onChange={onProjectChange} placeholder="Select project..." />
            </div>

            {/* Department (Read-only) */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>Department</label>
              <input type="text" readOnly value={selectedProject ? selectedProject.department_name : "Select Project First"} 
                     style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f5f5f5", fontSize: "14px", color: "#555" }} />
            </div>

            {/* Date */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>Date <span style={{ color: "red" }}>*</span></label>
              <input type="date" name="date" value={data.date} onChange={onChange} max="9999-12-31" 
                     style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }} required />
            </div>

            {/* Sub-Category */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>Sub-Category <span style={{ color: "red" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <select name="category_code" value={data.category_code} onChange={onChange} disabled={!data.project_id} required
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px", backgroundColor: data.project_id ? "white" : "#f5f5f5", appearance: "none" }}>
                  <option value="">{data.project_id ? "Select sub-category" : "Select project first"}</option>
                  {categories.map((c, i) => <option key={i} value={c.code}>{c.name}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Vendor & Amount */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>Vendor <span style={{ color: "red" }}>*</span></label>
                <input type="text" name="vendor" value={data.vendor} onChange={onChange} placeholder="Enter vendor" required
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>Amount <span style={{ color: "red" }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: "14px" }}>₱</span>
                  <input type="number" name="amount" value={data.amount} onChange={handleAmountChange} placeholder="0.00" required step="0.01" min="0"
                         style={{ width: "100%", padding: "8px 12px 8px 25px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }} />
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>Description <span style={{ color: "red" }}>*</span></label>
              <textarea name="description" value={data.description} onChange={onChange} required style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px", minHeight: "80px", resize: "vertical", fontFamily: "inherit" }} />
            </div>

            {/* Attachments */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "13px" }}>Attachments <span style={{ color: "red" }}>*</span></label>
              <div style={{ border: "2px dashed #ccc", borderRadius: "4px", padding: "15px", textAlign: "center", cursor: "pointer", backgroundColor: "#fafafa" }} onClick={() => fileInputRef.current.click()}>
                <input type="file" ref={fileInputRef} multiple accept=".jpg,.jpeg,.png,.pdf" onChange={onFileChange} style={{ display: "none" }} />
                {data.attachments.length > 0 ? (
                  <div>
                    <Paperclip size={20} color="#007bff" style={{ marginBottom: "5px" }} />
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#007bff" }}>{data.attachments.length} file(s) selected</div>
                    <div style={{ fontSize: "11px", color: "#666" }}>Click to change</div>
                  </div>
                ) : (
                  <div>
                    <Paperclip size={20} color="#999" style={{ marginBottom: "5px" }} />
                    <div style={{ fontSize: "13px" }}>Click to upload (JPG, PNG, PDF)</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" onClick={onClose} style={{ padding: "8px 20px", border: "1px solid #ccc", background: "white", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
              <button type="submit" style={{ padding: "8px 20px", border: "none", background: "#007bff", color: "white", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>Submit Expense</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;