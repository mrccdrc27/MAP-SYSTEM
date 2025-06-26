import { useState } from 'react';
import api from './axios';

const useTicketsFetcher = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('tickets/tickets/');
      setTickets(res.data);
      return res.data;
    } catch (err) {
      setError("Failed to fetch tickets.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { fetchTickets, tickets, loading, error };
};

export default useTicketsFetcher;
