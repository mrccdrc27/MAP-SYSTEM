import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/ContextFilterModal.css";

export default function RecycleBinFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {}, activeTab }) {

  const [filters, setFilters] = useState({
    name: "",
    category: "",
    manufacturer: "",
    supplier: "",
    location: "",
  });

  // Initialize filters from props
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setFilters((prev) => ({ ...prev, ...initialFilters }));
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
      category: "",
      manufacturer: "",
      supplier: "",
      location: "",
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
    <div className="recyclebin-modal-overlay" onClick={handleOverlayClick}>
      <div className="recyclebin-filter-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="recyclebin-modal-header">
          <h2>
            {activeTab === "components"
              ? "Filter Deleted Components"
              : "Filter Deleted Assets"}
          </h2>
          <button className="recyclebin-modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="recyclebin-filter-modal-body">
          <div className="recyclebin-filter-grid">
            {/* Name */}
            <fieldset>
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                placeholder="Enter Name"
                value={filters.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </fieldset>

            {/* Category */}
            <fieldset>
              <label htmlFor="category">Category</label>
              <input
                type="text"
                id="category"
                placeholder="Enter Category"
                value={filters.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
              />
            </fieldset>

            {/* Manufacturer */}
            <fieldset>
              <label htmlFor="manufacturer">Manufacturer</label>
              <input
                type="text"
                id="manufacturer"
                placeholder="Enter Manufacturer"
                value={filters.manufacturer}
                onChange={(e) => handleInputChange("manufacturer", e.target.value)}
              />
            </fieldset>

            {/* Supplier */}
            <fieldset>
              <label htmlFor="supplier">Supplier</label>
              <input
                type="text"
                id="supplier"
                placeholder="Enter Supplier"
                value={filters.supplier}
                onChange={(e) => handleInputChange("supplier", e.target.value)}
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
          </div>
        </div>

        {/* Modal Footer */}
        <div className="recyclebin-modal-footer">
          <button className="recyclebin-modal-cancel-btn" onClick={handleReset}>
            Reset Filter
          </button>
          <button className="recyclebin-modal-save-btn" onClick={handleApply}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

