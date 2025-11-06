import React, { createContext, useContext, useEffect, useState } from "react";
import api from "./axios";
import memoryCache from "../utils/memoryCache";

const TicketsContext = createContext();

export const TicketsProvider = ({ children }) => {
  const [userTickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTickets = async () => {
    const cacheKey = 'instances/simple/';
    
    // Check cache first
    const cachedData = memoryCache.get(cacheKey);
    if (cachedData) {
      setTickets(cachedData);
      setLoading(false);
      return;
    }

    // Fetch from API if no cache
    try {
      const response = await api.get('instances/simple/');
      memoryCache.set(cacheKey, response.data);
      setTickets(response.data);
    } catch (err) {
      setError("Failed to fetch tickets.");
    } finally {
      setLoading(false);
    }
  };

  const refreshTickets = async () => {
    const cacheKey = 'instances/simple/';
    memoryCache.delete(cacheKey);
    setLoading(true);
    
    try {
      const response = await api.get('instances/simple/');
      memoryCache.set(cacheKey, response.data);
      setTickets(response.data);
    } catch (err) {
      setError("Failed to refresh tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

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