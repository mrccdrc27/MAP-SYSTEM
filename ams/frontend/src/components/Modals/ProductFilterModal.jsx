import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/Modal.css";
import "../../styles/ProductFilterModal.css";

export default function ProductFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const initialFilterState = {
    category: "",
    manufacturer: "",
    depreciation: "",
    archived: "",
    inUseByAsset: "",
    createdAtFrom: "",
    createdAtTo: "",
    updatedAtFrom: "",
    updatedAtTo: "",
    connectivity: "",
    cpu: "",
    gpu: "",
    ram: "",
    operatingSystem: "",
    screenSize: "",
    storageSize: "",
  };

  const [filters, setFilters] = useState(initialFilterState);

  const yesNoOptions = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];

  const categoryOptions = [
    "Laptop",
    "Desktop",
    "Mobile Phone",
    "Tablet",
    "Accessory",
  ];

  const manufacturerOptions = [
    { value: "1", label: "Dell" },
    { value: "2", label: "Apple" },
    { value: "3", label: "Lenovo" },
    { value: "4", label: "HP" },
    { value: "5", label: "Samsung" },
    { value: "6", label: "Microsoft" },
    { value: "7", label: "Logitech" },
    { value: "8", label: "Google" },
  ];

  const depreciationOptions = [
    "Laptop Depreciation",
    "Desktop Depreciation",
    "Tablet Depreciation",
    "Mobile Depreciation",
    "Accessory Depreciation",
    "iPhone Depreciation",
  ];

  const connectivityOptions = [
    "Wi-Fi",
    "Ethernet",
    "Cellular",
    "Wi-Fi + Cellular",
  ];

  const cpuOptions = [
    "Intel Core i5",
    "Intel Core i7",
    "Intel Core i9",
    "Apple M1",
    "Apple M2",
    "Apple M3",
  ];

  const gpuOptions = [
    "Integrated",
    "NVIDIA",
    "AMD",
    "Apple GPU",
  ];

  const ramOptions = [
    "8 GB",
    "16 GB",
    "32 GB",
    "64 GB",
  ];

  const osOptions = [
    "Windows",
    "macOS",
    "iOS",
    "Android",
    "Linux",
  ];

  const screenSizeOptions = [
    "11\"",
    "13\"",
    "14\"",
    "15\"",
    "27\"",
  ];

  const storageSizeOptions = [
    "128 GB",
    "256 GB",
    "512 GB",
    "1 TB",
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

  // Reset all filters
  const handleReset = () => {
    setFilters(initialFilterState);
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
    <div className="product-modal-overlay" onClick={handleOverlayClick}>
      <div className="product-filter-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="product-modal-header">
          <h2>Filter Asset Models</h2>
          <button className="product-modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="product-filter-modal-body">
          <div className="product-filter-grid">
            {/* Category */}
            <fieldset>
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={filters.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
              >
                <option value="">Select Category</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Manufacturer */}
            <fieldset>
              <label htmlFor="manufacturer">Manufacturer</label>
              <select
                id="manufacturer"
                value={filters.manufacturer}
                onChange={(e) => handleInputChange("manufacturer", e.target.value)}
              >
                <option value="">Select Manufacturer</option>
                {manufacturerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Depreciation */}
            <fieldset>
              <label htmlFor="depreciation">Depreciation</label>
              <select
                id="depreciation"
                value={filters.depreciation}
                onChange={(e) => handleInputChange("depreciation", e.target.value)}
              >
                <option value="">Select Depreciation</option>
                {depreciationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Archived */}
            <fieldset>
              <label htmlFor="archived">Archived</label>
              <select
                id="archived"
                value={filters.archived}
                onChange={(e) => handleInputChange("archived", e.target.value)}
              >
                <option value="">Select</option>
                {yesNoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* In used by Asset */}
            <fieldset>
              <label htmlFor="inUseByAsset">In used by Asset</label>
              <select
                id="inUseByAsset"
                value={filters.inUseByAsset}
                onChange={(e) => handleInputChange("inUseByAsset", e.target.value)}
              >
                <option value="">Select</option>
                {yesNoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Created At (From) */}
            <fieldset>
              <label htmlFor="createdAtFrom">Created At (From)</label>
              <input
                type="date"
                id="createdAtFrom"
                value={filters.createdAtFrom}
                onChange={(e) => handleInputChange("createdAtFrom", e.target.value)}
              />
            </fieldset>

            {/* Created At (To) */}
            <fieldset>
              <label htmlFor="createdAtTo">Created At (To)</label>
              <input
                type="date"
                id="createdAtTo"
                value={filters.createdAtTo}
                onChange={(e) => handleInputChange("createdAtTo", e.target.value)}
              />
            </fieldset>

            {/* Updated At (From) */}
            <fieldset>
              <label htmlFor="updatedAtFrom">Updated At (From)</label>
              <input
                type="date"
                id="updatedAtFrom"
                value={filters.updatedAtFrom}
                onChange={(e) => handleInputChange("updatedAtFrom", e.target.value)}
              />
            </fieldset>

            {/* Updated At (To) */}
            <fieldset>
              <label htmlFor="updatedAtTo">Updated At (To)</label>
              <input
                type="date"
                id="updatedAtTo"
                value={filters.updatedAtTo}
                onChange={(e) => handleInputChange("updatedAtTo", e.target.value)}
              />
            </fieldset>

            {/* Connectivity */}
            <fieldset>
              <label htmlFor="connectivity">Connectivity</label>
              <select
                id="connectivity"
                value={filters.connectivity}
                onChange={(e) => handleInputChange("connectivity", e.target.value)}
              >
                <option value="">Select Connectivity</option>
                {connectivityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* CPU */}
            <fieldset>
              <label htmlFor="cpu">CPU</label>
              <select
                id="cpu"
                value={filters.cpu}
                onChange={(e) => handleInputChange("cpu", e.target.value)}
              >
                <option value="">Select CPU</option>
                {cpuOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* GPU */}
            <fieldset>
              <label htmlFor="gpu">GPU</label>
              <select
                id="gpu"
                value={filters.gpu}
                onChange={(e) => handleInputChange("gpu", e.target.value)}
              >
                <option value="">Select GPU</option>
                {gpuOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* RAM */}
            <fieldset>
              <label htmlFor="ram">RAM</label>
              <select
                id="ram"
                value={filters.ram}
                onChange={(e) => handleInputChange("ram", e.target.value)}
              >
                <option value="">Select RAM</option>
                {ramOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Operating System */}
            <fieldset>
              <label htmlFor="operatingSystem">Operating System</label>
              <select
                id="operatingSystem"
                value={filters.operatingSystem}
                onChange={(e) => handleInputChange("operatingSystem", e.target.value)}
              >
                <option value="">Select Operating System</option>
                {osOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Screen Size */}
            <fieldset>
              <label htmlFor="screenSize">Screen Size</label>
              <select
                id="screenSize"
                value={filters.screenSize}
                onChange={(e) => handleInputChange("screenSize", e.target.value)}
              >
                <option value="">Select Screen Size</option>
                {screenSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Storage Size */}
            <fieldset>
              <label htmlFor="storageSize">Storage Size</label>
              <select
                id="storageSize"
                value={filters.storageSize}
                onChange={(e) => handleInputChange("storageSize", e.target.value)}
              >
                <option value="">Select Storage Size</option>
                {storageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </fieldset>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="product-modal-footer">
          <button className="product-modal-cancel-btn" onClick={handleReset}>
            Reset Filter
          </button>
          <button className="product-modal-save-btn" onClick={handleApply}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

