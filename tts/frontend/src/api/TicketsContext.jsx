import React, { createContext, useContext, useEffect, useState } from "react";
import api from "./axios";
import memoryCache from "../utils/memoryCache";
import { useAuth } from "../context/AuthContext";

const TicketsContext = createContext();

export const TicketsProvider = ({ children }) => {
  const [userTickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTickets = async () => {
    const cacheKey = 'tasks/my-tasks/';
    
    // Check cache first
    const cachedData = memoryCache.get(cacheKey);
    if (cachedData) {
      setTickets(cachedData);
      setLoading(false);
      return;
    }

    // Fetch from API if no cache
    try {
      // Attach authorization header if available
      const token = typeof getToken === 'function' ? getToken() : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await api.get('tasks/my-tasks/', { headers });
      memoryCache.set(cacheKey, response.data);
      setTickets(response.data);
    } catch (err) {
      setError("Failed to fetch tickets.");
    } finally {
      setLoading(false);
    }
  };

  const refreshTickets = async () => {
    const cacheKey = 'tasks/my-tasks/';
    memoryCache.delete(cacheKey);
    setLoading(true);
    
    try {
      const token = typeof getToken === 'function' ? getToken() : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await api.get('tasks/my-tasks/', { headers });
      memoryCache.set(cacheKey, response.data);
      setTickets(response.data);
    } catch (err) {
      setError("Failed to refresh tickets.");
    } finally {
      setLoading(false);
    }
  };

  // Use auth context to avoid fetching before we know auth state
  const { initialized, hasAuth, getToken } = useAuth();

  useEffect(() => {
    // Wait until auth check completes
    if (!initialized) return;

    // If user is not authenticated, do not attempt to fetch tickets
    if (!hasAuth) {
      setTickets([]);
      setLoading(false);
      return;
    }

    fetchTickets();
    // Re-fetch when auth state changes (e.g., login)
  }, [initialized, hasAuth]);

  return (
    <TicketsContext.Provider value={{ userTickets, loading, error, refreshTickets }}>
      {children}
    </TicketsContext.Provider>
  );
};

export const useTickets = () => {
  const context = useContext(TicketsContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketsProvider');
  }
  return context;
};