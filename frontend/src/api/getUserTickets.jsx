// src/api/useUserTickets.js
import { useEffect, useState } from 'react';
import api from "./axios";
import { useAuth } from './AuthContext';

const useUserTickets = () => {
  const { user, loading, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && user?._id) {
      api.get(`workflow/instance/list/?user_id=${user._id}`)
        .then(res => {
          setTickets(res.data);
        })
        .catch(err => {
          console.error("Failed to fetch tickets:", err);
          setError(err);
        });
    }
  }, [user, loading]);

  return { tickets, error, loading };
};

export default useUserTickets;
