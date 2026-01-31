import React from "react";
import { ArrowLeft, Printer, X } from "lucide-react";

const ProposalDetailModal = ({ isOpen, detail, loading, onClose, onPrint }) => {
  if (!isOpen) return null;

  return (
    <div
      className="popup-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 1100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        className="review-popup"
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "800px",
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "20px",
        }}
      >
        <div
          className="popup-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={onClose}
              style={{ border: "none", background: "none", cursor: "pointer", color: "#007bff", outline: "none" }}
            >
              <ArrowLeft size={20} />
            </button>
            <h2 style={{ margin: 0, fontSize: "18px" }}>Proposal Details</h2>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onPrint}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "8px 12px",
                border: "1px solid #007bff",
                borderRadius: "4px",
                backgroundColor: "white",
                color: "#007bff",
                cursor: "pointer",
                outline: "none",
                fontSize: "13px",
              }}
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={onClose}
              style={{ border: "none", background: "none", cursor: "pointer", outline: "none" }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {loading || !detail ? (
          <div style={{ textAlign: "center", padding: "40px", fontSize: "13px" }}>Loading details...</div>
        ) : (
          <div id="printable-area">
            <div className="proposal-header" style={{ marginBottom: "20px" }}>
              <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>{detail.title}</h3>
              <div style={{ color: "#666", fontSize: "12px" }}>
                Ticket ID: {detail.external_system_id} | Status: {detail.status}
              </div>
            </div>

            <div
              className="details-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "20px",
                fontSize: "13px",
              }}
            >
              <div><strong>Category:</strong> {detail.category}</div>
              <div><strong>Sub-Category:</strong> {detail.sub_category || detail.items?.[0]?.cost_element || "N/A"}</div>
              <div><strong>Department:</strong> {detail.department_name}</div>
              <div><strong>Submitted By:</strong> {detail.submitted_by_name}</div>
              <div><strong>Budget Amount:</strong> ₱{parseFloat(detail.total_cost).toLocaleString()}</div>
              <div><strong>Date Submitted:</strong> {new Date(detail.submitted_at).toLocaleDateString()}</div>
            </div>

            <div className="section" style={{ marginBottom: "20px" }}>
              <h4 style={{ borderBottom: "1px solid #eee", paddingBottom: "5px", fontSize: "14px" }}>Project Summary</h4>
              <p style={{ fontSize: "13px" }}>{detail.project_summary}</p>
            </div>

            <div className="section" style={{ marginBottom: "20px" }}>
              <h4 style={{ borderBottom: "1px solid #eee", paddingBottom: "5px", fontSize: "14px" }}>Project Description</h4>
              <p style={{ fontSize: "13px" }}>{detail.project_description}</p>
            </div>

            <div className="section" style={{ marginBottom: "20px" }}>
              <h4 style={{ borderBottom: "1px solid #eee", paddingBottom: "5px", fontSize: "14px" }}>Period of Performance</h4>
              <p style={{ fontSize: "13px" }}>
                {new Date(detail.performance_start_date).toLocaleDateString()} to {new Date(detail.performance_end_date).toLocaleDateString()}
              </p>
            </div>

            {detail.items && (
              <div className="section" style={{ marginBottom: "20px" }}>
                <h4 style={{ borderBottom: "1px solid #eee", paddingBottom: "5px", fontSize: "14px" }}>Cost Elements</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                      <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Description</th>
                      <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "right" }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{item.description}</td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #eee", textAlign: "right" }}>
                          ₱{parseFloat(item.estimated_cost).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ padding: "8px", fontWeight: "bold", textAlign: "right" }}>Total:</td>
                      <td style={{ padding: "8px", fontWeight: "bold", textAlign: "right", color: "#007bff" }}>
                        ₱{parseFloat(detail.total_cost).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            
            {/* ✅ FIXED: Finance Review Section with Signature Display */}
            {(detail.status === "APPROVED" || detail.status === "REJECTED") && (
              <div style={{ 
                marginTop: "30px", 
                padding: "20px", 
                backgroundColor: "#f9f9f9", 
                borderRadius: "8px",
                border: "1px solid #e9ecef"
              }}>
                <h4 style={{ 
                  fontSize: "14px", 
                  marginBottom: "15px",
                  color: "#495057",
                  fontWeight: "600"
                }}>
                  Finance Department Approval
                </h4>
                
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "1fr 1fr", 
                  gap: "15px", 
                  fontSize: "13px",
                  marginBottom: "15px"
                }}>
                  {/* ✅ FIX: Show BOTH names for transparency */}
                  <div>
                    <strong style={{ color: "#6c757d" }}>Finance Manager:</strong>
                    <div style={{ marginTop: "4px" }}>
                      {detail.finance_manager_name || detail.approved_by_name || "N/A"}
                    </div>
                  </div>
                  
                  <div>
                    <strong style={{ color: "#6c757d" }}>Approved By (System User):</strong>
                    <div style={{ marginTop: "4px" }}>
                      {detail.approved_by_name || detail.rejected_by_name || "N/A"}
                    </div>
                  </div>
                  
                  <div>
                    <strong style={{ color: "#6c757d" }}>Review Date:</strong>
                    <div style={{ marginTop: "4px" }}>
                      {new Date(detail.approval_date || detail.rejection_date).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div>
                    <strong style={{ color: "#6c757d" }}>Decision:</strong>
                    <div style={{ 
                      marginTop: "4px",
                      color: detail.status === "APPROVED" ? "#0d6832" : "#9b1c1c",
                      fontWeight: "600"
                    }}>
                      {detail.status}
                    </div>
                  </div>
                </div>

                {/* ✅ NEW: Signature Display Section */}
                {detail.signature && (
                  <div style={{ marginTop: "15px" }}>
                    <strong style={{ 
                      fontSize: "13px", 
                      color: "#6c757d",
                      display: "block",
                      marginBottom: "8px"
                    }}>
                      Digital Signature:
                    </strong>
                    <div style={{
                      padding: "10px",
                      backgroundColor: "white",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      display: "inline-block"
                    }}>
                      <img
                        src={detail.signature}
                        alt="Finance Manager Signature"
                        style={{
                          maxWidth: "300px",
                          maxHeight: "100px",
                          display: "block"
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div style={{ 
                        display: "none", 
                        color: "#dc3545",
                        fontSize: "12px",
                        fontStyle: "italic"
                      }}>
                        Signature image failed to load
                      </div>
                    </div>
                  </div>
                )}

                {/* ✅ NEW: Comments Section */}
                {detail.comments && detail.comments.length > 0 && (
                  <div style={{ marginTop: "15px" }}>
                    <strong style={{ 
                      fontSize: "13px", 
                      color: "#6c757d",
                      display: "block",
                      marginBottom: "8px"
                    }}>
                      Review Comments:
                    </strong>
                    <div style={{
                      padding: "10px",
                      backgroundColor: "white",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      fontSize: "13px",
                      lineHeight: "1.5"
                    }}>
                      {detail.comments.map((comment, idx) => (
                        <div key={idx} style={{ marginBottom: idx < detail.comments.length - 1 ? "8px" : "0" }}>
                          <strong>{comment.user_username}:</strong> {comment.comment}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalDetailModal;