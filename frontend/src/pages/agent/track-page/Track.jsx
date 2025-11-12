// components
import AgentNav from "../../../components/navigation/AgentNav";
import TrackResult from "./components/TrackResult";

// hooks
import useUserTickets from "../../../api/useUserTickets";
import { useWorkflowProgress } from "../../../api/workflow-graph/useWorkflowProgress";

// style
import styles from "./track.module.css";

// react
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Track() {
  const { userTickets } = useUserTickets(); // === added
  const tickets = userTickets || []; // === added
  const loading = !userTickets; // === added

  // ✅ Log a sample ticket once tickets are fetched
  useEffect(() => {
    if (tickets.length > 0) {
      console.log(
        "🎟️ Sample ticket structure:",
        JSON.stringify(tickets[0], null, 2)
      );
    } else {
      console.log("No tickets yet or still loading...");
    }
  }, [tickets]);

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

    const match = tickets.find(
      (instance) =>
        instance?.ticket_number?.toLowerCase() ===
        searchTerm.trim().toLowerCase()
    );

    if (match) {
      console.log("🎫 Matched Ticket JSON:", JSON.stringify(match, null, 2));
      setMatchedTicket(match);
      setTaskId(match.task_id);
      setNotFound(false);
    } else {
      setMatchedTicket(null);
      setTaskId(null);
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
