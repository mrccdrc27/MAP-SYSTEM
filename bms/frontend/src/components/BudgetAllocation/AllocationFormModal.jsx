import React, { useEffect, useState } from "react"; // Added useState
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
  allCategories,
  errors,
}) => {
  // MODIFICATION START: strict logic for Account -> Category dependency
  const [lockedCategory, setLockedCategory] = useState(null);

  if (!isOpen) return null;

  // 1. Identify the Target Account Type
  const selectedTargetAccount = dropdowns.creditAccounts.find(
    (acc) => acc.value === data.credit_account,
  );

  const targetType = selectedTargetAccount?.type_name?.toLowerCase() || "";

  // 2. Filter Sub-Categories based on currently selected Category
  // This logic is mostly correct, but we ensure it matches the Classification strictly
  const filteredSubCategories = allCategories
    ? allCategories.filter((cat) => {
        const selectedClassification = data.category?.toUpperCase(); // "CAPEX" or "OPEX"
        const catClassification = cat.classification?.toUpperCase();

        // Must match Classification OR be Mixed
        return (
          (catClassification === selectedClassification ||
            catClassification === "MIXED") &&
          cat.level > 1 // Exclude root
        );
      })
    : [];

  // 3. Logic: Should we show the sub-category dropdown?
  const isTargetBudgetAccount =
    targetType === "expense" || targetType === "asset";

  // 4. Auto-Adjust & Lock Category based on Account Type
  useEffect(() => {
    if (!selectedTargetAccount) {
      setLockedCategory(null);
      return;
    }

    let requiredCategory = "";

    // BUSINESS LOGIC:
    // Assets (PPE, Equipment) -> Must use Capital Expenditure (CapEx)
    // Expenses (General, Travel) -> Must use Operational Expenditure (OpEx)

    if (targetType === "asset") {
      requiredCategory = "CapEx";
    } else if (targetType === "expense") {
      requiredCategory = "OpEx";
    }

    if (requiredCategory) {
      setLockedCategory(requiredCategory);
      // Only trigger update if it's different to prevent loops
      if (data.category !== requiredCategory) {
        // We mimic the event object to reuse the existing onChange handler
        const syntheticEvent = {
          target: { name: "category", value: requiredCategory },
        };
        onChange(syntheticEvent);

        // Clear sub-category if we switched types
        onChange({ target: { name: "sub_category_id", value: "" } });
      }
    } else {
      setLockedCategory(null);
    }
  }, [data.credit_account, targetType, data.category, onChange]);
  // MODIFICATION END

  const handleAmountInput = (e) => {
    const value = e.target.value;
    if (value === "") {
      onAmountChange({ target: { name: "amount", value: "" } });
      return;
    }
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      onAmountChange({ target: { name: "amount", value } });
    }
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

        {/* Error Display Block (kept same) */}
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
          {/* Ticket ID & Date Fields (kept same) */}
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

          {/* Source Account Field (moved up for logic flow) */}
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

          <div style={{ marginBottom: "20px" }}>
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
              Expense/Asset account to receive budget
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

          {/* MODIFICATION START: Category & Sub-Cat Block */}
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
              {/* Disable if locked by account choice */}
              <select
                name="category"
                value={data.category}
                onChange={onChange}
                disabled={!!lockedCategory}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: lockedCategory ? "#e9ecef" : "white", // Visual cue
                  color: lockedCategory ? "#495057" : "black",
                }}
              >
                <option value="">Select Category</option>
                <option value="CapEx">Capital Expenditure</option>
                <option value="OpEx">Operational Expenditure</option>
              </select>
              {lockedCategory && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#007bff",
                    marginTop: "4px",
                  }}
                >
                  Locked based on Target Account type.
                </div>
              )}
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
                  value={data.amount}
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
                Specific bucket (Filtered by {data.category || "Category"})
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

                {filteredSubCategories.length > 0 ? (
                  filteredSubCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No sub-categories found for {data.category}
                  </option>
                )}
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
