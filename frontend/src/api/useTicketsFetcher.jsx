import { useState, useCallback } from "react";
import api from "./axios";

const useTicketsFetcher = () => {
  const [tickets, setTickets] = useState([]); // Initialize tickets as an empty array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("tasks/all-tasks/");
      setTickets(res.data);
      return res.data;
    } catch (err) {
      setError("Failed to fetch tickets.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []); // Only created once

  return { fetchTickets, tickets, loading, error };
};

export default useTicketsFetcher;
