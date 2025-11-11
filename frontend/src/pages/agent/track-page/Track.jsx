// components
import AgentNav from "../../../components/navigation/AgentNav";
import TrackResult from "./components/TrackResult";

// === changed: use custom hook instead of env + axios
import useUserTickets from "../../../api/useUserTickets";
import { useWorkflowProgress } from "../../../api/workflow-graph/useWorkflowProgress";

// style
import styles from "./track.module.css";

// react
import React, { useState } from "react"; // === changed: removed useEffect
import { useNavigate } from "react-router-dom"; // === added if you want to redirect

export default function Track() {
  const { userTickets } = useUserTickets(); // === added
  const tickets = userTickets || []; // === added
  const loading = !userTickets; // === added

  const navigate = useNavigate(); // === added (optional)

  // search bar states
  const [searchTerm, setSearchTerm] = useState("");
  const [matchedTicket, setMatchedTicket] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // state and tracker hook
  const [taskId, setTaskId] = useState(null); // === added
  const { tracker } = useWorkflowProgress(taskId); // === added

  const handleSearch = (e) => {
    e.preventDefault();

    // === changed: adjust search to match new userTickets structure
    const match = tickets.find(
      (instance) =>
        instance.ticket_id?.toLowerCase() ===
        searchTerm.trim().toLowerCase() ||
        instance.ticket_number?.toLowerCase() ===
        searchTerm.trim().toLowerCase()
    );

    if (match) {
      setMatchedTicket({
        ticket_id: match.ticket_id,
        ticket_number: match.ticket_number,
        subject: match.ticket_subject,
        description: match.ticket_description,
        workflow_id: match.workflow_id,
        workflow_name: match.workflow_name,
        current_step: match.current_step,
        current_step_name: match.current_step_name,
        status: match.status,
        created_at: match.created_at,
      });
      setTaskId(match.task_id); // === added
      setNotFound(false);
    } else {
      setMatchedTicket(null);
      setTaskId(null); // === added
      setNotFound(true);
    }
  };

  console.log("Tracker Data:", tracker); // === Log tracker data

  return (
    <>
      <AgentNav />
      <main className={styles.trackPage}>
        <section className={styles.trpHeader}>
          <h1>Track</h1>
        </section>
        <section className={styles.trpBody}>
          <div className={styles.searchContainer}>
            <form className={styles.searchForm} onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Enter ticket number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit">Track Ticket</button>
            </form>
          </div>

          <TrackResult
            matchedTicket={matchedTicket}
            notFound={notFound}
            searchTerm={searchTerm}
            tracker={tracker}
          />
        </section>
      </main>
    </>
  );
}
