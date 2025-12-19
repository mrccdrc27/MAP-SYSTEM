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

// hooks
import useFetchActionLogs from "../../../api/workflow-graph/useActionLogs";
import { useWorkflowProgress } from "../../../api/workflow-graph/useWorkflowProgress";
import useTicketDetail from "../../../api/useTicketDetail";
import { useAuth } from "../../../context/AuthContext";

// modal
import TicketAction from "./modals/TicketAction";
import EscalateTicket from "./modals/EscalateTicket";
import TransferTask from "../../../components/modal/TransferTask";
import { min } from "date-fns";

export default function TicketDetail() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id: taskItemId } = useParams();
  const {
    stepInstance,
    loading: instanceLoading,
    error: instanceError,
  } = useTicketDetail(taskItemId);

  // Tabs with URL sync
  const [searchParams, setSearchParams] = useSearchParams();
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
    const date = new Date(state.ticket.created_at);
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
  }, [state.ticket?.created_at]);

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
      // Map new ticket fields from the provided structure
      const t = stepInstance.task.ticket;
      dispatch({
        type: "SET_TICKET",
        payload: {
          ticket: {
            ticket_id: t.ticket_number || t.ticket_id || t.id, // Use ticket_number as primary ID
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
            has_acted: stepInstance.has_acted,
            is_escalated: stepInstance.is_escalated,
            created_at: t.created_at,
            updated_at: t.updated_at,
            fetched_at: t.fetched_at,
            priority: t.priority || "Medium",
            attachments: t.attachments || [],
            target_resolution: t.response_time,
          },
          action: stepInstance.available_actions || [],
          instruction: stepInstance.step.instruction || "",
          instance: stepInstance.step_instance_id,
          taskid: stepInstance.task.task_id,
          currentOwner: stepInstance.current_owner,
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
  // check ticket data
  console.log("ticket data", JSON.stringify(state.ticket, null, 2));

  const { tracker } = useWorkflowProgress(state.ticket?.ticket_id);

  if (loading) {
    return (
      <>
        <Nav />
        <main className={styles.ticketDetailPage}>
          <section className={styles.tdpHeader}>
            <button
              className={styles.tdBack}
              onClick={handleBack}
              aria-label="Go back"
              type="button"
            >
              <i className="fa fa-chevron-left"></i>
            </button>
            <h1>Loading...</h1>
          </section>
          <section className={styles.tdpBody}>
            <div style={{ padding: "2rem" }}>Fetching ticket data...</div>
          </section>
        </main>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Nav />
        <main className={styles.ticketDetailPage}>
          <section className={styles.tdpHeader}>
            <button
              className={styles.tdBack}
              onClick={handleBack}
              aria-label="Go back"
              type="button"
            >
              <i className="fa fa-chevron-left"></i>
            </button>
            <h1>Error</h1>
          </section>
          <section className={styles.tdpBody}>
            <div style={{ padding: "2rem", color: "red" }}>{error}</div>
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
              Tickets{" "}
            </button>
            <span className={styles.wpdCurrent}> / Ticket Detail</span>
          </div>
        </section>
        <section className={styles.tdpHeaderTitle}>
          <h1>Ticket Overview</h1>
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
                    {formattedDates?.date}
                    {formattedDates?.time && ` at ${formattedDates?.time}`}
                  </span>
                </div>
                <div className={styles.tdpMeta}>
                  Expected Resolution:{" "}
                  <span>
                    {formattedDates?.date}
                    {formattedDates?.time && ` at ${formattedDates?.time}`}
                  </span>
                </div>
              </div>
              {/* Ticket Owner */}
              <div className={styles.tdpSection}>
                <div className={styles.tdpTitle}>
                  <strong>Owner Description:</strong>
                </div>
                <div className={styles.tdpOwnerDescWrapper}>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Name:</div>
                    <div className={styles.tdpODWValue}>
                      {state.ticket?.user_assignment?.first_name
                        ? `${state.ticket.user_assignment.first_name} ${state.ticket.user_assignment.last_name}`
                        : "N/A"}
                    </div>
                  </div>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Email:</div>
                    <div className={styles.tdpODWValue}>
                      {state.ticket?.user_assignment?.email || "N/A"}
                    </div>
                  </div>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Company ID:</div>
                    <div className={styles.tdpODWValue}>
                      {state.ticket?.user_assignment?.company_id || "N/A"}
                    </div>
                  </div>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Department:</div>
                    <div className={styles.tdpODWValue}>
                      {state.ticket?.user_assignment?.department || "N/A"}
                    </div>
                  </div>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Role:</div>
                    <div className={styles.tdpODWValue}>
                      {state.ticket?.user_assignment?.role || "N/A"}
                    </div>
                  </div>
                  <div className={styles.tdpODWItem}>
                    <div className={styles.tdpODWLabel}>Current Owner:</div>
                    <div className={styles.tdpODWValue}>
                      {state.currentOwner?.user_full_name || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.tdpSection}>
                <div className={styles.tdpTitle}>
                  <strong>Description: </strong>
                </div>
                <p className={styles.tdpDescription}>
                  {state.ticket?.ticket_description}
                </p>
              </div>
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
              {/* <div className={styles.tdAttachment}>
                <h3>Attachment</h3>
                <div className={styles.tdAttached}>
                  <i className="fa fa-upload"></i>
                  {state.ticket?.attachments &&
                  state.ticket.attachments.length > 0 ? (
                    <ul>
                      {state.ticket.attachments.map((file, idx) => (
                        <li key={idx}>
                          <a
                            href={file.url || file}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {file.name || `Attachment ${idx + 1}`}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className={styles.placeholderText}>
                      No attachments available.
                    </span>
                  )}
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf, .jpg, .jpeg, .docx"
                    style={{ display: "none" }}
                  />
                </div>
              </div> */}

              {/* Comment */}
              <TicketComments ticketId={state.ticket?.ticket_id} />
            </div>
            {/* Right */}
            <div
              className={styles.layoutColumn}
              style={{ flex: 1, minWidth: "300px" }}
            >
              <div className={styles.layoutFlexButton}>
                {/* Make an Action */}
                <button
                  className={
                    state.ticket?.has_acted
                      ? styles.ticketActionButtonDisabled
                      : styles.ticketActionButton
                  }
                  onClick={() => setOpenTicketAction(true)}
                  // disabled={state.ticket?.has_acted}
                  disabled={
                    state.ticket?.has_acted || state.ticket?.is_escalated
                  }
                >
                  <span className={styles.iconTextWrapper}>
                    <i className="fa fa-check-circle"></i>
                    {state.ticket?.has_acted
                      ? "Cannot Make Action After Escalation"
                      : state.ticket?.has_acted
                      ? "Action Already Taken"
                      : "Make an Action"}
                  </span>
                </button>

                {/* Escalate */}
                <button
                  className={
                    state.ticket?.has_acted || state.ticket?.is_escalated
                      ? styles.escalateButtonDisabled
                      : styles.escalateButton
                  }
                  onClick={() => setOpenEscalateModal(true)}
                  disabled={
                    state.ticket?.has_acted || state.ticket?.is_escalated
                  }
                >
                  <span className={styles.iconTextWrapper}>
                    <i className="fa fa-arrow-up"></i>
                    {state.ticket?.is_escalated
                      ? "Already Escalated"
                      : state.ticket?.has_acted
                      ? "Can't Escalate After Action"
                      : "Escalate"}
                  </span>
                </button>

                {/* Transfer (Admin only) */}
                {isAdmin() && (
                  <button
                    className={
                      state.ticket?.has_acted || state.ticket?.is_escalated
                        ? styles.transferButtonDisabled
                        : styles.transferButton
                    }
                    onClick={() => setOpenTransferModal(true)}
                    disabled={
                      state.ticket?.has_acted || state.ticket?.is_escalated
                    }
                  >
                    <span className={styles.iconTextWrapper}>
                      <i className="fa fa-exchange"></i>
                      {state.ticket?.is_escalated
                        ? "Cannot Transfer After Escalation"
                        : state.ticket?.has_acted
                        ? "Cannot Transfer After Action"
                        : "Transfer"}
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
                    <div className={styles.tdStatusCard}>
                      <div className={styles.tdStatusLabel}>Status</div>
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
                    <WorkflowTracker2 workflowData={tracker} />
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
                    <div className={styles.actionLogs}>
                      {/* <ActionLog log={logs && logs.length > 0 ? logs[0] : null} /> */}
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
          taskItemId={taskItemId}
        />
      )}
      {openTransferModal && (
        <TransferTask
          closeTransferModal={setOpenTransferModal}
          ticket={state.ticket}
          taskItemId={taskItemId}
          currentOwner={state.currentOwner}
        />
      )}
    </>
  );
}
