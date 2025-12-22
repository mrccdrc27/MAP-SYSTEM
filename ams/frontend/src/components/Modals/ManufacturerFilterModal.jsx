import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/ContextFilterModal.css";

export default function ManufacturerFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const [filters, setFilters] = useState({
    name: "",
    url: "",
    email: "",
  });

  // Initialize filters from props
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
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
    setFilters({
      name: "",
      url: "",
      email: "",
    });
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
    <div className="manufacturer-modal-overlay" onClick={handleOverlayClick}>
      <div className="manufacturer-filter-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="manufacturer-modal-header">
          <h2>Filter Manufacturers</h2>
          <button className="manufacturer-modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="manufacturer-filter-modal-body">
          <div className="manufacturer-filter-grid">
            {/* Manufacturer Name */}
            <fieldset>
              <label htmlFor="name">Manufacturer Name</label>
              <input
                type="text"
                id="name"
                placeholder="Enter Manufacturer Name"
                value={filters.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </fieldset>

            {/* URL */}
            <fieldset>
              <label htmlFor="url">URL</label>
              <input
                type="text"
                id="url"
                placeholder="Enter URL"
                value={filters.url}
                onChange={(e) => handleInputChange("url", e.target.value)}
              />
            </fieldset>

            {/* Email */}
            <fieldset>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter Email"
                value={filters.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </fieldset>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="manufacturer-modal-footer">
          <button className="manufacturer-modal-cancel-btn" onClick={handleReset}>
            Reset Filter
          </button>
          <button className="manufacturer-modal-save-btn" onClick={handleApply}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

