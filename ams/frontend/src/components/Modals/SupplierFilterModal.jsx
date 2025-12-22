import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/ContextFilterModal.css";

export default function SupplierFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const [filters, setFilters] = useState({
    city: "",
    state: "",
    country: "",
    contact: "",
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
      city: "",
      state: "",
      country: "",
      contact: "",
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
    <div className="supplier-modal-overlay" onClick={handleOverlayClick}>
      <div className="supplier-filter-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="supplier-modal-header">
          <h2>Filter Suppliers</h2>
          <button className="supplier-modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="supplier-filter-modal-body">
          <div className="supplier-filter-grid">
            {/* City */}
            <fieldset>
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                placeholder="Enter City"
                value={filters.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
              />
            </fieldset>

            {/* State */}
            <fieldset>
              <label htmlFor="state">State</label>
              <input
                type="text"
                id="state"
                placeholder="Enter State"
                value={filters.state}
                onChange={(e) => handleInputChange("state", e.target.value)}
              />
            </fieldset>

            {/* Country */}
            <fieldset>
              <label htmlFor="country">Country</label>
              <input
                type="text"
                id="country"
                placeholder="Enter Country"
                value={filters.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
              />
            </fieldset>

            {/* Contact Person */}
            <fieldset>
              <label htmlFor="contact">Contact Person</label>
              <input
                type="text"
                id="contact"
                placeholder="Enter Contact Person"
                value={filters.contact}
                onChange={(e) => handleInputChange("contact", e.target.value)}
              />
            </fieldset>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="supplier-modal-footer">
          <button className="supplier-modal-cancel-btn" onClick={handleReset}>
            Reset Filter
          </button>
          <button className="supplier-modal-save-btn" onClick={handleApply}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

