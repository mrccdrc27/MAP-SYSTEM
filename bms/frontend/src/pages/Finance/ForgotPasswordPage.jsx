import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './loginPage.css';
import backgroundImage from '../../assets/LOGO.jpg';
import { requestPasswordReset } from '../../API/authAPI';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      
      await requestPasswordReset(email);
      setMessage('Password reset link has been sent.');
      setIsSuccess(true);
    } catch (error) {
      // Even on error, show a generic message to prevent email enumeration
      setMessage('Password reset link has been sent.');
      setIsSuccess(true); // Treat as "success" from a UI perspective
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="left-panel">
        <img src={backgroundImage} alt="BudgetPro Logo" className="asset-image" />
      </section>
      
      <section className="right-panel">
        <header className="form-header">
          <section className="logo"><h1 className="logo-text">BUDGET PRO</h1></section>
          <p>Enter your email to reset your password</p>
        </header>

        {message && (
          <div className={isSuccess ? 'success-message' : 'error-message'}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <fieldset>
            <label>Email:</label>
            <input
              type="email"
              className="form-input"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </fieldset>

          <button
            type="submit"
            className="log-in-button"
            disabled={isLoading || isSuccess} // Disable after successful submission
          >
            {isLoading ? 'SENDING...' : 'SEND RESET LINK'}
          </button>
        </form>

        <p className="back-to-login-text" onClick={() => navigate('/login')}>
          Back to Login
        </p>
      </section>
    </div>
  );
}

export default ForgotPasswordPage;