import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/ContextFilterModal.css";

export default function StatusFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const [filters, setFilters] = useState({
    usageSort: "", // "desc" = greatest to least used, "asc" = least to greatest
  });


  // Initialize filters from props
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setFilters((prev) => ({
        ...prev,
        ...initialFilters,
      }));
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
      usageSort: "",
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
    <div className="status-modal-overlay" onClick={handleOverlayClick}>
      <div className="status-filter-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="status-modal-header">
          <h2>Filter Statuses</h2>
          <button className="status-modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="status-filter-modal-body">
          <div className="status-filter-grid">
            {/* Sort by Assets (usage count) */}
            <fieldset>
              <label htmlFor="usageSort">Sort by Assets</label>
              <select
                id="usageSort"
                value={filters.usageSort}
                onChange={(e) => handleInputChange("usageSort", e.target.value)}
              >
                <option value="">None</option>
                <option value="desc">Greatest to least used</option>
                <option value="asc">Least to greatest used</option>
              </select>
            </fieldset>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="status-modal-footer">
          <button className="status-modal-cancel-btn" onClick={handleReset}>
            Reset Filter
          </button>
          <button className="status-modal-save-btn" onClick={handleApply}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

