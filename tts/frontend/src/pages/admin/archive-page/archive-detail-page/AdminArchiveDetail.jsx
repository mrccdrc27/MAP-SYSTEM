// react
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";

// style
import styles from "./ticket-detail.module.css";
import general from "../../../../style/general.module.css";

// components
import AdminNav from "../../../../components/navigation/AdminNav";
import WorkflowTracker2 from "../../../../components/ticket/WorkflowVisualizer2";
import TicketComments from "../../../../components/ticket/TicketComments";
import ActionLogList from "../../../../components/ticket/ActionLogList";
import Messaging from "../../../../components/messaging";
import TransferTask from "../../../../components/modal/TransferTask";

// hooks
import useFetchActionLogs from "../../../../api/workflow-graph/useActionLogs";
import { useWorkflowProgress } from "../../../../api/workflow-graph/useWorkflowProgress";
import useAdminTicketDetail from "../../../../api/useAdminTicketDetail";
import { useAuth } from "../../../../context/AuthContext";

export default function AdminArchiveDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: ticketNumber } = useParams();
  
  // Fetch ticket data using the admin endpoint
  const {
    data: ticketData,
    loading,
    error,
    refetch,
  } = useAdminTicketDetail(ticketNumber);

  // Tabs with URL sync
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") || "Details";
  const [activeTab, setActiveTab] = useState(urlTab);

  // UI states
  const [showTicketInfo, setShowTicketInfo] = useState(true);
  const [openTransferModal, setOpenTransferModal] = useState(false);

  const toggleTicketInfoVisibility = useCallback(() => {
    setShowTicketInfo((prev) => !prev);
  }, []);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleTabClick = useCallback(
    (tab) => {
      setSearchParams({ tab });
      setActiveTab(tab);
    },
    [setSearchParams]
  );

  // Keep activeTab in sync with the URL
  useEffect(() => {
    const urlCurrent = searchParams.get("tab") || "Details";
    if (urlCurrent !== activeTab) setActiveTab(urlCurrent);
  }, [searchParams, activeTab]);

  // Format dates
  const formattedDates = useMemo(() => {
    if (!ticketData?.ticket?.created_at) return null;
    const date = new Date(ticketData.ticket.created_at);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  }, [ticketData?.ticket?.created_at]);

  // Action logs
  const { fetchActionLogs, logs } = useFetchActionLogs();
  useEffect(() => {
    if (ticketData?.ticket?.ticket_id) {
      fetchActionLogs(ticketData.ticket.ticket_id);
    }
  }, [ticketData?.ticket?.ticket_id, fetchActionLogs]);

  // Workflow progress tracker
  const { tracker } = useWorkflowProgress(ticketData?.ticket?.ticket_id);

  // Handle Navigate button - go to the ticket detail page
  const handleNavigateToTicket = () => {
    navigate(`/ticket/${ticketNumber}`);
  };

  // Handle Transfer button - open transfer modal
  const handleOpenTransfer = () => {
    setOpenTransferModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <>
        <AdminNav />
        <main className={styles.ticketDetailPage}>
          <section className={styles.tdpHeader}>
            <button
              className={styles.wpdBack}
              onClick={handleBack}
              aria-label="Go back"
              type="button"
            >
              <i className="fa fa-chevron-left"></i> Back
            </button>
          </section>
          <section className={styles.tdpBody}>
            <div style={{ padding: "2rem" }}>Loading ticket details...</div>
          </section>
        </main>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <AdminNav />
        <main className={styles.ticketDetailPage}>
          <section className={styles.tdpHeader}>
            <button
              className={styles.wpdBack}
              onClick={handleBack}
              aria-label="Go back"
              type="button"
            >
              <i className="fa fa-chevron-left"></i> Back
            </button>
          </section>
          <section className={styles.tdpBody}>
            <div style={{ padding: "2rem", color: "red" }}>{error}</div>
          </section>
        </main>
      </>
    );
  }

  // No data state
  if (!ticketData) {
    return (
      <>
        <AdminNav />
        <main className={styles.ticketDetailPage}>
          <section className={styles.tdpHeader}>
            <button
              className={styles.wpdBack}
              onClick={handleBack}
              aria-label="Go back"
              type="button"
            >
              <i className="fa fa-chevron-left"></i> Back
            </button>
          </section>
          <section className={styles.tdpBody}>
            <div style={{ padding: "2rem" }}>Ticket not found</div>
          </section>
        </main>
      </>
    );
  }

  const { ticket, workflow, current_step, current_owner, is_owner, has_workflow, admin_actions } = ticketData;

  return (
    <>
      <AdminNav />
      <main className={styles.ticketDetailPage}>
        {/* Header */}
        <section className={styles.tdpHeader}>
          <div>
            <button
              className={styles.wpdBack}
              onClick={handleBack}
              aria-label="Go back to tickets"
              type="button"
            >
              Ticket Archive
            </button>
            <span className={styles.wpdCurrent}> / {ticket?.ticket_number || ticketNumber}</span>
          </div>
        </section>
        
        <section className={styles.tdpHeaderTitle}>
          <h1>Admin Archive View</h1>
          {/* Admin ownership indicator */}
          <div style={{ marginTop: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
            {is_owner ? (
              <span className={general["status-in-progress"]} style={{ padding: "5px 10px", borderRadius: "4px" }}>
                ✓ You own this ticket
              </span>
            ) : (
              <span className={general["status-pending"]} style={{ padding: "5px 10px", borderRadius: "4px" }}>
                Owned by: {current_owner?.user_full_name || "Unknown"}
              </span>
            )}
          </div>
        </section>

        <section className={styles.tdpBody}>
          <div className={styles.layoutFlex}>
            {/* Left Column - Ticket Details */}
            <div className={styles.layoutSection} style={{ flex: 2 }}>
              <div className={styles.tdpTicketNoWrapper}>
                <h2 className={styles.tdpTicketNo}>
                  Ticket No. {ticket?.ticket_number || ticketNumber}
                </h2>
                {ticket?.priority && (
                  <div className={general[`priority-${ticket.priority.toLowerCase()}`]}>
                    {ticket.priority}
                  </div>
                )}
              </div>

              <div className={styles.tdpSection}>
                <div className={styles.tdpTitle}>
                  <strong>Subject: {ticket?.subject || "No subject"}</strong>
                </div>
                <div className={styles.tdpMeta}>
                  Opened On:{" "}
                  <span>
                    {formattedDates?.date}
                    {formattedDates?.time && ` at ${formattedDates?.time}`}
                  </span>
                </div>
                {ticket?.response_time && (
                  <div className={styles.tdpMeta}>
                    Expected Resolution:{" "}
                    <span>{new Date(ticket.response_time).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className={styles.tdpSection}>
                <div className={styles.tdpTitle}>
                  <strong>Description:</strong>
                </div>
                <p className={styles.tdpDescription}>
                  {ticket?.description || "No description provided."}
                </p>
              </div>

              {/* Workflow Info */}
              {has_workflow && workflow && (
                <div className={styles.tdpSection}>
                  <div className={styles.tdpTitle}>
                    <strong>Workflow:</strong>
                  </div>
                  <p>{workflow.name}</p>
                  {current_step && (
                    <div style={{ marginTop: "10px" }}>
                      <strong>Current Step:</strong> {current_step.name}
                      {current_step.role_name && (
                        <span style={{ color: "gray", marginLeft: "10px" }}>
                          ({current_step.role_name})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!has_workflow && (
                <div className={styles.tdpSection} style={{ padding: "20px", backgroundColor: "#fff3cd", borderRadius: "8px" }}>
                  <strong>⚠️ No Workflow Assigned</strong>
                  <p>This ticket has not been assigned to any workflow yet.</p>
                </div>
              )}

              {/* Comments Section */}
              {ticket?.ticket_id && <TicketComments ticketId={ticket.ticket_id} />}
            </div>

            {/* Right Column - Actions & Details */}
            <div className={styles.layoutColumn} style={{ flex: 1, minWidth: "300px" }}>
              {/* Admin Action Buttons */}
              <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {is_owner ? (
                  // Owner: Navigate button
                  <button
                    className={styles.transferButton}
                    onClick={handleNavigateToTicket}
                    style={{ backgroundColor: "#28a745" }}
                  >
                    <i className="fa fa-external-link" style={{ marginRight: "8px" }}></i>
                    Go to My Ticket
                  </button>
                ) : (
                  // Not owner: Transfer button (opens standard transfer modal)
                  <button
                    className={styles.transferButton}
                    onClick={handleOpenTransfer}
                    disabled={!has_workflow}
                    style={{ backgroundColor: has_workflow ? "#0d6efd" : "#6c757d" }}
                  >
                    <i className="fa fa-exchange" style={{ marginRight: "8px" }}></i>
                    Transfer
                  </button>
                )}
                
                {!has_workflow && !is_owner && (
                  <div style={{ 
                    padding: "10px", 
                    backgroundColor: "#fff3cd", 
                    color: "#856404",
                    borderRadius: "4px",
                    fontSize: "0.9rem"
                  }}>
                    ⚠️ Cannot transfer - ticket has no workflow assigned.
                  </div>
                )}
              </div>

              <div className={styles.layoutSection}>
                {/* Tabs */}
                <div className={styles.tdpTabs}>
                  {["Details", "Messages"].map((tab) => (
                    <button
                      style={{ flex: 1 }}
                      key={tab}
                      onClick={() => handleTabClick(tab)}
                      className={`${styles.tdpTabLink} ${activeTab === tab ? styles.active : ""}`}
                      type="button"
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Details Tab */}
                {activeTab === "Details" && (
                  <>
                    {/* Status Card */}
                    <div className={styles.tdStatusCard}>
                      <div className={styles.tdStatusLabel}>Status</div>
                      <div className={general[`status-${(ticket?.status || "pending").replace(/\s+/g, "-").toLowerCase()}`]}>
                        {ticket?.status || "Pending"}
                      </div>
                    </div>

                    {/* Workflow Tracker */}
                    {has_workflow && <WorkflowTracker2 workflowData={tracker} />}

                    {/* Details Section */}
                    <div className={styles.tdInfoWrapper}>
                      <div className={styles.tdInfoHeader}>
                        <h3>Ticket Details</h3>
                        <button
                          className={styles.tdArrow}
                          onClick={toggleTicketInfoVisibility}
                          aria-label={showTicketInfo ? "Hide details" : "Show details"}
                          type="button"
                        >
                          <i className={`fa-solid fa-caret-${showTicketInfo ? "down" : "up"}`}></i>
                        </button>
                      </div>
                      {showTicketInfo && (
                        <div className={styles.tdInfoItem}>
                          {/* Ticket Owner */}
                          <div className={styles.tdInfoLabelValue}>
                            <div className={styles.tdInfoLabel}>Ticket Creator</div>
                            <div className={styles.tdInfoValue}>
                              {ticket?.employee?.first_name
                                ? `${ticket.employee.first_name} ${ticket.employee.last_name}`
                                : ticket?.assigned_to || "N/A"}
                            </div>
                          </div>

                          {/* Current Owner */}
                          {current_owner && (
                            <>
                              <div className={styles.tdInfoLabelValue}>
                                <div className={styles.tdInfoLabel}>Current Owner</div>
                                <div className={styles.tdInfoValue}>
                                  {current_owner.user_full_name || "N/A"}
                                </div>
                              </div>
                              <div className={styles.tdInfoLabelValue}>
                                <div className={styles.tdInfoLabel}>Owner Role</div>
                                <div className={styles.tdInfoValue}>
                                  {current_owner.role || "N/A"}
                                </div>
                              </div>
                              <div className={styles.tdInfoLabelValue}>
                                <div className={styles.tdInfoLabel}>Assignment Status</div>
                                <div className={styles.tdInfoValue}>
                                  {current_owner.status || "N/A"}
                                </div>
                              </div>
                              <div className={styles.tdInfoLabelValue}>
                                <div className={styles.tdInfoLabel}>Assigned On</div>
                                <div className={styles.tdInfoValue}>
                                  {current_owner.assigned_on
                                    ? new Date(current_owner.assigned_on).toLocaleString()
                                    : "N/A"}
                                </div>
                              </div>
                              <div className={styles.tdInfoLabelValue}>
                                <div className={styles.tdInfoLabel}>Origin</div>
                                <div className={styles.tdInfoValue}>
                                  {current_owner.origin || "Initial Assignment"}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Workflow Info */}
                          {workflow && (
                            <div className={styles.tdInfoLabelValue}>
                              <div className={styles.tdInfoLabel}>Workflow</div>
                              <div className={styles.tdInfoValue}>
                                {workflow.name}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Logs */}
                    <div className={styles.actionLogs}>
                      <h4>Action Logs</h4>
                      <ActionLogList logs={logs} loading={loading} error={error} />
                    </div>
                  </>
                )}

                {/* Messages Tab */}
                {activeTab === "Messages" && (
                  <div className={styles.messageSection}>
                    {ticket?.ticket_id ? (
                      <Messaging
                        ticket_id={ticket.ticket_id}
                        ticket_owner={ticket?.employee || { username: ticket?.assigned_to }}
                      />
                    ) : (
                      <p>Messages not available for this ticket.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Transfer Task Modal */}
      {openTransferModal && (
        <TransferTask
          closeTransferModal={setOpenTransferModal}
          ticket={{
            ticket_id: ticket?.ticket_id,
            ticket_subject: ticket?.subject,
            user_assignment: current_owner?.user_full_name,
          }}
          taskItemId={ticketData?.task_item_id}
          currentOwner={current_owner?.user_full_name}
        />
      )}
    </>
  );
}
