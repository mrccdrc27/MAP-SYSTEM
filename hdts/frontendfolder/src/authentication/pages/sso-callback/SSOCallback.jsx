import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

/**
 * SSOCallback - Handles SSO redirect with token in URL
 * Receives: /hdts?user_id=2&system=hdts&token=xxx
 * 
 * This component:
 * 1. Extracts the token from URL
 * 2. Waits for AuthContext to fetch user profile using the cookie
 * 3. Redirects to the appropriate dashboard based on role
 */
const SSOCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, hasSystemAccess, loading, initialized } = useAuth();
  const [attemptedRedirect, setAttemptedRedirect] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const system = searchParams.get('system');
    const userId = searchParams.get('user_id');

    // Log for debugging
    console.log('SSO Callback - Token present:', !!token);
    console.log('SSO Callback - System:', system);
    console.log('SSO Callback - User ID:', userId);
    console.log('SSO Callback - Initialized:', initialized);
    console.log('SSO Callback - Loading:', loading);
    console.log('SSO Callback - User:', user);
    console.log('SSO Callback - Has System Access:', hasSystemAccess);
    console.log('SSO Callback - Is Admin:', isAdmin);

    // Wait for auth to initialize
    if (!initialized || loading) {
      console.log('Waiting for auth initialization...');
      return;
    }

    // Prevent multiple redirects
    if (attemptedRedirect) {
      return;
    }

    // If we have a user with system access, redirect to appropriate page
    if (user && hasSystemAccess) {
      setAttemptedRedirect(true);
      if (isAdmin) {
        console.log('Redirecting to admin dashboard');
        navigate('/admin/dashboard', { replace: true });
      } else {
        console.log('Redirecting to employee home');
        navigate('/employee/home', { replace: true });
      }
    } else if (!user && initialized) {
      // If no user found after loading complete, redirect to login
      console.log('No user found after initialization, redirecting to login');
      setAttemptedRedirect(true);
      navigate('/login', { replace: true });
    }
  }, [searchParams, user, isAdmin, hasSystemAccess, loading, initialized, navigate, attemptedRedirect]);

  // Show loading state
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid rgba(59, 130, 246, 0.3)',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px'
      }}></div>
      <style>
        {`@keyframes spin { to { transform: rotate(360deg); } }`}
      </style>
      <p>Authenticating...</p>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
        Verifying your credentials
      </p>
    </div>
  );
};

export default SSOCallback;
