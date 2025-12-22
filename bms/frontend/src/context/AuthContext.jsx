import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../API/authAPI';// Importd new logout function
import { jwtDecode } from 'jwt-decode'; // install this: npm install jwt-decode

const AuthContext = createContext(null);

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
                // Check if the token is expired
                if (decodedToken.exp * 1000 > Date.now()) {
                    setUser(JSON.parse(storedUser));
                } else {
                    // Token is expired, clear everything
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                }
            }
        } catch (error) {
            console.error("Failed to initialize auth state:", error);
            // Clear any corrupted auth data
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (identifier, password) => {
        try {
            const data = await authApi.login(identifier, password);
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            // Store the full user object in local storage
            localStorage.setItem('user', JSON.stringify(data.user)); 
            
            setUser(data.user); // Set the full user object in state
            navigate('/dashboard', { replace: true });
        } catch (error) {
            console.error('Login failed:', error);
            throw error; // Re-throw to be caught by the login form
        }
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
            try {
                await authApi.logout(refreshToken);
            } catch (error) {
                console.error("Server logout failed, clearing tokens locally.", error);
            }
        }
        // Always clear local state and storage
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
    };

    /**
     * Updates the user state in the context and local storage.
     * This is called after a successful profile update.
     * @param {object} updatedUserData - The full user object returned from the API.
     */
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
        updateUserContext, // Expose the new function
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};