import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/Modal.css";
import "../../styles/AssetFilterModal.css";

export default function RepairFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const [filters, setFilters] = useState({
    asset: "",
    type: null,
    name: "",
    startDate: "",
    endDate: "",
    cost: "",
    status: null,
  });

  // Type options
  const typeOptions = [
    { value: "hardware", label: "Hardware" },
    { value: "software", label: "Software" },
    { value: "preventive maintenance", label: "Preventive Maintenance" },
    { value: "corrective maintenance", label: "Corrective Maintenance" },
    { value: "emergency repair", label: "Emergency Repair" },
  ];

  // Status options
  const statusOptions = [
    { value: "deployed", label: "Deployed" },
    { value: "pending", label: "Pending Approval" },
    { value: "undeployable", label: "In Progress" },
    { value: "archived", label: "Archived" },
    { value: "completed", label: "Completed" },
  ];

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
      asset: "",
      type: null,
      name: "",
      startDate: "",
      endDate: "",
      cost: "",
      status: null,
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
          <h2>Filter Repairs</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body asset-filter-modal-body">
          <div className="filter-grid">
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

            {/* Type */}
            <fieldset>
              <label htmlFor="type">Type</label>
              <select
                id="type"
                value={filters.type?.value || ""}
                onChange={(e) => {
                  const selectedOption = typeOptions.find(opt => opt.value === e.target.value);
                  handleSelectChange("type", selectedOption || null);
                }}
              >
                <option value="">Select Type</option>
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Name */}
            <fieldset>
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                placeholder="Enter Repair Name"
                value={filters.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </fieldset>

            {/* Start Date */}
            <fieldset>
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                value={filters.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
              />
            </fieldset>

            {/* End Date */}
            <fieldset>
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                value={filters.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
              />
            </fieldset>

            {/* Cost */}
            <fieldset className="asset-filter-cost-field">
              <label htmlFor="cost">Cost</label>
              <div className="asset-filter-cost-input-group">
                <span className="asset-filter-cost-addon">PHP</span>
                <input
                  type="number"
                  id="cost"
                  placeholder="0.00"
                  value={filters.cost}
                  onChange={(e) => handleInputChange("cost", e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </fieldset>

            {/* Status */}
            <fieldset>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={filters.status?.value || ""}
                onChange={(e) => {
                  const selectedOption = statusOptions.find(opt => opt.value === e.target.value);
                  handleSelectChange("status", selectedOption || null);
                }}
              >
                <option value="">Select Status</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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

