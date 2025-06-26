// src/api/useTriggerAction.js
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext"; // ✅ Import auth context

const useTriggerAction = ({ uuid, action_id, method = "post", trigger = false,  comment = "" } = {}) => {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { user } = useAuth(); // ✅ Get user from context

  useEffect(() => {
    if (trigger && uuid && action_id && user) {
      const sendAction = async () => {
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
          const baseURL = import.meta.env.VITE_BACKEND_API;
          const url = `${baseURL}instance/${uuid}/`;

          // ✅ Construct full user name
          const fullName = [user.first_name, user.middle_name, user.last_name, user.suffix]
            .filter(Boolean)
            .join(" ");

          const res = await axios({
            method,
            url,
            data: {
              action_id,
              user: fullName,
              comment, 
            },
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
  }, [trigger, uuid, action_id, method, user]);

  return { response, loading, error };
};

export default useTriggerAction;
