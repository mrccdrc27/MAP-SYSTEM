import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/ContextFilterModal.css";

export default function CategoryFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const [filters, setFilters] = useState({
    name: "",
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
    <div className="category-modal-overlay" onClick={handleOverlayClick}>
      <div className="category-filter-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="category-modal-header">
          <h2>Filter Categories</h2>
          <button className="category-modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="category-filter-modal-body">
          <div className="category-filter-grid">
            {/* Category Name */}
            <fieldset>
              <label htmlFor="name">Category Name</label>
              <input
                type="text"
                id="name"
                placeholder="Enter Category Name"
                value={filters.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </fieldset>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="category-modal-footer">
          <button className="category-modal-cancel-btn" onClick={handleReset}>
            Reset Filter
          </button>
          <button className="category-modal-save-btn" onClick={handleApply}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

