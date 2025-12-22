import { useState, useEffect } from "react";
import api from "./axios";

const useTicketDetail = (task_item_id) => {
  const [stepInstance, setStepInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!task_item_id) {
      setStepInstance(null);
      setLoading(false);
      return;
    }

    const fetchStepInstance = async () => {
      setLoading(true);
      setError("");
      
      try {
        const response = await api.get(`tasks/detail/${task_item_id}/`);
        setStepInstance(response.data);
      } catch (err) {
        console.error('Failed to fetch ticket detail:', err);
        
        if (err.response?.status === 403) {
          setError("No authorization to handle this ticket");
        } else if (err.response?.status === 404) {
          setError("Step instance not found");
        } else if (err.response?.status === 401) {
          setError("Authentication required");
        } else {
          setError("Failed to fetch step instance data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStepInstance();
  }, [task_item_id]);

  const refetch = () => {
    if (task_item_id) {
      setLoading(true);
      setError("");
      
      api.get(`tasks/detail/${task_item_id}/`)
        .then(response => {
          setStepInstance(response.data);
        })
        .catch(err => {
          console.error('Failed to refetch ticket detail:', err);
          
          if (err.response?.status === 403) {
            setError("No authorization to handle this ticket");
          } else if (err.response?.status === 404) {
            setError("Step instance not found");
          } else if (err.response?.status === 401) {
            setError("Authentication required");
          } else {
            setError("Failed to fetch step instance data");
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  return { stepInstance, loading, error, refetch };
};

export default useTicketDetail;