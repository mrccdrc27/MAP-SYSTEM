import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/Modal.css";
import "../../styles/AssetFilterModal.css";

export default function DueAuditFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const [filters, setFilters] = useState({
    dueDate: "",
    asset: "",
    created: "",
    audit: "",
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
      dueDate: "",
      asset: "",
      created: "",
      audit: "",
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
            {/* Due Date */}
            <fieldset>
              <label htmlFor="dueDate">Due Date</label>
              <input
                type="date"
                id="dueDate"
                value={filters.dueDate}
                onChange={(e) => handleInputChange("dueDate", e.target.value)}
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

            {/* Created */}
            <fieldset>
              <label htmlFor="created">Created</label>
              <input
                type="date"
                id="created"
                value={filters.created}
                onChange={(e) => handleInputChange("created", e.target.value)}
              />
            </fieldset>

            {/* Audit */}
            <fieldset>
              <label htmlFor="audit">Audit</label>
              <input
                type="text"
                id="audit"
                placeholder="Enter Audit Status"
                value={filters.audit}
                onChange={(e) => handleInputChange("audit", e.target.value)}
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

