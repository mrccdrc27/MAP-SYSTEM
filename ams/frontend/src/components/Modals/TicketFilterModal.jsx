import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/Modal.css";
import "../../styles/AssetFilterModal.css";

export default function TicketFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const [filters, setFilters] = useState({
    ticketNumber: "",
    asset: "",
    requestor: "",
    subject: "",
    location: "",
    checkInOut: null,
  });

  // Check-In / Check-Out options
  const checkInOutOptions = [
    { value: "Check-In", label: "Check-In" },
    { value: "Check-Out", label: "Check-Out" },
    { value: "All", label: "All" },
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
      ticketNumber: "",
      asset: "",
      requestor: "",
      subject: "",
      location: "",
      checkInOut: null,
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
          <h2>Filter Tickets</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body asset-filter-modal-body">
          <div className="filter-grid">
            {/* Ticket Number */}
            <fieldset>
              <label htmlFor="ticketNumber">Ticket Number</label>
              <input
                type="text"
                id="ticketNumber"
                placeholder="Enter Ticket Number"
                value={filters.ticketNumber}
                onChange={(e) => handleInputChange("ticketNumber", e.target.value)}
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

            {/* Requestor */}
            <fieldset>
              <label htmlFor="requestor">Requestor</label>
              <input
                type="text"
                id="requestor"
                placeholder="Enter Requestor Name"
                value={filters.requestor}
                onChange={(e) => handleInputChange("requestor", e.target.value)}
              />
            </fieldset>

            {/* Subject */}
            <fieldset>
              <label htmlFor="subject">Subject</label>
              <input
                type="text"
                id="subject"
                placeholder="Enter Subject"
                value={filters.subject}
                onChange={(e) => handleInputChange("subject", e.target.value)}
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

            {/* Check-In / Check-Out */}
            <fieldset>
              <label htmlFor="checkInOut">Check-In / Check-Out</label>
              <select
                id="checkInOut"
                value={filters.checkInOut?.value || ""}
                onChange={(e) => {
                  const selectedOption = checkInOutOptions.find(opt => opt.value === e.target.value);
                  handleSelectChange("checkInOut", selectedOption || null);
                }}
              >
                <option value="">Select Option</option>
                {checkInOutOptions.map((option) => (
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

