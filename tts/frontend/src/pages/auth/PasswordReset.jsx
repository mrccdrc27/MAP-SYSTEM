// src/pages/ResetPassword.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_USER_SERVER_API; // e.g. http://localhost:8000/api/

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [isTokenValid, setIsTokenValid] = useState(null); // null = loading, true = valid, false = invalid
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        await axios.get(`${API_BASE}password/validate-reset-token/${uid}/${token}/`);
        setIsTokenValid(true);
      } catch (err) {
        setIsTokenValid(false);
        setError(err.response?.data?.error || 'Invalid or expired token.');
      }
    };

    checkToken();
  }, [uid, token]);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_BASE}password/reset/confirm/${uid}/${token}/`, {
        uid: uid,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setMessage(res.data.message);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.new_password) {
        setError(err.response.data.new_password.join(', '));
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isTokenValid === null) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-color)',
        fontSize: '1.2rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid var(--primary-color)',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite'
          }}></div>
          Validating reset link...
        </div>
      </div>
    );
  }

  // Invalid token state
  if (isTokenValid === false) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-color)',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          color: 'var(--warning-text)',
          fontSize: '1.2rem',
          textAlign: 'center',
          padding: '20px'
        }}>
          {error}
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            border: 'none',
            color: 'var(--primary-color)',
            backgroundColor: 'var(--bg-color)',
            cursor: 'pointer',
            fontSize: '1rem',
            textDecoration: 'underline'
          }}
        >
          ← Back to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-color)'
    }}>
      {/* Left Panel - Optional decorative image */}
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '50vw',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        backgroundColor: '#f8fafc'
      }}>
        {/* You can add an image here if needed */}
        <div style={{
          fontSize: '4rem',
          color: 'var(--primary-color)',
          opacity: 0.6
        }}>
          <img src="/resetpass.svg" alt=""/>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px'
      }}>
        {/* Form Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            marginBottom: '1rem',
            gap: '10px'
          }}>
            <div style={{
              fontSize: '1.8rem',
              fontWeight: 'bold',
              color: '#3b82f6',
              margin: 0
            }}>
              Reset Password
            </div>
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            margin: '0 0 10px 0',
            color: 'var(--text-color)'
          }}>
            Create New Password
          </h1>
          <p style={{
            fontSize: '1rem',
            color: 'var(--text-color)',
            margin: 0
          }}>
            Enter your new password below
          </p>
        </div>

        {/* Form */}
        <form 
          onSubmit={handleReset}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '70%',
            gap: '20px'
          }}
        >
          <fieldset style={{
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'start',
            width: '100%',
            gap: '8px',
            margin: 0,
            padding: 0
          }}>
            <label style={{
              color: 'var(--text-color)',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              New Password
            </label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{
                display: 'flex',
                width: '100%',
                height: '44px',
                padding: '18px 16px',
                borderRadius: '40px',
                border: '1px solid #d3d3d3',
                backgroundColor: 'var(--bg-color)',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.outline = '2px solid var(--primary-color)'}
              onBlur={(e) => e.target.style.outline = 'none'}
            />
          </fieldset>

          <fieldset style={{
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'start',
            width: '100%',
            gap: '8px',
            margin: 0,
            padding: 0
          }}>
            <label style={{
              color: 'var(--text-color)',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                display: 'flex',
                width: '100%',
                height: '44px',
                padding: '18px 16px',
                borderRadius: '40px',
                border: '1px solid #d3d3d3',
                backgroundColor: 'var(--bg-color)',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.outline = '2px solid var(--primary-color)'}
              onBlur={(e) => e.target.style.outline = 'none'}
            />
          </fieldset>

          {/* Form Button */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'center'
          }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 32px',
                border: 'none',
                borderRadius: '40px',
                backgroundColor: isLoading ? '#d3d3d3' : 'var(--primary-color)',
                color: isLoading ? '#777' : 'var(--bg-color)',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'ease 0.5s',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.target.style.backgroundColor = 'rgba(0, 123, 255, 0.8)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.target.style.backgroundColor = 'var(--primary-color)';
                }
              }}
            >
              {isLoading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  display: 'inline-block'
                }}></div>
              )}
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>

        {/* Messages */}
        {message && (
          <p style={{
            color: '#10b981',
            textAlign: 'center',
            marginTop: '1rem',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            {message}
          </p>
        )}
        
        {error && (
          <p style={{
            color: 'var(--warning-text)',
            fontSize: '0.875rem',
            marginTop: '0.25rem',
            textAlign: 'center'
          }}>
            {error}
          </p>
        )}
      </div>

      {/* Add keyframes for spinner animation */}
      <style>
        {`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}