import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle,
  Lock,
  Unlock,
  XCircle,
} from "lucide-react";
import {
  getFiscalYears,
  createFiscalYear,
  updateFiscalYearStatus,
  getClosingPreview,
  processYearEnd as apiProcessYearEnd,
} from "../../API/fiscalYearAPI";
import { formatPeso, calculateProgress } from "../../utils/dashboardUtils";
import "./FiscalYearManagement.css";

const FiscalYearManagement = ({ summaryData }) => {
  // --- STATE ---
  const [fiscalYears, setFiscalYears] = useState([]);
  
  // Modal States
  const [showCreateFiscalYear, setShowCreateFiscalYear] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showYearEndProcessing, setShowYearEndProcessing] = useState(false);
  
  // Data States
  const [newFiscalYear, setNewFiscalYear] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });
  
  // Confirmation State
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [confirmAction, setConfirmAction] = useState(""); // "Lock", "Open", "Close"

  // Year End Logic State
  const [closingYearId, setClosingYearId] = useState("");
  const [openingYearId, setOpeningYearId] = useState("");
  const [previewAllocations, setPreviewAllocations] = useState([]);
  const [selectedCarryoverIds, setSelectedCarryoverIds] = useState([]);
  const [yearEndStep, setYearEndStep] = useState(1);

  // Derived State
  const currentActiveYear = fiscalYears.find((fy) => fy.is_active);

  // --- EFFECTS ---
  useEffect(() => {
    fetchFiscalYearsList();
  }, []);

  const fetchFiscalYearsList = async () => {
    try {
      const res = await getFiscalYears();
      setFiscalYears(res.data);
    } catch (error) {
      console.error("Failed to fetch fiscal years", error);
    }
  };

  // --- HANDLERS ---

  const handleCreateFiscalYear = async () => {
    try {
      await createFiscalYear(newFiscalYear);
      alert("Fiscal Year Created!");
      setShowCreateFiscalYear(false);
      setNewFiscalYear({ name: "", start_date: "", end_date: "" }); // Reset form
      fetchFiscalYearsList();
    } catch (error) {
      alert(
        "Error creating fiscal year: " +
          (error.response?.data?.detail || error.message)
      );
    }
  };

  const confirmStatusChange = (fy, action) => {
    setSelectedFiscalYear(fy);
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedFiscalYear || !confirmAction) return;
    
    // Map UI action to API status
    const statusMap = {
      "Lock": "Locked",
      "Open": "Open",
      "Close": "Closed"
    };
    
    const apiStatus = statusMap[confirmAction] || confirmAction;

    try {
      await updateFiscalYearStatus(selectedFiscalYear.id, apiStatus);
      fetchFiscalYearsList();
      setShowConfirmDialog(false);
    } catch (error) {
      alert("Error updating status: " + error.message);
    }
  };

  const handleGeneratePreview = async () => {
    if (!closingYearId) {
      alert("Select a year to close.");
      return;
    }
    try {
      const res = await getClosingPreview(closingYearId);
      setPreviewAllocations(res.data.allocations || []);

      // Auto-select "CARRYOVER" recommendations
      const recommended = res.data.allocations
        .filter((a) => a.recommended_action === "CARRYOVER")
        .map((a) => a.allocation_id);

      setSelectedCarryoverIds(recommended);
      setYearEndStep(2);
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    }
  };

  const handleProcessYearEnd = async () => {
    if (!openingYearId) {
      alert("Select a target New Year.");
      return;
    }
    if (
      !window.confirm(
        "This action is irreversible. The old year will be locked."
      )
    )
      return;

    try {
      await apiProcessYearEnd({
        closing_year_id: closingYearId,
        opening_year_id: openingYearId,
        allocation_ids: selectedCarryoverIds,
      });
      alert("Year-End Processing Successful!");
      setShowYearEndProcessing(false);
      setYearEndStep(1);
      fetchFiscalYearsList();
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    }
  };

  const toggleCarryover = (id) => {
    setSelectedCarryoverIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fy-container">
      {/* Header */}
      <div className="fy-header">
        <div className="fy-header-top">
          <h1 className="fy-title">Fiscal Year Management</h1>
          <div className="fy-actions">
            <button
              className="btn-year-end"
              onClick={() => setShowYearEndProcessing(true)}
            >
              <CalendarIcon size={18} /> Year-End Processing
            </button>
            <button
              className="btn-create-fy"
              onClick={() => setShowCreateFiscalYear(true)}
            >
              <Plus size={18} /> Create Fiscal Year
            </button>
          </div>
        </div>
        <p className="fy-description">
          Manage fiscal years, view status overview, and perform year-end processing.
        </p>
      </div>

      {/* Current Active Year Section */}
      {currentActiveYear ? (
        <div className="active-year-section">
          <div className="section-header">
            <CheckCircle size={20} color="#007bff" />
            <h3 className="section-title">Current Active Year</h3>
          </div>

          <div className="fy-stats-grid">
            {/* 1. Status Card */}
            <div className="fy-stat-card">
              <div>
                <h4 className="fy-stat-label">Fiscal Year</h4>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="fy-stat-value-large">{currentActiveYear.name}</span>
                  <span className="fy-badge-active">Active</span>
                </div>
              </div>
              <div className="fy-card-footer">
                <CalendarIcon size={14} />
                {currentActiveYear.start_date} — {currentActiveYear.end_date}
              </div>
            </div>

            {/* 2. Total Budget Card */}
            <div className="fy-stat-card">
              <div>
                <h4 className="fy-stat-label">Total Budget Allocated</h4>
                <span className="fy-stat-value-primary">
                  {formatPeso(summaryData?.total_budget || 0)}
                </span>
              </div>
              <div className="fy-card-footer">
                For {currentActiveYear.name}
              </div>
            </div>

            {/* 3. Progress Card */}
            <div className="fy-stat-card">
              <div>
                <div className="fy-progress-header">
                  <h4 className="fy-stat-label" style={{ marginBottom: 0 }}>Year Progress</h4>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                    {calculateProgress(currentActiveYear.start_date, currentActiveYear.end_date)}%
                  </span>
                </div>
                <div className="fy-progress-container">
                  <div
                    className="fy-progress-bar"
                    style={{
                      width: `${calculateProgress(currentActiveYear.start_date, currentActiveYear.end_date)}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="fy-card-footer">
                Based on current date vs end date
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "20px", background: "#fff3cd", color: "#856404", borderRadius: "8px", marginBottom: "30px" }}>
          <strong>Notice:</strong> No fiscal year is currently active. Please set a year to "Open".
        </div>
      )}

      {/* Fiscal Year List Table */}
      <div className="fy-table-card">
        <div className="fy-table-header">
          <h3 style={{ margin: 0, fontSize: "18px", color: "#333" }}>Fiscal Year List</h3>
        </div>
        <table className="fy-table">
          <thead>
            <tr>
              <th style={{ width: "20%" }}>Name</th>
              <th style={{ width: "20%" }}>Start Date</th>
              <th style={{ width: "20%" }}>End Date</th>
              <th style={{ width: "15%", textAlign: "center" }}>Status</th>
              <th style={{ width: "25%", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fiscalYears.map((fy) => (
              <tr key={fy.id} className={fy.is_current ? "fy-row-current" : ""}>
                <td style={{ fontWeight: "500", color: "#333" }}>{fy.name}</td>
                <td style={{ color: "#555" }}>{fy.start_date}</td>
                <td style={{ color: "#555" }}>{fy.end_date}</td>
                <td style={{ textAlign: "center" }}>
                  {fy.is_active && !fy.is_locked && <span className="badge-open">Open</span>}
                  {fy.is_locked && fy.is_active && <span className="badge-locked">Locked</span>}
                  {fy.is_locked && !fy.is_active && <span className="badge-closed">Closed</span>}
                  {!fy.is_active && !fy.is_locked && <span className="badge-inactive">Inactive</span>}
                </td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    {!fy.is_locked ? (
                      <button 
                        className="action-btn btn-lock"
                        onClick={() => confirmStatusChange(fy, "Lock")}
                      >
                        <Lock size={12} /> Lock
                      </button>
                    ) : (
                      <>
                        <button 
                          className="action-btn btn-reopen"
                          onClick={() => confirmStatusChange(fy, "Open")}
                        >
                          <Unlock size={12} /> Re-Open
                        </button>
                        {fy.is_active && (
                          <button 
                            className="action-btn btn-close"
                            onClick={() => confirmStatusChange(fy, "Close")}
                          >
                            <XCircle size={12} /> Close
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODALS --- */}

      {/* Create Fiscal Year Modal */}
      {showCreateFiscalYear && (
        <div className="modal-overlay">
          <div className="modal-content-small">
            <h3 className="modal-title">Create Fiscal Year</h3>
            
            <div className="form-group">
              <label className="form-label">Fiscal Year Name</label>
              <input
                type="text"
                className="form-input"
                value={newFiscalYear.name}
                onChange={(e) => setNewFiscalYear(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., FY-2027"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={newFiscalYear.start_date}
                onChange={(e) => setNewFiscalYear(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={newFiscalYear.end_date}
                onChange={(e) => setNewFiscalYear(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCreateFiscalYear(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleCreateFiscalYear}>Create Fiscal Year</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedFiscalYear && (
        <div className="modal-overlay">
          <div className="modal-content-small" style={{ width: "400px" }}>
            <h3 className="modal-title" style={{ fontSize: "18px" }}>Confirm Action</h3>
            <p style={{ marginBottom: "25px", color: "#495057" }}>
              Are you sure you want to {confirmAction.toLowerCase()} fiscal year "{selectedFiscalYear.name}"?
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" style={{ padding: "8px 16px" }} onClick={() => setShowConfirmDialog(false)}>Cancel</button>
              <button 
                className="btn-confirm" 
                style={{ 
                  padding: "8px 16px", 
                  backgroundColor: confirmAction === "Close" ? "#dc3545" : "#007bff" 
                }}
                onClick={handleConfirmAction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Year-End Processing Modal */}
      {showYearEndProcessing && (
        <div className="modal-overlay">
          <div className="modal-content-large">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", color: "#333" }}>Year-End Processing</h3>
              <button onClick={() => setShowYearEndProcessing(false)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#6c757d" }}>×</button>
            </div>

            {/* STEP 1: Select Old Year */}
            {yearEndStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                  Select the fiscal year you want to close. The system will calculate remaining budgets for all active allocations.
                </p>
                <div className="form-group">
                  <label className="form-label">Select Year to Close (Old)</label>
                  <select
                    className="form-input"
                    onChange={(e) => setClosingYearId(e.target.value)}
                    value={closingYearId}
                  >
                    <option value="">-- Select --</option>
                    {fiscalYears.filter((fy) => !fy.is_locked).map((fy) => (
                      <option key={fy.id} value={fy.id}>{fy.name}</option>
                    ))}
                  </select>
                </div>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowYearEndProcessing(false)}>Cancel</button>
                  <button
                    className="btn-confirm"
                    onClick={handleGeneratePreview}
                    disabled={!closingYearId}
                    style={{ background: closingYearId ? "#007bff" : "#ccc", cursor: closingYearId ? "pointer" : "not-allowed" }}
                  >
                    Calculate & Preview
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Review & Carryover */}
            {yearEndStep === 2 && (
              <div>
                <div style={{ marginBottom: "20px", display: "flex", gap: "20px", alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Target New Year (Opening)</label>
                    <select
                      className="form-input"
                      onChange={(e) => setOpeningYearId(e.target.value)}
                      value={openingYearId}
                    >
                      <option value="">-- Select --</option>
                      {fiscalYears
                        .filter((fy) => fy.is_active && !fy.is_locked && fy.id !== parseInt(closingYearId))
                        .map((fy) => (
                          <option key={fy.id} value={fy.id}>{fy.name}</option>
                        ))}
                    </select>
                  </div>
                  <div style={{ paddingBottom: "10px", fontSize: "14px", color: "#666" }}>
                    <strong>{previewAllocations.length}</strong> allocations found.
                  </div>
                </div>

                <div style={{ border: "1px solid #e9ecef", borderRadius: "4px", overflow: "hidden", marginBottom: "20px", maxHeight: "400px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#f8f9fa", borderBottom: "1px solid #e9ecef", position: "sticky", top: 0 }}>
                      <tr>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", color: "#495057" }}>Department</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", color: "#495057" }}>Category</th>
                        <th style={{ padding: "12px", textAlign: "right", fontSize: "13px", color: "#495057" }}>Remaining</th>
                        <th style={{ padding: "12px", textAlign: "center", fontSize: "13px", color: "#495057" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewAllocations.length > 0 ? (
                        previewAllocations.map((alloc) => (
                          <tr key={alloc.allocation_id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                            <td style={{ padding: "12px", fontSize: "13px", color: "#333" }}>{alloc.department}</td>
                            <td style={{ padding: "12px", fontSize: "13px", color: "#555" }}>{alloc.category}</td>
                            <td style={{ padding: "12px", textAlign: "right", fontSize: "13px", fontWeight: "500", color: "#28a745" }}>
                              {formatPeso(alloc.remaining_balance)}
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", fontSize: "13px", gap: "8px" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedCarryoverIds.includes(alloc.allocation_id)}
                                  onChange={() => toggleCarryover(alloc.allocation_id)}
                                  style={{ cursor: "pointer" }}
                                />
                                {selectedCarryoverIds.includes(alloc.allocation_id) ? 
                                  <span style={{ color: "#28a745", fontWeight: "500" }}>Carryover</span> : 
                                  <span style={{ color: "#dc3545", fontWeight: "500" }}>Expire</span>
                                }
                              </label>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#666" }}>No remaining balances found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setYearEndStep(1)} style={{ background: "white", color: "#333", border: "1px solid #ced4da" }}>Back</button>
                  <button
                    className="btn-confirm"
                    onClick={handleProcessYearEnd}
                    disabled={!openingYearId}
                    style={{ background: openingYearId ? "#28a745" : "#ccc", cursor: openingYearId ? "pointer" : "not-allowed" }}
                  >
                    Process & Close Year
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FiscalYearManagement;