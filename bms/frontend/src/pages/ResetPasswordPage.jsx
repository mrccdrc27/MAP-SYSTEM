import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { confirmPasswordReset } from '../API/authAPI';

function ResetPasswordPage() {
  const { uid, token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 8 || password.length > 64) {
      setMessage('Password must be between 8 and 64 characters long.');
      return;
    }

    setIsLoading(true);
    try {
 
      await confirmPasswordReset(uid, token, password);
      
      // On success, navigate to the login page with a success message
      navigate('/login', { state: { message: 'Password reset successfully! Please log in.' } });

    } catch (error) {
      // Handle specific errors from the backend serializer
      const errors = error.response?.data;
      if (errors) {
        if (errors.uid) setMessage(errors.uid[0]);
        else if (errors.token) setMessage(errors.token[0]);
        else if (errors.password) setMessage(errors.password.join(' '));
        else setMessage('An unknown error occurred.');
      } else {
        setMessage('Password reset failed. The link may be invalid or expired.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="form-container">
          <h2>Reset Password</h2>
          {message && <div className="error-message">{message}</div>}
          <form onSubmit={handleSubmit}>
            <div>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;