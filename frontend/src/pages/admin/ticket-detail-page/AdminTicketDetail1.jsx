// style
import styles from "./ticket-detail.module.css";
import general from "../../../style/general.module.css";

// component
import AdminNav from "../../../components/navigation/AdminNav";
import WorkflowTracker2 from "../../../components/ticket/WorkflowVisualizer2";
import WorkflowVisualizer from "../../../components/ticket/WorkflowVisualizer";
import DocumentViewer from "../../../components/ticket/DocumentViewer";

// react
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { useEffect, useState, useCallback, useReducer } from "react";

// hooks
import useFetchActionLogs from "../../../api/workflow-graph/useActionLogs";
import ActionLogList from "../../../components/ticket/ActionLogList";
import { useWorkflowProgress } from "../../../api/workflow-graph/useWorkflowProgress";

// modal
import TicketAction from "./modals/TicketAction";
import useUserTickets from "../../../api/useUserTickets";

export default function AdminTicketDetail() {
  const navigate = useNavigate();
  const { id } = useParams(); // ticket_id from URL
  const { userTickets } = useUserTickets();
  // States
  const initialState = {
    ticket: null,
    action: [],
    instance: null,
    instruction: "",
    taskid: null,
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
  const [showTicketInfo, setShowTicketInfo] = useState(true);

  const toggTicketInfosVisibility = useCallback(() => {
    setShowTicketInfo((prev) => !prev);
  }, []);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

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
    if (!userTickets || userTickets.length === 0) return;

    const matchedInstance = userTickets.find(
      (instance) => instance.step_instance_id === id
    );

    if (!matchedInstance) {
      setError("Ticket not found.");
      dispatch({ type: "RESET" });
    } else {
      dispatch({
        type: "SET_TICKET",
        payload: {
          ticket: {
            ...matchedInstance.task.ticket,
            hasacted: matchedInstance.has_acted,
          },
          action: matchedInstance.available_actions || [],
          instruction: matchedInstance.step.instruction,
          instance: matchedInstance.step_instance_id,
          taskid: matchedInstance.task.task_id,
        },
      });
      setError("");
    }
    setLoading(false);
  }, [userTickets, id]);
  const { fetchActionLogs, logs } = useFetchActionLogs();
  useEffect(() => {
    if (state.taskid) {
      fetchActionLogs(state.taskid);
    }
  }, [state.taskid]);

  const { tracker } = useWorkflowProgress(state.taskid);
  // ...existing code...

  if (loading) {
    return (
      <>
        <AdminNav />
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
        <AdminNav />
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
      <AdminNav />
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
        <div className={styles.headerTitle}>
          <div>
            <h1>Document Preview</h1>
          </div>
        </div>
        <section className={styles.tdpBody}>
          <div className={styles.tdpWrapper}>
            <div className={styles.tdpLeftCont}>
              <div className={styles.tdHeader}>
                <div className={styles.tdTitle}>
                  <h3>Ticket No. {state.ticket?.ticket_id}</h3>
                  <div
                    className={
                      general[
                        `priority-${state.ticket?.priority.toLowerCase()}`
                      ]
                    }
                  >
                    {state.ticket?.priority}
                  </div>
                </div>
                <p className={styles.tdSubject}>
                  <strong>Subject: {state.ticket?.subject}</strong>
                </p>
                <div className={styles.tdMetaData}>
                  <p className={styles.tdDateOpened}>
                    Opened On: {formattedDates?.date} {formattedDates?.time}
                  </p>
                  <p className={styles.tdDateResolution}>
                    Expected Resolution: {formattedDates?.date}{" "}
                    {formattedDates?.time}
                  </p>
                </div>
              </div>
              <div className={styles.tdDescription}>
                <h3>Description</h3>
                <p>{state.ticket?.description}</p>
              </div>
              <div className={styles.tdInstructions}>
                <div className={styles.iHeaderWrapper}>
                  <i class="fa-solid fa-lightbulb"></i>
                  <h3>Instructions</h3>
                </div>
                <p>{state.instruction}</p>
              </div>
              <div className={styles.tdAttachment}>
                <h3>Attachment</h3>
                <div className={styles.tdAttached}>
                  <i className="fa fa-upload"></i>
                  <span className={styles.placeholderText}>
                    <DocumentViewer attachments={state.ticket?.attachments} />;
                    No file attached
                  </span>
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf, .jpg, .jpeg, .docx"
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.tdpRightCont}>
              <button
                className={
                  state.ticket?.hasacted
                    ? styles.actionButtonDisabled
                    : styles.actionButton
                }
                onClick={() => setOpenTicketAction(true)}
                disabled={state.ticket?.hasacted}
              >
                {state.ticket?.hasacted
                  ? "Action Already Taken"
                  : "Make an Action"}
              </button>
              <div className={styles.tdStatusCard}>
                <div className={styles.tdStatusLabel}>Status</div>
                <div
                  className={
                    general[
                      `status-${state.ticket?.status
                        .replace(/\s+/g, "-")
                        .toLowerCase()}`
                    ]
                  }
                >
                  {state.ticket?.status}
                </div>
              </div>
              <WorkflowTracker2 workflowData={tracker} />
              <div className={styles.tdInfoWrapper}>
                <div className={styles.tdInfoHeader}>
                  <h3>Details</h3>
                  <button
                    className={styles.tdArrow}
                    onClick={toggTicketInfosVisibility}
                    aria-label={
                      showTicketInfo ? "Hide details" : "Show details"
                    }
                    type="button"
                  >
                    <i
                      className={`fa-solid fa-caret-${
                        showTicketInfo ? "down" : "up"
                      }`}
                    ></i>
                  </button>
                </div>
                {showTicketInfo && (
                  <div className={styles.tdInfoItem}>
                    <div className={styles.tdInfoLabelValue}>
                      <div className={styles.tdInfoLabel}>Ticket Owner</div>
                      <div className={styles.tdInfoValue}>
                        {`${state.ticket?.employee.first_name} ${state.ticket?.employee.last_name}`}
                      </div>
                    </div>
                    <div className={styles.tdInfoLabelValue}>
                      <div className={styles.tdInfoLabel}>Department</div>
                      <div className={styles.tdInfoValue}>
                        {" "}
                        {`${state.ticket?.employee.department}`}
                      </div>
                    </div>

                    {/* <div className={styles.tdInfoLabelValue}>
                      <div className={styles.tdInfoLabel}>Position</div>
                      <div className={styles.tdInfoValue}></div>
                    </div>
                    <div className={styles.tdInfoLabelValue}>
                      <div className={styles.tdInfoLabel}>SLA</div>
                      <div className={styles.tdInfoValue}></div>
                    </div> */}
                  </div>
                )}
              </div>
              <div className={styles.actionLogs}>
                <h4>Action Logs</h4>
                <ActionLogList logs={logs} loading={loading} error={error} />
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
          instance={state.instance}
        />
      )}
    </>
  );
}
