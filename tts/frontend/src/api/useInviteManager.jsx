import { useState, useEffect } from "react";
import axios from "axios";

// Get API base from env, and define endpoints here
const API_BASE = import.meta.env.VITE_USER_SERVER_API || "";
const INVITE_ENDPOINT = `${API_BASE}registration/invite/`;
const PENDING_ENDPOINT = `${API_BASE}registration/pending-invites/`;
const DELETE_ENDPOINT = (id) => `${API_BASE}registration/pending-invites/${id}/`;

export function useInviteManager() {
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Send an invite
  const inviteUser = async ({ email, role }) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await axios.post(INVITE_ENDPOINT, { email, role });
      console.log('sent', email,role)
      setSuccess(true);
      await fetchPendingInvites();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Invitation failed");
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending invites
  const fetchPendingInvites = async () => {
    try {
      const response = await axios.get(PENDING_ENDPOINT);
      setPending(response.data);
    } catch (err) {
      setError("Failed to load pending invites");
    }
  };

  // Delete a pending invite by ID
  const deleteInvite = async (id) => {
    try {
      await axios.delete(DELETE_ENDPOINT(id));
      await fetchPendingInvites();
    } catch (err) {
      setError("Failed to delete invite");
    }
  };

  useEffect(() => {
    fetchPendingInvites();
  }, []);

  return {
    inviteUser,
    deleteInvite,
    fetchPendingInvites,
    pending,
    loading,
    error,
    success,
  };
}
