import React from 'react';
import './AuthExpiredModal.css';

const AuthExpiredModal = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="aem-backdrop">
      <div className="aem-modal" role="dialog" aria-modal="true" aria-labelledby="aem-title">
        <h2 id="aem-title">Session expired</h2>
        <p>Your session has expired. Please login again to continue.</p>
        <div className="aem-actions">
          <button className="aem-btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default AuthExpiredModal;
