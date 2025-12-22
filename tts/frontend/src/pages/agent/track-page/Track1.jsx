// components
import AgentNav from "../../../components/navigation/AgentNav";
import TrackResult from "./components/TrackResult";

// api
const ticketURL = import.meta.env.VITE_TICKET_API;

// style
import styles from "./track.module.css";

// react
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Track() {
  // fetch tickets states
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // search bar states
  const [searchTerm, setSearchTerm] = useState("");
  const [matchedTicket, setMatchedTicket] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    axios
      .get(ticketURL)
      .then((response) => {
        // fetch tickets
        const allTickets = response.data;
        setTickets(allTickets);
        setLoading(false);
      })
      .catch((error) => {
        setError("Failed to fetch data");
        setLoading(false);
      });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();

    const match = tickets.find(
      (ticket) =>
        ticket.ticket_id.toLowerCase() === searchTerm.trim().toLowerCase()
    );

    if (match) {
      setMatchedTicket(match);
      setNotFound(false);
    } else {
      setMatchedTicket(null);
      setNotFound(true);
    }
  };

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
          />
        </section>
      </main>
    </>
  );
}
