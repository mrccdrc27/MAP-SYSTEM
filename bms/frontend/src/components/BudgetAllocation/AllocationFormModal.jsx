import React from "react";
import { X } from "lucide-react";

const AllocationFormModal = ({
  isOpen,
  type,
  data,
  onChange,
  onAmountChange,
  onClose,
  onSubmit,
  dropdowns,
  allCategories, // MODIFIED: Receive categories
  errors,
}) => {
  if (!isOpen) return null;

  // MODIFICATION START: Filter categories based on selection (CapEx/OpEx)
  // We filter available sub-categories based on the 'category' (CapEx/OpEx) selected in the form
  const filteredSubCategories = allCategories
    ? allCategories.filter(
        (cat) =>
          cat.classification?.toUpperCase() === data.category?.toUpperCase(),
      )
    : [];

  // Check if target is a "Budget Account" (Expense/Asset) vs Funding Source
  // We only show sub-category selection for Budget Accounts
  const isTargetBudgetAccount = dropdowns.creditAccounts.some(
    (acc) =>
      acc.value === data.credit_account &&
      (acc.type_name === "Expense" || acc.type_name === "Asset"),
  );
  // MODIFICATION END

  // FIX: Validate numeric input with max 2 decimal places
  const handleAmountInput = (e) => {
    const value = e.target.value;

    // Allow empty string (for clearing)
    if (value === "") {
      onAmountChange({ target: { name: "amount", value: "" } });
      return;
    }

    // Only allow valid decimal numbers (max 2 decimal places)
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      onAmountChange({ target: { name: "amount", value } });
    }
  };

  // FIX: Format amount for display (add â‚± prefix if not empty)
  const formatAmountDisplay = (val) => {
    if (!val || val === "") return "";
    return val; // Show raw number while typing
  };

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
          width: "600px",
          maxWidth: "90%",
          maxHeight: "90vh",
          overflow: "auto",
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
          <h3
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "bold",
              color: "#333",
            }}
          >
            {/* FIX: Clarified Modal Title */}
            {type === "modify"
              ? "Create Follow-up Adjustment"
              : "New Budget Allocation"}
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={24} color="#666" />
          </button>
        </div>

        {errors && Object.keys(errors).length > 0 && (
          <div
            style={{
              backgroundColor: "#fff5f5",
              border: "1px solid #feb2b2",
              borderRadius: "4px",
              padding: "10px",
              marginBottom: "20px",
            }}
          >
            <strong style={{ color: "#c53030", fontSize: "13px" }}>
              Please correct the following errors:
            </strong>
            <ul
              style={{
                margin: "5px 0 0 15px",
                fontSize: "12px",
                color: "#c53030",
              }}
            >
              {Object.values(errors).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "5px",
                  fontWeight: "600",
                }}
              >
                Ticket ID
              </label>
              <input
                type="text"
                value={data.ticket_id || "Auto-Generated"}
                disabled
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  color: "#6b7280",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "5px",
                  fontWeight: "600",
                }}
              >
                Effective Date
              </label>
              <input
                type="text"
                value={data.date}
                disabled
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  color: "#6b7280",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Target Department <span style={{ color: "red" }}>*</span>
            </label>
            <select
              name="department"
              value={data.department}
              onChange={onChange}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "14px",
                outline: "none",
                backgroundColor: "white",
              }}
            >
              <option value="">Select Department</option>
              {dropdowns.departments.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "8px",
                }}
              >
                Expense Category <span style={{ color: "red" }}>*</span>
              </label>
              <select
                name="category"
                value={data.category}
                onChange={onChange}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: "white",
                }}
              >
                <option value="">Select Category</option>
                <option value="CapEx">Capital Expenditure</option>
                <option value="OpEx">Operational Expenditure</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "8px",
                }}
              >
                Amount <span style={{ color: "red" }}>*</span>
              </label>
              {/* FIX: Amount Input with Validation */}
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#666",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  ₱
                </span>
                <input
                  type="text"
                  name="amount"
                  value={formatAmountDisplay(data.amount)}
                  onChange={handleAmountInput}
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "10px 10px 10px 25px",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#007bff",
                    backgroundColor: "white",
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Funding Source (Source Account){" "}
              <span style={{ color: "red" }}>*</span>
            </label>
            <div
              style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}
            >
              Source of funds (e.g. Retained Earnings, Cash in Bank)
            </div>
            <select
              name="debit_account"
              value={data.debit_account}
              onChange={onChange}
              disabled={!data.department}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "14px",
                backgroundColor: !data.department ? "#f5f5f5" : "white",
              }}
            >
              <option value="">Select Source Account</option>
              {dropdowns.debitAccounts.map((acc) => (
                <option key={acc.id} value={acc.value}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Allocation Target (Destination Account){" "}
              <span style={{ color: "red" }}>*</span>
            </label>
            <div
              style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}
            >
              Expense account to receive budget (e.g. General Expenses,
              Equipment)
            </div>
            <select
              name="credit_account"
              value={data.credit_account}
              onChange={onChange}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              <option value="">Select Target Account</option>
              {dropdowns.creditAccounts.map((acc) => (
                <option key={acc.id} value={acc.value}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
          {/* MODIFICATION START: New Sub-Category Dropdown */}
          {isTargetBudgetAccount && (
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "8px",
                }}
              >
                Target Sub-Category <span style={{ color: "red" }}>*</span>
              </label>
              <div
                style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}
              >
                Specific bucket to receive funds (e.g. Data Tools, Hardware)
              </div>
              <select
                name="sub_category_id"
                value={data.sub_category_id || ""}
                onChange={onChange}
                disabled={!data.category}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: !data.category ? "#f5f5f5" : "white",
                }}
              >
                <option value="">
                  {!data.category
                    ? "Select Expense Category first"
                    : "Select Sub-Category"}
                </option>
                {filteredSubCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.code})
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* MODIFICATION END */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "20px",
              borderTop: "1px solid #eee",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 24px",
                background: "white",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 24px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              {type === "modify" ? "Create Adjustment" : "Allocate Funds"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AllocationFormModal;
