// style
import styles from "./ticket-detail.module.css";
import general from '../../../style/general.module.css';

// component
import AgentNav from "../../../components/navigation/AgentNav";
import ProgressTracker from "../../../components/component/ProgressTracker";

// react
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

// modal
import TicketAction from "./modals/TicketAction";

// Your API URL
const ticketURL = import.meta.env.VITE_TICKET_API;

export default function TicketDetail() {
  // navigate back
  const navigate = useNavigate();
  // get id passed from table
  const { id } = useParams();
  // open ticket action modal
  const [openTicketAction, setOpenTicketAction] = useState(false);
  // hide Ticket Information Panel
  const [showTicketInfo, setShowTicketInfo] = useState(true);
  // info visibility
  const toggTicketInfosVisibility = () => {
    setShowTicketInfo((prev) => !prev);
  };

  // fetch ticket
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await axios.get(`${ticketURL}/${id}`);
        setTicket(res.data);
      } catch (err) {
        setError("Ticket not found");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  return (
    <>
      <AgentNav />
      <main className={styles.ticketDetailPage}>
        <section className={styles.tdpHeader}>
          <div className={styles.tdBack} onClick={() => navigate(-1)}>
            <i className="fa fa-chevron-left"></i>
          </div>
          <h1>Ticket Detail</h1>
        </section>
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
                    Opened On: {ticket?.opened_on}
                  </p>
                  <p className={styles.tdDateResolution}>
                    Expected Resolution:
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
                <p>
                  Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quae
                  modi ex voluptates ratione obcaecati reiciendis magnam,
                  consectetur sint nesciunt. Id ab unde cumque suscipit enim
                  fugiat! Mollitia id corporis tempora?
                </p>
              </div>
              <div className={styles.tdAttachment}>
                <h3>Attachment</h3>
                <div className={styles.tdAttached}>
                  <i className="fa fa-upload"></i>
                  <span className={styles.placeholderText}>
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
              <ProgressTracker currentStatus={ticket?.status} />
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
                      <div className={styles.tdInfoValue}></div>
                    </div>
                    <div className={styles.tdInfoLabelValue}>
                      <div className={styles.tdInfoLabel}>Department</div>
                      <div className={styles.tdInfoValue}></div>
                    </div>
                    <div className={styles.tdInfoLabelValue}>
                      <div className={styles.tdInfoLabel}>Position</div>
                      <div className={styles.tdInfoValue}></div>
                    </div>
                    <div className={styles.tdInfoLabelValue}>
                      <div className={styles.tdInfoLabel}>SLA</div>
                      <div className={styles.tdInfoValue}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      {openTicketAction && (
        <TicketAction closeTicketAction={setOpenTicketAction} ticket={ticket} />
      )}
    </>
  );
}
