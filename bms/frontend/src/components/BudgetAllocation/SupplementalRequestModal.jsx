import React from "react";
import { X } from "lucide-react";
import SearchableSelect from "./SearchableSelect";

const SupplementalRequestModal = ({
  isOpen,
  onClose,
  onSubmit,
  requestData,
  setRequestData,
  projects,
  categories,
  isFinanceManager,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "500px",
          maxWidth: "90%",
          padding: "24px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>
            Request Supplemental Budget
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={20} color="#666" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
                fontSize: "13px",
              }}
            >
              Department
            </label>
            <input
              type="text"
              value={requestData.department_display || "All Departments"}
              disabled
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
                color: "#555",
              }}
            />
            {!isFinanceManager && (
              <small
                style={{
                  color: "#666",
                  fontSize: "11px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                Auto-selected based on your profile.
              </small>
            )}
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
                fontSize: "13px",
              }}
            >
              Project <span style={{ color: "red" }}>*</span>
            </label>
            <SearchableSelect
              options={projects}
              value={parseInt(requestData.project_id)}
              onChange={(val) =>
                setRequestData((prev) => ({
                  ...prev,
                  project_id: val,
                  category_id: "",
                }))
              }
              placeholder="Select Project..."
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
                fontSize: "13px",
              }}
            >
              Category <span style={{ color: "red" }}>*</span>
            </label>
            <select
              value={requestData.category_id}
              onChange={(e) =>
                setRequestData({ ...requestData, category_id: e.target.value })
              }
              disabled={!requestData.project_id}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
                backgroundColor: !requestData.project_id ? "#f5f5f5" : "white",
              }}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.classification})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
                fontSize: "13px",
              }}
            >
              Requested Amount <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="number"
              value={requestData.amount}
              onChange={(e) =>
                setRequestData({ ...requestData, amount: e.target.value })
              }
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
              required
              step="0.01"
              min="0.01"
              placeholder="0.00"
            />
          </div>

          <div style={{ marginBottom: "25px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
                fontSize: "13px",
              
              }}
            >
              Justification <span style={{ color: "red" }}>*</span>
            </label>
            <textarea
              value={requestData.reason}
              onChange={(e) =>
                setRequestData({ ...requestData, reason: e.target.value })
              }
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                minHeight: "80px",
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical",
                backgroundColor: "white",
              }}
              required
              placeholder="Why is this budget increase needed?"
            />
          </div>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                border: "1px solid #ccc",
                background: "white",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                border: "none",
                background: "#28a745",
                color: "white",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplementalRequestModal;
