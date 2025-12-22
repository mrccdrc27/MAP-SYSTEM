import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/Modal.css";
import "../../styles/AssetFilterModal.css";

export default function UserManagementFilterModal({
  isOpen,
  onClose,
  onApplyFilter,
  initialFilters = {},
}) {
  const initialState = {
    name: "",
    role: "",
    status: "",
    company: "",
  };

  const [filters, setFilters] = useState(initialState);

  const roleOptions = ["Admin", "Manager", "Employee"];
  const statusOptions = ["Active", "Inactive"];

  // Initialize filters from props
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setFilters((prev) => ({
        ...prev,
        ...initialFilters,
      }));
    } else {
      setFilters(initialState);
    }
  }, [initialFilters]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Reset all filters
  const handleReset = () => {
    setFilters(initialState);
  };

  // Apply filters
  const handleApply = () => {
    onApplyFilter(filters);
    onClose();
  };

  // Close modal on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-container asset-filter-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Filter Users</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body asset-filter-modal-body">
          <div className="filter-grid">
            {/* Full Name */}
            <fieldset>
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                placeholder="Search by name"
                value={filters.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </fieldset>

            {/* Role */}
            <fieldset>
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={filters.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
              >
                <option value="">Select Role</option>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Status */}
            <fieldset>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                <option value="">Select Status</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Company */}
            <fieldset>
              <label htmlFor="company">Company</label>
              <input
                type="text"
                id="company"
                placeholder="Search by company"
                value={filters.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
              />
            </fieldset>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={handleReset}>
            Reset Filter
          </button>
          <button className="modal-save-btn" onClick={handleApply}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

