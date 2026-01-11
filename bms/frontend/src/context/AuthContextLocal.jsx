import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../API/authAPI';
import { jwtDecode } from 'jwt-decode';
import { getAccessToken, setAccessToken, removeAccessToken } from '../API/TokenUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        try {
            // Use TokenUtils to get the token (consistent with rest of app)
            const token = getAccessToken();
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                const decodedToken = jwtDecode(token);
                if (decodedToken.exp * 1000 > Date.now()) {
                    setUser(JSON.parse(storedUser));
                } else {
                    // Token expired, clean up
                    removeAccessToken();
                    localStorage.removeItem('user');
                }
            }
        } catch (error) {
            console.error('[AuthLocal] Token validation error:', error);
            removeAccessToken();
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (identifier, password) => {
        try {
            const data = await authApi.login(identifier, password);
            
            // Store using TokenUtils for consistency
            setAccessToken(data.access);
            localStorage.setItem('user', JSON.stringify(data.user)); 
            
            setUser(data.user);
            navigate('/dashboard', { replace: true });
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
            try {
                await authApi.logout(refreshToken);
            } catch (error) {
                console.error('[AuthLocal] Logout API error:', error);
            }
        }
        
        setUser(null);
        removeAccessToken();
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        navigate('/login', { replace: true });
    };

    const updateUserContext = (updatedUserData) => {
        setUser(updatedUserData);
        localStorage.setItem('user', JSON.stringify(updatedUserData));
    };

    const value = {
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        updateUserContext,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);