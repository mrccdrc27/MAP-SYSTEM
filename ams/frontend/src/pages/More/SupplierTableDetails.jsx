import React from 'react';
import '../../styles/SupplierTableDetail.css'; // Ensure it contains the updated styles

export default function SupplierTableDetails({ isOpen, onClose, supplier }) {
  if (!isOpen || !supplier) {
    return null;
  }

  const formatLabel = (label) => {
    return label
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Supplier Details</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="details-section">
          {Object.entries(supplier).map(([key, value]) =>
            key !== 'id' && key !== 'logo' ? (
              <React.Fragment key={key}>
                <div className="label">{formatLabel(key)}:</div>
                <div className="value">
                  {key === 'url' ? (
                    <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>
                  ) : (
                    value || '-'
                  )}
                </div>
              </React.Fragment>
            ) : null
          )}
        </div>

        <div className="modal-footer" style={{ textAlign: 'right', marginTop: '2rem' }}>
          <button className="button-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
