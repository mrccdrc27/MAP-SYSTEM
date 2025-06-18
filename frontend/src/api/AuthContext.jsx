// src/api/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // useful for gated routes

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    axios.get('http://192.168.100.6:3000/api/me/', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then(res => {
      setUser(res.data);
    })
    .catch(err => {
      console.error("Auth error", err);
      localStorage.removeItem('accessToken');
    })
    .finally(() => {
      setLoading(false);
    });
  }, []);

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
