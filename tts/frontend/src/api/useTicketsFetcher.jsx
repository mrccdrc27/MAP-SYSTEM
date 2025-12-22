import { useState, useCallback } from "react";
import api from "./axios";

const useTicketsFetcher = () => {
  const [tickets, setTickets] = useState([]); // Initialize tickets as an empty array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
    pageSize: 10,
    totalPages: 0,
  });

  const fetchTickets = useCallback(async (page = 1, pageSize = 10, tab = '', search = '') => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (tab) params.tab = tab;
      if (search) params.search = search;
      
      const res = await api.get("tasks/all-tasks/", { params });
      
      // Handle paginated response from DRF
      const { count, next, previous, results } = res.data;
      setTickets(results || res.data);
      setPagination({
        count: count || (results ? results.length : res.data.length),
        next,
        previous,
        currentPage: page,
        pageSize,
        totalPages: Math.ceil((count || res.data.length) / pageSize),
      });
      
      return results || res.data;
    } catch (err) {
      setError("Failed to fetch tickets.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []); // Only created once

  return { fetchTickets, tickets, loading, error, pagination };
};

export default useTicketsFetcher;
