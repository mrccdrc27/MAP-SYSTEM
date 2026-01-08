// react
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";

// style
import styles from "../../../unified-page/ticket-detail-page/ticket-detail.module.css";
import general from "../../../../style/general.module.css";

// components
import AdminNav from "../../../../components/navigation/AdminNav";
import Toast from "../../../../components/modal/Toast";
import WorkflowTracker2 from "../../../../components/ticket/WorkflowVisualizer2";
import TicketComments from "../../../../components/ticket/TicketComments";
import ActionLogList from "../../../../components/ticket/ActionLogList";
import Messaging from "../../../../components/messaging";
import TransferTask from "../../../../components/modal/TransferTask";
import SLAStatus from "../../../../components/ticket/SLAStatus";

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
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

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
          <section className={styles.tdpHeaderTitle}>
            <h1>Loading Archive Details...</h1>
          </section>
          <section className={styles.tdpBody}>
            <div className={styles.layoutFlex}>
              <div
                className={styles.layoutSection}
                style={{ flex: 2, textAlign: "center", padding: "3rem" }}
              >
                <i
                  className="fa fa-spinner fa-spin"
                  style={{
                    fontSize: "2rem",
                    color: "var(--primary-color)",
                    marginBottom: "1rem",
                  }}
                ></i>
                <p style={{ color: "var(--muted-text-color)" }}>
                  Fetching ticket details...
                </p>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  // Error state
  if (error) {
    // Determine error type and customize messaging
    let errorType = "notFound";
    let errorIcon = "fa-exclamation-circle";
    let errorTitle = "Archive Not Found";
    let errorMessage = error;
    let errorSubtext =
      "The archived ticket you're looking for doesn't exist or has been removed.";

    if (
      error.includes("no authorization") ||
      error.includes("not assigned to you")
    ) {
      errorType = "unauthorized";
      errorIcon = "fa-lock";
      errorTitle = "Access Denied";
      errorMessage = "You don't have permission to view this archived ticket.";
      errorSubtext =
        "Only authorized administrators can view archived ticket details.";
    } else if (
      error.includes("Authentication required") ||
      error.includes("401")
    ) {
      errorType = "unauthorized";
      errorIcon = "fa-user-circle";
      errorTitle = "Authentication Required";
      errorMessage = "Your session has expired or you are not logged in.";
      errorSubtext = "Please log in again to continue.";
    } else if (error.includes("not found") || error.includes("404")) {
      errorType = "notFound";
      errorIcon = "fa-search";
      errorTitle = "Archive Not Found";
      errorMessage = error;
      errorSubtext = "The archived ticket you're looking for doesn't exist.";
    } else if (error.includes("Failed to fetch")) {
      errorType = "forbidden";
      errorIcon = "fa-network-wired";
      errorTitle = "Connection Error";
      errorMessage = "Failed to fetch archived ticket data. Please try again.";
      errorSubtext =
        "Check your internet connection and try refreshing the page.";
    }

    return (
      <>
        <AdminNav />
        <main className={styles.ticketDetailPage}>
          <section className={styles.tdpHeader}>
            <button
              className={styles.wpdBack}
              onClick={handleBack}
              aria-label="Go back to archive"
              type="button"
            >
              Ticket Archive
            </button>
            <span className={styles.wpdCurrent}> / Error</span>
          </section>

          <section className={styles.errorContainer}>
            <div className={`${styles.errorBox} ${styles[errorType]}`}>
              <i className={`fa-solid ${errorIcon} ${styles.errorIcon}`}></i>
              <h2 className={styles.errorTitle}>{errorTitle}</h2>
              <p className={styles.errorMessage}>{errorMessage}</p>
              <p className={styles.errorSubtext}>{errorSubtext}</p>

              <div className={styles.errorActions}>
                <button
                  className={styles.errorBackButton}
                  onClick={handleBack}
                  type="button"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                  Go Back
                </button>
                <button
                  className={styles.errorRefreshButton}
                  onClick={() => window.location.reload()}
                  type="button"
                >
                  <i className="fa-solid fa-arrows-rotate"></i>
                  Refresh
                </button>
              </div>
            </div>
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

  const {
    ticket,
    workflow,
    current_step,
    current_owner,
    is_owner,
    has_workflow,
    admin_actions,
  } = ticketData;

  // console.log("ARCHIVE TICKET", ticket);

  return (
    <>
      <AdminNav />
      {/* Page-level toast (shows outside modals) */}
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
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
              Tickets
            </button>
            <span className={styles.wpdCurrent}>
              {" "}
              {/* / {ticket?.ticket_number || ticketNumber} */}/ Ticket Detail
            </span>
          </div>
        </section>

        <section className={styles.tdpHeaderTitle}>
          <h1>Manage Ticket Overview</h1>
          {/* Admin ownership indicator */}
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            {is_owner ? (
              <span
                className={general["status-in-progress"]}
                style={{ padding: "5px 10px", borderRadius: "4px" }}
              >
                ✓ You own this ticket
              </span>
            ) : (
              <span
                className={general["status-pending"]}
                style={{ padding: "5px 10px", borderRadius: "4px" }}
              >
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
                  <div
                    className={
                      general[`priority-${ticket.priority.toLowerCase()}`]
                    }
                  >
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
                    <span>
                      {new Date(ticket.response_time).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.tdpSection}>
                <div className={styles.tdpTitle}>
                  <strong>Owner Description:</strong>
                </div>
                <div className={styles.tdpOwnerDescWrapper}>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Name:</div>
                    <div className={styles.tdpODWValue}>
                      {ticket?.employee?.first_name
                        ? `${ticket.employee.first_name} ${ticket.employee.last_name}`
                        : "N/A"}
                    </div>
                  </div>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Email:</div>
                    <div className={styles.tdpODWValue}>
                      {ticket?.employee?.email || "N/A"}
                    </div>
                  </div>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Company ID:</div>
                    <div className={styles.tdpODWValue}>
                      {ticket?.employee?.company_id || "N/A"}
                    </div>
                  </div>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Department:</div>
                    <div className={styles.tdpODWValue}>
                      {ticket?.employee?.department || "N/A"}
                    </div>
                  </div>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Role:</div>
                    <div className={styles.tdpODWValue}>
                      {ticket?.employee?.role || "N/A"}
                    </div>
                  </div>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Current Owner:</div>
                    <div className={styles.tdpODWValue}>
                      {current_owner?.user_full_name || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket Owner Description */}
              <div className={styles.tdpSection}>
                <div className={styles.tdpTitle}>
                  <strong>Description:</strong>
                </div>
                <p className={styles.tdpDescription}>
                  {ticket?.description || "No description provided."}
                </p>
              </div>

              {/* Attachments Section */}
              <div className={styles.tdAttachment}>
                <h3>Attachments</h3>
                {ticket?.attachments && ticket.attachments.length > 0 ? (
                  <div className={styles.attachmentList}>
                    {ticket.attachments.map((file) => {
                      // Construct full URL for the attachment using helpdesk service URL
                      const baseUrl =
                        import.meta.env.VITE_HELPDESK_SERVICE_URL ||
                        "http://localhost:8000";
                      const fileUrl = `${baseUrl}/api/attachments/${file.file_path}`;

                      // Determine icon based on file type
                      const getFileIcon = (fileType) => {
                        if (fileType?.includes("pdf")) return "fa-file-pdf";
                        if (fileType?.includes("image")) return "fa-file-image";
                        if (
                          fileType?.includes("word") ||
                          fileType?.includes("document")
                        )
                          return "fa-file-word";
                        if (
                          fileType?.includes("excel") ||
                          fileType?.includes("spreadsheet")
                        )
                          return "fa-file-excel";
                        if (
                          fileType?.includes("powerpoint") ||
                          fileType?.includes("presentation")
                        )
                          return "fa-file-powerpoint";
                        if (
                          fileType?.includes("zip") ||
                          fileType?.includes("archive")
                        )
                          return "fa-file-zipper";
                        if (fileType?.includes("text")) return "fa-file-lines";
                        return "fa-file";
                      };

                      // Format file size
                      const formatFileSize = (bytes) => {
                        if (!bytes) return "";
                        if (bytes < 1024) return `${bytes} B`;
                        if (bytes < 1024 * 1024)
                          return `${(bytes / 1024).toFixed(1)} KB`;
                        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                      };

                      return (
                        <div key={file.id} className={styles.attachmentItem}>
                          <i
                            className={`fa-solid ${getFileIcon(
                              file.file_type
                            )} ${styles.attachmentIcon}`}
                          ></i>
                          <div className={styles.attachmentInfo}>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.attachmentName}
                              title={file.file_name}
                            >
                              {file.file_name}
                            </a>
                            <span className={styles.attachmentMeta}>
                              {formatFileSize(file.file_size)}
                            </span>
                          </div>
                          <a
                            href={fileUrl}
                            download={file.file_name}
                            className={styles.attachmentDownload}
                            title="Download file"
                          >
                            <i className="fa-solid fa-download"></i>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.tdAttached}>
                    <i className="fa-solid fa-paperclip"></i>
                    <span className={styles.placeholderText}>
                      No attachments available.
                    </span>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              {ticket?.ticket_id && (
                <TicketComments ticketId={ticket.ticket_id} />
              )}
            </div>

            {/* Right Column - Actions & Details */}
            <div
              className={styles.layoutColumn}
              style={{ flex: 1, minWidth: "300px" }}
            >
              {/* Admin Action Buttons */}
              <div className={styles.layoutFlexButton}>
                {is_owner ? (
                  // Owner: Navigate to active ticket button
                  <button
                    className={styles.ticketActionButton}
                    onClick={handleNavigateToTicket}
                    style={{ backgroundColor: "#28a745", color: "white" }}
                  >
                    <span className={styles.iconTextWrapper}>
                      <i className="fa fa-external-link"></i>
                      Go to Active Ticket
                    </span>
                  </button>
                ) : (
                  <button
                    className={
                      !has_workflow
                        ? styles.transferButtonDisabled
                        : styles.transferButton
                    }
                    onClick={handleOpenTransfer}
                    disabled={!has_workflow}
                  >
                    <span className={styles.iconTextWrapper}>
                      <i className="fa fa-exchange"></i>
                      Transfer Ownership
                    </span>
                  </button>
                )}

                {/* View Live Ticket Button - Always available for admins */}
                {/* <button
                  className={styles.escalateButton}
                  onClick={handleNavigateToTicket}
                  style={{ backgroundColor: "#17a2b8", color: "white" }}
                >
                  <span className={styles.iconTextWrapper}>
                    <i className="fa fa-eye"></i>
                    View Live Ticket
                  </span>
                </button> */}
              </div>

              {!has_workflow && (
                <div
                  className={styles.tdpSection}
                  style={{
                    backgroundColor: "#fff3cd",
                    color: "#856404",
                    borderLeft: "4px solid #ffc107",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    marginBottom: "20px",
                  }}
                >
                  <i
                    className="fa fa-exclamation-triangle"
                    style={{ marginRight: "8px" }}
                  ></i>
                  <strong>No Workflow Assigned:</strong> This archived ticket
                  was not assigned to any workflow. Transfer functionality is
                  not available.
                </div>
              )}

              <div className={styles.layoutSection}>
                {/* Tabs */}
                <div className={styles.tdpTabs}>
                  {["Details", "Messages"].map((tab) => (
                    <button
                      style={{ flex: 1 }}
                      key={tab}
                      onClick={() => handleTabClick(tab)}
                      className={`${styles.tdpTabLink} ${
                        activeTab === tab ? styles.active : ""
                      }`}
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
                      <h4>Archive Status</h4>
                      <div
                        className={
                          general[
                            `status-${(ticket?.status || "pending")
                              .replace(/\s+/g, "-")
                              .toLowerCase()}`
                          ]
                        }
                        style={{ position: "relative" }}
                      >
                        <i
                          className="fa fa-archive"
                          style={{ marginRight: "6px", opacity: 0.7 }}
                        ></i>
                        {ticket?.status || "Pending"}
                        <span
                          style={{
                            fontSize: "0.75em",
                            opacity: 0.8,
                            marginLeft: "8px",
                          }}
                        >
                          (Archived)
                        </span>
                      </div>
                    </div>

                    {/* Workflow Tracker */}
                    {has_workflow && (
                      <WorkflowTracker2 workflowData={tracker} />
                    )}

                    {/* sla */}
                    <div className={styles.tdSLA}>
                      <h4>SLA Information</h4>
                      {/* Here */}
                      <SLAStatus
                        ticket={ticket}
                        targetResolution={ticket?.target_resolution}
                        className={styles.slaStatusSection}
                      />
                    </div>

                    {/* Action Logs */}
                    <div className={styles.actionLogs}>
                      <h4>Action Logs</h4>
                      <ActionLogList
                        logs={logs}
                        loading={loading}
                        error={error}
                      />
                    </div>
                  </>
                )}

                {/* Messages Tab */}
                {activeTab === "Messages" && (
                  <div className={styles.messageSection}>
                    {ticket?.ticket_id ? (
                      <Messaging
                        ticket_id={ticket.ticket_id}
                        ticket_owner={
                          ticket?.employee || { username: ticket?.assigned_to }
                        }
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
