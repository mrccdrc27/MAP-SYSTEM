import React from 'react';
import '../../styles/ViewModal.css';
import SampleImage from "../../assets/img/dvi.jpeg";

export default function ConsumablesViewModal({ isOpen, onClose, consumableId }) {
  if (!isOpen) return null;

  // Sample consumable data - replace with actual data fetching
  const consumableData = {
    '1': {
      image: SampleImage,
      name: 'A3 Paper',
      category: 'Printer Paper',
      manufacturer: 'Canon',
      supplier: 'WalMart',
      location: 'Sydney',
      modelNumber: '',
      orderNumber: 'ORD-1001',
      purchaseDate: '2024-01-15',
      purchaseCost: 25.99,
      quantity: 142,
      minimumQuantity: 20,
      notes: 'High quality A3 paper for office printing',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15'
    },
    '2': {
      image: SampleImage,
      name: 'A4 Paper',
      category: 'Printer Paper',
      manufacturer: 'Canon',
      supplier: 'WalMart',
      location: 'Palo Alto',
      modelNumber: '',
      orderNumber: 'ORD-1003',
      purchaseDate: '2024-01-20',
      purchaseCost: 22.99,
      quantity: 120,
      minimumQuantity: 15,
      notes: 'Standard A4 paper for daily office use',
      createdAt: '2024-01-20',
      updatedAt: '2024-01-20'
    },
    '3': {
      image: SampleImage,
      name: 'Canon 580 PGBK Ink',
      category: 'Printer Ink',
      manufacturer: 'Canon',
      supplier: 'Staples',
      location: 'New York',
      modelNumber: '580 PGBK',
      orderNumber: 'ORD-1002',
      purchaseDate: '2024-02-10',
      purchaseCost: 45.50,
      quantity: 30,
      minimumQuantity: 5,
      notes: 'Black ink cartridge for Canon printers',
      createdAt: '2024-02-10',
      updatedAt: '2024-02-10'
    }
  };

  const consumable = consumableData[consumableId] || {};

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content view-modal">
        <div className="modal-header">
          <h2>Consumable Details</h2>
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="view-content">
            <div className="image-section">
              <img src={consumable.image} alt={consumable.name} className="consumable-image" />
            </div>

            <div className="details-section">
              <div className="detail-group">
                <h3>Basic Information</h3>
                <div className="detail-row">
                  <span className="label">Name:</span>
                  <span className="value">{consumable.name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Category:</span>
                  <span className="value">{consumable.category}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Model Number:</span>
                  <span className="value">{consumable.modelNumber || 'N/A'}</span>
                </div>
              </div>

              <div className="detail-group">
                <h3>Inventory Information</h3>
                <div className="detail-row">
                  <span className="label">Available Quantity:</span>
                  <span className="value">{consumable.quantity}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Minimum Quantity:</span>
                  <span className="value">{consumable.minimumQuantity}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Location:</span>
                  <span className="value">{consumable.location}</span>
                </div>
              </div>

              <div className="detail-group">
                <h3>Supplier Information</h3>
                <div className="detail-row">
                  <span className="label">Manufacturer:</span>
                  <span className="value">{consumable.manufacturer}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Supplier:</span>
                  <span className="value">{consumable.supplier}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Order Number:</span>
                  <span className="value">{consumable.orderNumber || 'N/A'}</span>
                </div>
              </div>

              <div className="detail-group">
                <h3>Purchase Information</h3>
                <div className="detail-row">
                  <span className="label">Purchase Date:</span>
                  <span className="value">{consumable.purchaseDate || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Purchase Cost:</span>
                  <span className="value">${consumable.purchaseCost || 'N/A'}</span>
                </div>
              </div>

              {consumable.notes && (
                <div className="detail-group">
                  <h3>Notes</h3>
                  <div className="detail-row">
                    <span className="value notes">{consumable.notes}</span>
                  </div>
                </div>
              )}

              <div className="detail-group">
                <h3>System Information</h3>
                <div className="detail-row">
                  <span className="label">Created:</span>
                  <span className="value">{consumable.createdAt}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Last Updated:</span>
                  <span className="value">{consumable.updatedAt}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
