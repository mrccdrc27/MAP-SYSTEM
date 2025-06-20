// src/api/useUserTickets.js
import { useEffect, useState } from 'react';
import api from "./axios";
import { useAuth } from './AuthContext';

const useUserTickets = () => {
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user?.id) {
      api
        .get(`workflow/instance/list/?user_id=${user.id}`)
        .then((res) => {
          setTickets(res.data);
        })
        .catch(() => {
          setError("Failed to fetch user tickets.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!user && !authLoading) {
      setTickets([]);
      setLoading(false);
    }
  }, [user, authLoading]);

  return { tickets, loading, error };
};

export default useUserTickets;
