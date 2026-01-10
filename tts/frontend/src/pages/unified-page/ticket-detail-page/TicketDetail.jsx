// react
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { useEffect, useState, useCallback, useReducer } from "react";
import { useSearchParams } from "react-router-dom";

// style
import styles from "./ticket-detail.module.css";
import general from "../../../style/general.module.css";

// components
import Nav from "../../../components/navigation/Nav";
import Toast from "../../../components/modal/Toast";
import WorkflowTracker2 from "../../../components/ticket/WorkflowVisualizer2";
import TicketComments from "../../../components/ticket/TicketComments";
import ActionLogList from "../../../components/ticket/ActionLogList";
import Messaging from "../../../components/messaging";
import SLAStatus from "../../../components/ticket/SLAStatus";

// hooks
import useFetchActionLogs from "../../../api/workflow-graph/useActionLogs";
import { useWorkflowProgress } from "../../../api/workflow-graph/useWorkflowProgress";
import useTicketDetail from "../../../api/useTicketDetail";
import { useAuth } from "../../../context/AuthContext";

// modal
import TicketAction from "./modals/TicketAction";
import EscalateTicket from "./modals/EscalateTicket";
import TransferTask from "../../../components/modal/TransferTask";

export default function TicketDetail() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { ticketNumber } = useParams();

  // Get task_item_id from query params to identify specific TaskItem
  // This is critical when user has multiple TaskItems for the same ticket
  const [searchParams, setSearchParams] = useSearchParams();
  const taskItemIdFromUrl = searchParams.get("task_item_id");

  const {
    stepInstance,
    loading: instanceLoading,
    error: instanceError,
  } = useTicketDetail(ticketNumber, taskItemIdFromUrl);

  // Tabs with URL sync
  const urlTab = searchParams.get("tab") || "Details";
  const [activeTab, setActiveTab] = useState(urlTab);

  // States
  const initialState = {
    ticket: null,
    action: [],
    instance: null,
    instruction: "",
    taskid: null,
    currentOwner: null,
    canAct: true, // Can user take any action on this task item?
  };

  function reducer(state, action) {
    switch (action.type) {
      case "SET_TICKET":
        return {
          ...state,
          ticket: action.payload.ticket,
          action: action.payload.action,
          instruction: action.payload.instruction,
          instance: action.payload.instance,
          taskid: action.payload.taskid,
          currentOwner: action.payload.currentOwner,
          canAct: action.payload.canAct,
        };
      case "RESET":
        return initialState;
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTicketAction, setOpenTicketAction] = useState(false);
  const [openEscalateModal, setOpenEscalateModal] = useState(false);
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [showTicketInfo, setShowTicketInfo] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const toggTicketInfosVisibility = useCallback(() => {
    setShowTicketInfo((prev) => !prev);
  }, []);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  // Tab handling: update URL and component state
  const handleTabClick = useCallback(
    (tab) => {
      setSearchParams({ tab });
      setActiveTab(tab);
    },
    [setSearchParams]
  );

  // Keep activeTab in sync with the URL (respond to back/forward)
  useEffect(() => {
    const urlCurrent = searchParams.get("tab") || "Details";
    if (urlCurrent !== activeTab) setActiveTab(urlCurrent);
  }, [searchParams]);

  const formattedDates = useMemo(() => {
    if (!state.ticket?.created_at) return null;

    // Formatting creation date
    const createdAtDate = new Date(state.ticket.created_at);
    const formattedCreatedAt = {
      date: createdAtDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: createdAtDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };

    // Formatting target resolution date
    const targetResolutionDate = new Date(state.ticket?.target_resolution);
    const formattedTargetResolution = {
      date: targetResolutionDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: targetResolutionDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };

    return {
      createdAt: formattedCreatedAt,
      targetResolution: formattedTargetResolution,
    };
  }, [state.ticket?.created_at, state.ticket?.target_resolution]);

  useEffect(() => {
    // Handle loading state
    if (instanceLoading) {
      setLoading(true);
      return;
    }

    // Handle error state
    if (instanceError) {
      setError(instanceError);
      setLoading(false);
      dispatch({ type: "RESET" });
      return;
    }

    // Handle successful data
    if (stepInstance) {
      // Map ticket fields from the API response
      const t = stepInstance.task.ticket;

      dispatch({
        type: "SET_TICKET",
        payload: {
          ticket: {
            ticket_id: t.ticket_number || t.ticket_id || t.id,
            ticket_number: t.ticket_number,
            ticket_subject: t.subject,
            ticket_description: t.description,
            workflow_id: stepInstance.task.workflow_id,
            workflow_name: stepInstance.step.name,
            current_step: stepInstance.step.step_id,
            current_step_name: stepInstance.step.name,
            current_step_role: stepInstance.step.role_id,
            status: t.status,
            user_assignment: t.employee || { username: t.assigned_to },
            // Action state flags from API
            current_status: stepInstance.current_status,
            has_acted: stepInstance.has_acted,
            is_escalated: stepInstance.is_escalated,
            is_transferred: stepInstance.is_transferred,
            origin: stepInstance.origin,
            // Dates
            created_at: t.created_at,
            updated_at: t.updated_at,
            fetched_at: t.fetched_at,
            priority: t.priority || "Medium",
            attachments: t.attachments || [],
            target_resolution: stepInstance.target_resolution || null,
          },
          action: stepInstance.available_actions || [],
          instruction: stepInstance.step.instruction || "",
          instance: stepInstance.step_instance_id,
          taskid: stepInstance.task.task_id,
          currentOwner: stepInstance.current_owner,
          // Use the simplified can_act flag from backend
          canAct: stepInstance.can_act ?? true,
        },
      });
      setError("");
      setLoading(false);
    } else if (!instanceLoading) {
      // Only set error if not loading and no data
      setError("Step instance not found.");
      setLoading(false);
      dispatch({ type: "RESET" });
    }
  }, [stepInstance, instanceLoading, instanceError]);

  const { fetchActionLogs, logs } = useFetchActionLogs();

  useEffect(() => {
    if (state.ticket?.ticket_id) {
      fetchActionLogs(state.ticket.ticket_id);
    }
  }, [state.ticket?.ticket_id, fetchActionLogs]);

  const { tracker } = useWorkflowProgress(state.ticket?.ticket_id);

  // Helper function to get button text based on ticket state
  const getButtonText = (buttonType) => {
    const ticket = state.ticket;
    const canAct = state.canAct;

    if (buttonType === "action") {
      if (!canAct) {
        if (ticket?.is_escalated) return "Already Escalated";
        if (ticket?.is_transferred) return "Already Transferred";
        if (ticket?.has_acted) return "Action Already Taken";
        return "Action Not Available";
      }
      return "Make an Action";
    }

    if (buttonType === "escalate") {
      if (!canAct) {
        if (ticket?.is_escalated) return "Already Escalated";
        if (ticket?.is_transferred) return "Already Transferred";
        if (ticket?.has_acted) return "Already Resolved";
        return "Escalation Not Available";
      }
      return "Escalate";
    }

    if (buttonType === "transfer") {
      if (!canAct) {
        if (ticket?.is_transferred) return "Already Transferred";
        if (ticket?.is_escalated) return "Already Escalated";
        if (ticket?.has_acted) return "Already Resolved";
        return "Transfer Not Available";
      }
      return "Transfer";
    }

    return "";
  };

  if (loading) {
    return (
      <>
        <Nav />
        <main className={styles.ticketDetailPage}>
          <section className={styles.tdpHeader}>
            <div>
              <button
                className={styles.wpdBack}
                onClick={handleBack}
                aria-label="Go back to tickets"
                type="button"
              >
                Tasks{" "}
              </button>
              <span className={styles.wpdCurrent}> / Task Detail</span>
            </div>
          </section>
          <section className={styles.tdpHeaderTitle}>
            <h1>Task Overview</h1>
          </section>
        </main>
      </>
    );
  }
  if (error) {
    // Determine error type and customize messaging
    let errorType = "notFound";
    let errorIcon = "fa-exclamation-circle";
    let errorTitle = "Ticket Not Found";
    let errorMessage = error;
    let errorSubtext =
      "The ticket you're looking for doesn't exist or has been removed.";

    if (
      error.includes("no authorization") ||
      error.includes("not assigned to you")
    ) {
      errorType = "unauthorized";
      errorIcon = "fa-lock";
      errorTitle = "Access Denied";
      errorMessage = "You don't have permission to view this ticket.";
      errorSubtext = "Only the assigned agent can view this ticket detail.";
    } else if (
      error.includes("no assignment") ||
      error.includes("You have no")
    ) {
      errorType = "unassigned";
      errorIcon = "fa-user-slash";
      errorTitle = "No Assignment";
      errorMessage = "You have no assigned task for this ticket.";
      errorSubtext =
        "This ticket has not been assigned to you. Please check the ticket list.";
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
      errorTitle = "Ticket Not Found";
      errorMessage = error;
      errorSubtext = "The ticket you're looking for doesn't exist.";
    } else if (error.includes("Failed to fetch")) {
      errorType = "forbidden";
      errorIcon = "fa-network-wired";
      errorTitle = "Connection Error";
      errorMessage = "Failed to fetch ticket data. Please try again.";
      errorSubtext =
        "Check your internet connection and try refreshing the page.";
    }

    return (
      <>
        <Nav />
        <main className={styles.ticketDetailPage}>
          <section className={styles.tdpHeader}>
            <button
              className={styles.wpdBack}
              onClick={handleBack}
              aria-label="Go back to tickets"
              type="button"
            >
              Tasks
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
  // console.log("aaticket", ticket?.attachments);

  return (
    <>
      <Nav />
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
        <section className={styles.tdpHeader}>
          <div>
            <button
              className={styles.wpdBack}
              onClick={handleBack}
              aria-label="Go back to tickets"
              type="button"
            >
              Tasks{" "}
            </button>
            <span className={styles.wpdCurrent}> / Task Detail</span>
          </div>
        </section>
        <section className={styles.tdpHeaderTitle}>
          <h1>Task Overview</h1>
        </section>
        <section className={styles.tdpBody}>
          <div className={styles.layoutFlex}>
            {/* Left */}
            <div className={styles.layoutSection} style={{ flex: 2 }}>
              <div className={styles.tdpTicketNoWrapper}>
                <h2 className={styles.tdpTicketNo}>
                  Ticket No. {state.ticket?.ticket_id}
                </h2>
                <div
                  className={
                    general[`priority-${state.ticket?.priority.toLowerCase()}`]
                  }
                >
                  {state.ticket?.priority}
                </div>
                {/* <div>Low</div> */}
              </div>
              <div className={styles.tdpSection}>
                <div className={styles.tdpTitle}>
                  <strong>Subject: {state.ticket?.ticket_subject}</strong>
                </div>
                <div className={styles.tdpMeta}>
                  Opened On:{" "}
                  <span>
                    {formattedDates?.createdAt.date}
                    {formattedDates?.createdAt.time &&
                      ` at ${formattedDates?.createdAt.time}`}
                  </span>
                </div>
                <div className={styles.tdpMeta}>
                  Expected Resolution:{" "}
                  <span>
                    {formattedDates?.targetResolution.date}
                    {formattedDates?.targetResolution.time &&
                      ` at ${formattedDates?.targetResolution.time}`}
                  </span>
                </div>
              </div>

              {/* SLA Status Component */}

              {/* Ticket Owner section removed per request */}
              {/* Description Section */}
              <div className={styles.tdpSection}>
                <div className={styles.tdpTitle}>
                  <strong>Description: </strong>
                </div>
                <p className={styles.tdpDescription}>
                  {state.ticket?.ticket_description}
                </p>
              </div>
              {/* Instructions Section */}
              <div className={styles.tdInstructions}>
                <div className={styles.iHeaderWrapper}>
                  <i className="fa-solid fa-lightbulb"></i>
                  <h3>Instructions</h3>
                </div>
                <p>
                  {state.instruction ||
                    "No instructions available for this step."}
                </p>
              </div>
              {/* Attachments Section */}
              <div className={styles.tdAttachment}>
                <h3>Attachments</h3>
                {state.ticket?.attachments &&
                state.ticket.attachments.length > 0 ? (
                  <div className={styles.attachmentList}>
                    {state.ticket.attachments.map((file) => {
                      // Construct full URL for the attachment using helpdesk service URL
                      // Uses /api/attachments/ endpoint for public access to ticket attachments
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
              {/* Comment */}
              <TicketComments ticketId={state.ticket?.ticket_id} />
            </div>
            {/* Right */}
            <div
              className={styles.layoutColumn}
              style={{ flex: 1, minWidth: "300px" }}
            >
              <div className={styles.layoutFlexButton}>
                {/* Make an Action - disabled when canAct is false */}
                <button
                  className={
                    !state.canAct
                      ? styles.ticketActionButtonDisabled
                      : styles.ticketActionButton
                  }
                  onClick={() => setOpenTicketAction(true)}
                  disabled={!state.canAct}
                >
                  <span className={styles.iconTextWrapper}>
                    <i className="fa fa-check-circle"></i>
                    {getButtonText("action")}
                  </span>
                </button>

                {/* Escalate - disabled when canAct is false, hidden for admins */}
                {!isAdmin() && (
                  <button
                    className={
                      !state.canAct
                        ? styles.escalateButtonDisabled
                        : styles.escalateButton
                    }
                    onClick={() => setOpenEscalateModal(true)}
                    disabled={!state.canAct}
                  >
                    <span className={styles.iconTextWrapper}>
                      <i className="fa fa-arrow-up"></i>
                      {getButtonText("escalate")}
                    </span>
                  </button>
                )}

                {/* Transfer (Admin only) - disabled when canAct is false */}
                {isAdmin() && (
                  <button
                    className={
                      !state.canAct
                        ? styles.transferButtonDisabled
                        : styles.transferButton
                    }
                    onClick={() => setOpenTransferModal(true)}
                    disabled={!state.canAct}
                  >
                    <span className={styles.iconTextWrapper}>
                      <i className="fa fa-exchange"></i>
                      {getButtonText("transfer")}
                    </span>
                  </button>
                )}
              </div>

              <div className={styles.layoutSection}>
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

                {/* Detail Section */}
                {activeTab === "Details" && (
                  <>
                    {/* status */}
                    <div
                      className={styles.tdStatusCard}
                      title="Overall Ticket Status"
                    >
                      <h4>Ticket Status</h4>
                      <div
                        className={
                          general[
                            `status-${state.ticket?.status
                              ?.replace(/\s+/g, "-")
                              .toLowerCase()}`
                          ]
                        }
                      >
                        {state.ticket?.status}
                      </div>
                    </div>
                    {/* workflow */}
                    <WorkflowTracker2
                      workflowData={tracker}
                      ticketStatus={state.ticket?.status}
                    />
                    <br />
                    <br />
                    {/* sla */}
                    <div className={styles.tdSLA}>
                      <h4>SLA Information</h4>
                      {/* Here */}
                      <SLAStatus
                        ticket={state.ticket}
                        targetResolution={state.ticket?.target_resolution}
                        className={styles.slaStatusSection}
                      />
                    </div>
                    <br />
                    {/* action logs */}
                    <div className={styles.actionLogs}>
                      <h4>Action Logs</h4>
                      <ActionLogList
                        logs={
                          logs && logs.length > 0 ? [...logs].reverse() : []
                        }
                        loading={loading}
                        error={error}
                      />
                    </div>
                  </>
                )}

                {/* Message Section */}
                {activeTab === "Messages" && (
                  <div className={styles.messageSection}>
                    {/* <Messaging ticket_id={state.ticket?.ticket_id} /> */}
                    <Messaging
                      ticket_id={state.ticket?.ticket_id}
                      ticket_owner={state.ticket?.user_assignment}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      {openTicketAction && (
        <TicketAction
          closeTicketAction={setOpenTicketAction}
          ticket={state.ticket}
          action={state.action}
          instance={state.taskid}
          showToast={showToast}
        />
      )}
      {openEscalateModal && (
        <EscalateTicket
          closeEscalateModal={setOpenEscalateModal}
          ticket={state.ticket}
          taskItemId={stepInstance?.task_item_id}
        />
      )}
      {openTransferModal && (
        <TransferTask
          closeTransferModal={setOpenTransferModal}
          ticket={state.ticket}
          taskItemId={stepInstance?.task_item_id}
          currentOwner={state.currentOwner}
        />
      )}
    </>
  );
}
