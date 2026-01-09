import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../API/authAPI';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from './AuthContextDefinition'; // Import shared context

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                const decodedToken = jwtDecode(token);
                if (decodedToken.exp * 1000 > Date.now()) {
                    setUser(JSON.parse(storedUser));
                } else {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                }
            }
        } catch (error) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (creds) => {
        try {
            // Support both object {email, password} and separate args
            const email = creds.email || creds;
            const password = creds.password;

            const data = await authApi.login(email, password);
            
            // Handle SimpleJWT structure { refresh, access }
            // The user data might need to be fetched separately or included in token payload
            // For now, assume authApi.login returns user object or we decode it
            
            const decoded = jwtDecode(data.access);
            
            // Normalize user object from token claims for Local Context
            const userData = {
                id: decoded.user_id,
                email: decoded.email || email,
                username: decoded.username,
                role: decoded.roles?.bms || 'GENERAL_USER', // Extract role from BMS claim
                // Add default values to prevent crashes
                first_name: decoded.first_name || '',
                last_name: decoded.last_name || ''
            };

            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem('user', JSON.stringify(userData)); 
            
            setUser(userData);
            navigate('/dashboard', { replace: true });
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Invalid credentials' };
        }
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
            try {
                await authApi.logout(refreshToken);
            } catch (error) {}
        }
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
    };

    const updateUserContext = (updatedUserData) => {
        setUser(updatedUserData);
        localStorage.setItem('user', JSON.stringify(updatedUserData));
    };

    // Polyfills for App.jsx compatibility
    const isAdmin = () => user?.role === 'ADMIN';
    const isFinanceHead = () => user?.role === 'FINANCE_HEAD';
    const getBmsRole = () => user?.role;
    const hasBmsAccess = () => true; 
    const initialized = !loading;

    const value = {
        user,
        isAuthenticated: !!user,
        loading,
        initialized,
        login,
        logout,
        updateUserContext,
        isAdmin,
        isFinanceHead,
        getBmsRole,
        hasBmsAccess
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};