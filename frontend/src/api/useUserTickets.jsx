// src/api/useUserTickets.js
import { useEffect, useState } from 'react';
import api from "./axios";
import { useAuth } from './AuthContext';

const useUserTickets = () => {
  const { user, loading: authLoading } = useAuth();
  const [userTickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user?.id) {
      api
        .get(`instance/list/?user_id=${user.id}`)
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

  return { userTickets, loading, error };
};

export default useUserTickets;
