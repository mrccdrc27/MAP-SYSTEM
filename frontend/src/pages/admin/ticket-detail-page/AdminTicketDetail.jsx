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
import { useEffect, useState } from "react";

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
  const [ticket, setTicket] = useState(null);
  const [action, setAction] = useState([]);
  const [instance, setInstance] = useState([]);
  const [taskid, setTaskid] = useState();
  const [instruction, setInstruction] = useState();
  const [stepInstance, setStepInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTicketAction, setOpenTicketAction] = useState(false);
  const [showTicketInfo, setShowTicketInfo] = useState(true);

  const toggTicketInfosVisibility = () => {
    setShowTicketInfo((prev) => !prev);
  };

  useEffect(() => {
    if (!userTickets || userTickets.length === 0) return;

    // 1️⃣ Filter step instance by ticket_id
    const matchedInstance = userTickets.find(
      (instance) => instance.step_instance_id === id
    );

    if (!matchedInstance) {
      setError("Ticket not found.");
      setTicket(null);
      setAction([]);
      setStepInstance(null);
    } else {
      setTicket(matchedInstance.task.ticket);
      setInstance(matchedInstance.step_instance_id);
      setAction(matchedInstance.available_actions || []);
      setTaskid(matchedInstance.task.task_id); // ✅ FIXED: set actual task_id
      setInstruction(matchedInstance.step.instruction); // ✅ FIXED: set actual task_id
      setError("");
    }
    setLoading(false);
  }, [userTickets, id]);
  const { fetchActionLogs, logs } = useFetchActionLogs();
  useEffect(() => {
    if (taskid) {
      fetchActionLogs(taskid);
    }
  }, [taskid]);

  const { tracker } = useWorkflowProgress(taskid);
  console.log("tracker", tracker);

  console.log("loglog", logs);

  if (error) {
    return (
      <>
        <AdminNav />
        <main className={styles.ticketDetailPage}>
          <section className={styles.tdpHeader}>
            <div className={styles.tdBack} onClick={() => navigate(-1)}>
              <i className="fa fa-chevron-left"></i>
            </div>
            <h1>Error</h1>
          </section>
          <section className={styles.tdpBody}>
            <div style={{ padding: "2rem", color: "red" }}>{error}</div>
          </section>
        </main>
      </>
    );
  }
  console.log("aaticket", ticket?.attachments);

  return (
    <>
      <AdminNav />
      <main className={styles.ticketDetailPage}>
        <section className={styles.tdpHeader}>
          <div>
            <span className={styles.wpdBack} onClick={() => navigate(-1)}>
              Tickets{" "}
            </span>
            <span className={styles.wpdCurrent}>/ Ticket Detail</span>
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
                  <h3>Ticket No. {ticket?.ticket_id}</h3>
                  <div
                    className={
                      general[`priority-${ticket?.priority.toLowerCase()}`]
                    }
                  >
                    {ticket?.priority}
                  </div>
                </div>
                <p className={styles.tdSubject}>
                  <strong>Subject: {ticket?.subject}</strong>
                </p>
                <div className={styles.tdMetaData}>
                  <p className={styles.tdDateOpened}>
                    Opened On: {new Date(ticket?.created_at).toLocaleString()}
                  </p>
                  <p className={styles.tdDateResolution}>
                    Expected Resolution:{" "}
                    {new Date(ticket?.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className={styles.tdDescription}>
                <h3>Description</h3>
                <p>{ticket?.description}</p>
              </div>
              <div className={styles.tdInstructions}>
                <div className={styles.iHeaderWrapper}>
                  <i class="fa-solid fa-lightbulb"></i>
                  <h3>Instructions</h3>
                </div>
                <p>{instruction}</p>
              </div>
              <div className={styles.tdAttachment}>
                <h3>Attachment</h3>
                <div className={styles.tdAttached}>
                  <i className="fa fa-upload"></i>
                  <span className={styles.placeholderText}>
                    <DocumentViewer attachments={ticket?.attachments} />; No
                    file attached
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
                className={styles.actionButton}
                onClick={() => {
                  setOpenTicketAction(true);
                }}
              >
                Make an Action
              </button>
              <div className={styles.tdStatusCard}>
                <div className={styles.tdStatusLabel}>Status</div>
                <div>{ticket?.status}</div>
              </div>
              <WorkflowTracker2 workflowData={tracker} />
              <div className={styles.tdInfoWrapper}>
                <div className={styles.tdInfoHeader}>
                  <h3>Details</h3>
                  <div
                    className={styles.tdArrow}
                    onClick={toggTicketInfosVisibility}
                  >
                    <i
                      className={`fa-solid fa-caret-${
                        showTicketInfo ? "down" : "up"
                      }`}
                    ></i>
                  </div>
                </div>
                {showTicketInfo && (
                  <div className={styles.tdInfoItem}>
                    <div className={styles.tdInfoLabelValue}>
                      <div className={styles.tdInfoLabel}>Ticket Owner</div>
                      <div className={styles.tdInfoValue}>
                        {`${ticket?.employee.first_name} ${ticket?.employee.last_name}`}
                      </div>
                    </div>
                    <div className={styles.tdInfoLabelValue}>
                      <div className={styles.tdInfoLabel}>Department</div>
                      <div className={styles.tdInfoValue}>
                        {" "}
                        {`${ticket?.employee.department}`}
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
          ticket={ticket}
          action={action}
          instance={instance}
        />
      )}
    </>
  );
}
