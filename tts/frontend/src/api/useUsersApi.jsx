// src/api/useUsersApi.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const baseUrl = import.meta.env.VITE_USER_SERVER_API;

const useUsersApi = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // GET /users/
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${baseUrl}/api/v1/system-roles/user-system-roles/`);
      setUsers(response.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  // POST /users/{user_id}/activate/
  const activateUser = useCallback(async (userId, isActive) => {
    try {
      await axios.post(`${baseUrl}users/${userId}/activate/`, {
        is_active: isActive,
      });
      fetchUsers(); // Refresh after update
    } catch (err) {
      setError(`Failed to update user ${userId}`);
    }
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    fetchUsers,
    activateUser,
  };
};

export default useUsersApi;
