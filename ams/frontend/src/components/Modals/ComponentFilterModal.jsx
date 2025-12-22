import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/Modal.css";
import "../../styles/AssetFilterModal.css";

export default function ComponentFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const [filters, setFilters] = useState({
    // Dropdowns
    category: null,
    manufacturer: null,
    supplier: null,
    location: null,
    // Purchase Date
    purchaseDateFrom: "",
    purchaseDateTo: "",
    // Due for Check-in (from component checkout/checkin data)
    dueForCheckinFrom: "",
    dueForCheckinTo: "",
    // Created / Updated At (front-end only mock fields)
    createdAtFrom: "",
    createdAtTo: "",
    updatedAtFrom: "",
    updatedAtTo: "",
  });

  // Category options – mapped to component-mockup-data.json categories
  const categoryOptions = [
    { value: "Memory", label: "Memory" },
    { value: "Storage", label: "Storage" },
    { value: "Power", label: "Power" },
    { value: "Cooling", label: "Cooling" },
    { value: "Networking", label: "Networking" },
    { value: "GPU", label: "GPU" },
    { value: "Motherboard", label: "Motherboard" },
    { value: "Battery", label: "Battery" },
    { value: "Accessories", label: "Accessories" },
    { value: "Cabling", label: "Cabling" },
  ];

  // Manufacturer options – mapped to component-mockup-data.json manufacturers
  const manufacturerOptions = [
    { value: "Kingston", label: "Kingston" },
    { value: "Crucial", label: "Crucial" },
    { value: "Corsair", label: "Corsair" },
    { value: "Cooler Master", label: "Cooler Master" },
    { value: "Intel", label: "Intel" },
    { value: "NVIDIA", label: "NVIDIA" },
    { value: "ASUS", label: "ASUS" },
    { value: "Dell", label: "Dell" },
    { value: "Anker", label: "Anker" },
    { value: "Generic", label: "Generic" },
  ];

  // Supplier options – mapped to component-mockup-data.json suppliers
  const supplierOptions = [
    { value: "Kingston Supplies", label: "Kingston Supplies" },
    { value: "Crucial Distributors", label: "Crucial Distributors" },
    { value: "Corsair Partners", label: "Corsair Partners" },
    { value: "Cooler Master Supply", label: "Cooler Master Supply" },
    { value: "Intel Hardware Supplies", label: "Intel Hardware Supplies" },
    { value: "NVIDIA Resellers", label: "NVIDIA Resellers" },
    { value: "ASUS Distribution", label: "ASUS Distribution" },
    { value: "Dell OEM Parts", label: "Dell OEM Parts" },
    { value: "Anker Distributors", label: "Anker Distributors" },
    { value: "Generic Supplies Ltd", label: "Generic Supplies Ltd" },
  ];

  // Location options – mapped to component-mockup-data.json locations
  const locationOptions = [
    { value: "Warehouse A1", label: "Warehouse A1" },
    { value: "Warehouse B3", label: "Warehouse B3" },
    { value: "Warehouse C2", label: "Warehouse C2" },
    { value: "Warehouse D4", label: "Warehouse D4" },
    { value: "Warehouse B1", label: "Warehouse B1" },
    { value: "Warehouse E2", label: "Warehouse E2" },
    { value: "Warehouse C3", label: "Warehouse C3" },
    { value: "Warehouse A3", label: "Warehouse A3" },
    { value: "Warehouse D1", label: "Warehouse D1" },
    { value: "Warehouse B2", label: "Warehouse B2" },
  ];

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

  // Handle select changes
  const handleSelectChange = (field, selectedOption) => {
    setFilters((prev) => ({
      ...prev,
      [field]: selectedOption,
    }));
  };

  // Reset all filters
  const handleReset = () => {
    setFilters({
      category: null,
      manufacturer: null,
      supplier: null,
      location: null,
      purchaseDateFrom: "",
      purchaseDateTo: "",
      dueForCheckinFrom: "",
      dueForCheckinTo: "",
      createdAtFrom: "",
      createdAtTo: "",
      updatedAtFrom: "",
      updatedAtTo: "",
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
          <h2>Filter Components</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body asset-filter-modal-body">
          <div className="filter-grid">
            {/* Category (Dropdown) */}
            <fieldset>
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={filters.category?.value || ""}
                onChange={(e) => {
                  const selectedOption = categoryOptions.find((opt) => opt.value === e.target.value);
                  handleSelectChange("category", selectedOption || null);
                }}
              >
                <option value="">Select Category</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Manufacturer (Dropdown) */}
            <fieldset>
              <label htmlFor="manufacturer">Manufacturer</label>
              <select
                id="manufacturer"
                value={filters.manufacturer?.value || ""}
                onChange={(e) => {
                  const selectedOption = manufacturerOptions.find((opt) => opt.value === e.target.value);
                  handleSelectChange("manufacturer", selectedOption || null);
                }}
              >
                <option value="">Select Manufacturer</option>
                {manufacturerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Supplier (Dropdown) */}
            <fieldset>
              <label htmlFor="supplier">Supplier</label>
              <select
                id="supplier"
                value={filters.supplier?.value || ""}
                onChange={(e) => {
                  const selectedOption = supplierOptions.find((opt) => opt.value === e.target.value);
                  handleSelectChange("supplier", selectedOption || null);
                }}
              >
                <option value="">Select Supplier</option>
                {supplierOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Location (Dropdown) */}
            <fieldset>
              <label htmlFor="location">Location</label>
              <select
                id="location"
                value={filters.location?.value || ""}
                onChange={(e) => {
                  const selectedOption = locationOptions.find((opt) => opt.value === e.target.value);
                  handleSelectChange("location", selectedOption || null);
                }}
              >
                <option value="">Select Location</option>
                {locationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Purchase Date From */}
            <fieldset>
              <label htmlFor="purchaseDateFrom">Purchase Date From</label>
              <input
                type="date"
                id="purchaseDateFrom"
                value={filters.purchaseDateFrom}
                onChange={(e) => handleInputChange("purchaseDateFrom", e.target.value)}
              />
            </fieldset>

            {/* Purchase Date To */}
            <fieldset>
              <label htmlFor="purchaseDateTo">Purchase Date To</label>
              <input
                type="date"
                id="purchaseDateTo"
                value={filters.purchaseDateTo}
                onChange={(e) => handleInputChange("purchaseDateTo", e.target.value)}
              />
            </fieldset>

            {/* Due for Check-in From */}
            <fieldset>
              <label htmlFor="dueForCheckinFrom">Due for Check-in From</label>
              <input
                type="date"
                id="dueForCheckinFrom"
                value={filters.dueForCheckinFrom}
                onChange={(e) => handleInputChange("dueForCheckinFrom", e.target.value)}
              />
            </fieldset>

            {/* Due for Check-in To */}
            <fieldset>
              <label htmlFor="dueForCheckinTo">Due for Check-in To</label>
              <input
                type="date"
                id="dueForCheckinTo"
                value={filters.dueForCheckinTo}
                onChange={(e) => handleInputChange("dueForCheckinTo", e.target.value)}
              />
            </fieldset>

            {/* Created At From */}
            <fieldset>
              <label htmlFor="createdAtFrom">Created At (From)</label>
              <input
                type="date"
                id="createdAtFrom"
                value={filters.createdAtFrom}
                onChange={(e) => handleInputChange("createdAtFrom", e.target.value)}
              />
            </fieldset>

            {/* Created At To */}
            <fieldset>
              <label htmlFor="createdAtTo">Created At (To)</label>
              <input
                type="date"
                id="createdAtTo"
                value={filters.createdAtTo}
                onChange={(e) => handleInputChange("createdAtTo", e.target.value)}
              />
            </fieldset>

            {/* Updated At From */}
            <fieldset>
              <label htmlFor="updatedAtFrom">Updated At (From)</label>
              <input
                type="date"
                id="updatedAtFrom"
                value={filters.updatedAtFrom}
                onChange={(e) => handleInputChange("updatedAtFrom", e.target.value)}
              />
            </fieldset>

            {/* Updated At To */}
            <fieldset>
              <label htmlFor="updatedAtTo">Updated At (To)</label>
              <input
                type="date"
                id="updatedAtTo"
                value={filters.updatedAtTo}
                onChange={(e) => handleInputChange("updatedAtTo", e.target.value)}
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
