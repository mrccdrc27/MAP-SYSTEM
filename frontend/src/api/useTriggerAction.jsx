// src/api/useTriggerAction.js
import { useEffect, useState } from "react";
import axios from "axios";

const useTriggerAction = ({ uuid, action_id, method = "post", trigger = false }) => {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (trigger && uuid && action_id) {
      const sendAction = async () => {
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
          const baseURL = import.meta.env.VITE_BACKEND_API;
          const url = `${baseURL}instance/${uuid}/`;
          const res = await axios({
            method,
            url,
            data: { action_id },
          });
          setResponse(res.data);
        } catch (err) {
          setError(err.response?.data || err.message);
        } finally {
          setLoading(false);
        }
      };

      sendAction();
    }
  }, [trigger, uuid, action_id, method]);

  return { response, loading, error };
};

export default useTriggerAction;
