import React, { useState, useEffect, useRef } from 'react';
import '../styles/FilterOverlay.css';

export default function FilterOverlay({ isOpen, onClose, onApplyFilters }) {
  const [filters, setFilters] = useState({
    role: [],
    status: [],
    name: ''
  });

  const overlayRef = useRef(null);

  // Close the overlay when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (overlayRef.current && !overlayRef.current.contains(event.target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleRoleChange = (role) => {
    setFilters(prev => {
      const newRoles = prev.role.includes(role)
        ? prev.role.filter(r => r !== role)
        : [...prev.role, role];
      
      return { ...prev, role: newRoles };
    });
  };

  const handleStatusChange = (status) => {
    setFilters(prev => {
      const newStatus = prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status];
      
      return { ...prev, status: newStatus };
    });
  };

  const handleNameChange = (e) => {
    setFilters(prev => ({ ...prev, name: e.target.value }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters({
      role: [],
      status: [],
      name: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="filter-overlay">
      <div className="filter-content" ref={overlayRef}>
        <div className="filter-header">
          <h3>Filter Users</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="filter-section">
          <h4>Full Name</h4>
          <input 
            type="text" 
            placeholder="Search by name"
            value={filters.name}
            onChange={handleNameChange}
            className="filter-input"
          />
        </div>
        
        <div className="filter-section">
          <h4>Role</h4>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={filters.role.includes('Admin')}
                onChange={() => handleRoleChange('Admin')}
              />
              Admin
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={filters.role.includes('Operator')}
                onChange={() => handleRoleChange('Operator')}
              />
              Operator
            </label>
          </div>
        </div>
        
        <div className="filter-section">
          <h4>Status</h4>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={filters.status.includes('Active')}
                onChange={() => handleStatusChange('Active')}
              />
              Active
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={filters.status.includes('Inactive')}
                onChange={() => handleStatusChange('Inactive')}
              />
              Inactive
            </label>
          </div>
        </div>
        
        <div className="filter-actions">
          <button className="clear-btn" onClick={handleClear}>Clear All</button>
          <button className="apply-btn" onClick={handleApply}>Apply Filters</button>
        </div>
      </div>
    </div>
  );
}
