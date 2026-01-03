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
      if (search) params.search = search;
      
      // Use different endpoint for unassigned tab
      // Unassigned = tickets not assigned to any workflow (is_task_allocated=False)
      let endpoint = "tasks/all-tasks/";
      if (tab.toLowerCase() === 'unassigned') {
        endpoint = "tasks/unassigned-tickets/";
      } else if (tab) {
        params.tab = tab;
      }
      
      const res = await api.get(endpoint, { params });
      
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
