import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/Modal.css";
import "../../styles/AssetFilterModal.css";

export default function CompletedAuditFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const [filters, setFilters] = useState({
    auditDate: "",
    asset: "",
    location: "",
    performedBy: "",
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
      auditDate: "",
      asset: "",
      location: "",
      performedBy: "",
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
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container asset-filter-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Filter Audits</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body asset-filter-modal-body">
          <div className="filter-grid">
            {/* Audit Date */}
            <fieldset>
              <label htmlFor="auditDate">Audit Date</label>
              <input
                type="date"
                id="auditDate"
                value={filters.auditDate}
                onChange={(e) => handleInputChange("auditDate", e.target.value)}
              />
            </fieldset>

            {/* Asset */}
            <fieldset>
              <label htmlFor="asset">Asset</label>
              <input
                type="text"
                id="asset"
                placeholder="Enter Asset Name"
                value={filters.asset}
                onChange={(e) => handleInputChange("asset", e.target.value)}
              />
            </fieldset>

            {/* Location */}
            <fieldset>
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                placeholder="Enter Location"
                value={filters.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
              />
            </fieldset>

            {/* Performed By */}
            <fieldset>
              <label htmlFor="performedBy">Performed By</label>
              <input
                type="text"
                id="performedBy"
                placeholder="Enter Performer Name"
                value={filters.performedBy}
                onChange={(e) => handleInputChange("performedBy", e.target.value)}
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

