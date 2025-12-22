// src/api/useTriggerAction.js
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext"; // ✅ Import auth context

const useTriggerAction = ({ task_id, transition_id, method = "post", trigger = false, notes = "" } = {}) => {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { user } = useAuth(); // ✅ Get user from context

  useEffect(() => {
    if (trigger && task_id && transition_id !== undefined && user) {
      const sendAction = async () => {
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
          const baseURL = import.meta.env.VITE_BACKEND_API;
          // ✅ Remove trailing slash from baseURL if it exists
          const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
          const url = `${cleanBaseURL}/transitions/`;

          console.log("🚀 Sending request to:", url);
          console.log("📤 Payload:", { task_id, transition_id, notes });

          const res = await axios({
            method,
            url,
            data: {
              task_id,
              transition_id,
              notes,
            },
          });

          console.log("✅ Response received:", res.data);
          setResponse(res.data);
        } catch (err) {
          console.error("❌ Error:", err.response?.data || err.message);
          setError(err.response?.data || err.message);
        } finally {
          setLoading(false);
        }
      };

      sendAction();
    }
  }, [trigger, task_id, transition_id, method, notes, user]); // ✅ Updated dependencies

  return { response, loading, error };
};

export default useTriggerAction;
