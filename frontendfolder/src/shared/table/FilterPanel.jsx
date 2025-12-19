import { useState } from "react";
import Button from "../components/Button";
import styles from "./FilterPanel.module.css";

// ===== PRESET CONFIGURATIONS FOR DIFFERENT PAGES =====
const FILTER_PRESETS = {
  // Ticket Management (Coordinator/Admin)
  // Filters: Status, Priority, Category, Sub-Category, SLA Status, Start Date, End Date
  ticketManagement: {
    statusLabel: "Status",
    priorityLabel: "Priority",
    categoryLabel: "Category",
    subCategoryLabel: "Sub-Category",
    showDateFilters: true,
    showSLAStatus: true,
    statusOptions: [
      { label: "New", category: "New" },
      { label: "Open", category: "Active" },
      { label: "In Progress", category: "Active" },
      { label: "On Hold", category: "Active" },
      { label: "Resolved", category: "Completed" },
      { label: "Closed", category: "Completed" },
      { label: "Rejected", category: "Completed" },
      { label: "Withdrawn", category: "Completed" },
    ],
    priorityOptions: [
      { label: "Critical", category: "Urgent" },
      { label: "High", category: "Important" },
      { label: "Medium", category: "Normal" },
      { label: "Low", category: "Minor" },
    ],
    categoryOptions: [
      { label: "Hardware", category: "IT" },
      { label: "Software", category: "IT" },
      { label: "Network", category: "IT" },
      { label: "Account", category: "Access" },
      { label: "Other", category: "General" },
    ],
    subCategoryOptions: [
      { label: "Desktop", category: "Hardware" },
      { label: "Laptop", category: "Hardware" },
      { label: "Printer", category: "Hardware" },
      { label: "Application", category: "Software" },
      { label: "Operating System", category: "Software" },
      { label: "WiFi", category: "Network" },
      { label: "VPN", category: "Network" },
      { label: "Password Reset", category: "Account" },
      { label: "Access Request", category: "Account" },
    ],
    slaStatusOptions: [
      { label: "On Time", category: "Good" },
      { label: "Due Soon", category: "Warning" },
      { label: "Overdue", category: "Critical" },
    ],
    assignedAgentOptions: [],
  },

  // Active Tickets (Employee)
  // Filters: Status, Priority, Category, Sub-Category, Start Date, End Date
  activeTickets: {
    statusLabel: "Status",
    priorityLabel: "Priority",
    categoryLabel: "Category",
    subCategoryLabel: "Sub-Category",
    showDateFilters: true,
    showSLAStatus: false,
    statusOptions: [
      { label: "New", category: "New" },
      { label: "Open", category: "Active" },
      { label: "In Progress", category: "Active" },
      { label: "On Hold", category: "Active" },
    ],
    priorityOptions: [
      { label: "Critical", category: "Urgent" },
      { label: "High", category: "Important" },
      { label: "Medium", category: "Normal" },
      { label: "Low", category: "Minor" },
    ],
    categoryOptions: [
      { label: "Hardware", category: "IT" },
      { label: "Software", category: "IT" },
      { label: "Network", category: "IT" },
      { label: "Account", category: "Access" },
      { label: "Other", category: "General" },
    ],
    subCategoryOptions: [
      { label: "Desktop", category: "Hardware" },
      { label: "Laptop", category: "Hardware" },
      { label: "Printer", category: "Hardware" },
      { label: "Application", category: "Software" },
      { label: "Operating System", category: "Software" },
      { label: "WiFi", category: "Network" },
      { label: "VPN", category: "Network" },
      { label: "Password Reset", category: "Account" },
      { label: "Access Request", category: "Account" },
    ],
    slaStatusOptions: [],
    assignedAgentOptions: [],
  },

  // Ticket Records (Employee)
  // Filters: Status, Priority, Category, Sub-Category, Start Date, End Date
  ticketRecords: {
    statusLabel: "Status",
    priorityLabel: "Priority",
    categoryLabel: "Category",
    subCategoryLabel: "Sub-Category",
    showDateFilters: true,
    showSLAStatus: false,
    statusOptions: [
      { label: "Resolved", category: "Completed" },
      { label: "Closed", category: "Completed" },
      { label: "Rejected", category: "Completed" },
      { label: "Withdrawn", category: "Completed" },
    ],
    priorityOptions: [
      { label: "Critical", category: "Urgent" },
      { label: "High", category: "Important" },
      { label: "Medium", category: "Normal" },
      { label: "Low", category: "Minor" },
    ],
    categoryOptions: [
      { label: "Hardware", category: "IT" },
      { label: "Software", category: "IT" },
      { label: "Network", category: "IT" },
      { label: "Account", category: "Access" },
      { label: "Other", category: "General" },
    ],
    subCategoryOptions: [
      { label: "Desktop", category: "Hardware" },
      { label: "Laptop", category: "Hardware" },
      { label: "Printer", category: "Hardware" },
      { label: "Application", category: "Software" },
      { label: "Operating System", category: "Software" },
      { label: "WiFi", category: "Network" },
      { label: "VPN", category: "Network" },
      { label: "Password Reset", category: "Account" },
      { label: "Access Request", category: "Account" },
    ],
    slaStatusOptions: [],
    assignedAgentOptions: [],
  },

  // User Management (Coordinator/Admin)
  userManagement: {
    categoryLabel: "Department",
    statusLabel: "Status",
    priorityLabel: null,
    showDateFilters: false,
    categoryOptions: [
      { label: "Human Resources", category: "Department" },
      { label: "Information Technology", category: "Department" },
      { label: "Finance", category: "Department" },
      { label: "Operations", category: "Department" },
      { label: "Marketing", category: "Department" },
    ],
    statusOptions: [
      { label: "Active", category: "Status" },
      { label: "Pending", category: "Status" },
      { label: "Rejected", category: "Status" },
      { label: "Inactive", category: "Status" },
    ],
    priorityOptions: [],
    slaStatusOptions: [],
    assignedAgentOptions: [],
  },

  // Asset Management
  assetManagement: {
    categoryLabel: "Asset Type",
    statusLabel: "Status",
    priorityLabel: null,
    showDateFilters: false,
    categoryOptions: [
      { label: "Laptop", category: "Physical" },
      { label: "Printer", category: "Physical" },
      { label: "Projector", category: "Physical" },
      { label: "Mouse", category: "Accessory" },
      { label: "Keyboard", category: "Accessory" },
    ],
    statusOptions: [
      { label: "Available", category: "Active" },
      { label: "Out of Stock", category: "Inactive" },
    ],
    priorityOptions: [],
    subCategoryOptions: [],
    slaStatusOptions: [],
    assignedAgentOptions: [],
  },
};

// Default fallback options
const defaultStatusOptions = [
  { label: "New", category: "Active" },
  { label: "Open", category: "Active" },
  { label: "In Progress", category: "Active" },
  { label: "On Hold", category: "Active" },
  { label: "Resolved", category: "Completed" },
  { label: "Closed", category: "Completed" },
  { label: "Rejected", category: "Completed" },
  { label: "Withdrawn", category: "Completed" },
];

const defaultPriorityOptions = [
  { label: "Critical", category: "Urgent" },
  { label: "High", category: "Important" },
  { label: "Medium", category: "Normal" },
  { label: "Low", category: "Minor" },
];

const defaultCategoryOptions = [
  { label: "Hardware", category: "IT" },
  { label: "Software", category: "IT" },
  { label: "Network", category: "IT" },
  { label: "Account", category: "Access" },
  { label: "Other", category: "General" },
];

const defaultSubCategoryOptions = [
  { label: "Desktop", category: "Hardware" },
  { label: "Laptop", category: "Hardware" },
  { label: "Printer", category: "Hardware" },
  { label: "Application", category: "Software" },
  { label: "Operating System", category: "Software" },
  { label: "WiFi", category: "Network" },
  { label: "VPN", category: "Network" },
  { label: "Password Reset", category: "Account" },
  { label: "Access Request", category: "Account" },
];

const defaultSLAStatusOptions = [
  { label: "On Time", category: "Good" },
  { label: "Due Soon", category: "Warning" },
  { label: "Overdue", category: "Critical" },
];

const defaultAssignedAgentOptions = [
  { label: "Unassigned", category: "None" },
];

export default function FilterPanel({
  // New prop for preset configuration
  preset = null, // Options: 'ticketManagement', 'activeTickets', 'ticketRecords', 'userManagement', 'assetManagement'
  
  // Existing props (can override preset values)
  onApply,
  onReset,
  statusOptions,
  priorityOptions,
  categoryOptions,
  subCategoryOptions,
  slaStatusOptions,
  assignedAgentOptions,
  initialFilters = {},
  hideToggleButton = false,
  statusLabel,
  priorityLabel,
  categoryLabel,
  subCategoryLabel,
  showDateFilters,
  showSLAStatus,
  categoryFirst = false,
  // Control rendering of the status dropdown (useful for pages pre-filtered by URL)
  showStatus = true,
}) {
  // Apply preset configuration if provided
  const presetConfig = preset ? FILTER_PRESETS[preset] : {};
  
  // Merge preset with props (props override preset)
  // Order: Status, Priority, Category, Sub-Category (based on your requirements)
  const finalStatusOptions = statusOptions || presetConfig.statusOptions || defaultStatusOptions;
  const finalPriorityOptions = priorityOptions !== undefined ? priorityOptions : (presetConfig.priorityOptions || defaultPriorityOptions);
  const finalCategoryOptions = categoryOptions || presetConfig.categoryOptions || defaultCategoryOptions;
  const finalSubCategoryOptions = subCategoryOptions || presetConfig.subCategoryOptions || defaultSubCategoryOptions;
  const finalSLAStatusOptions = slaStatusOptions !== undefined ? slaStatusOptions : (presetConfig.slaStatusOptions || defaultSLAStatusOptions);
  const finalAssignedAgentOptions = assignedAgentOptions !== undefined ? assignedAgentOptions : (presetConfig.assignedAgentOptions || defaultAssignedAgentOptions);
  
  const finalStatusLabel = statusLabel || presetConfig.statusLabel || "Status";
  const finalPriorityLabel = priorityLabel !== undefined ? priorityLabel : (presetConfig.priorityLabel || "Priority");
  const finalCategoryLabel = categoryLabel || presetConfig.categoryLabel || "Category";
  const finalSubCategoryLabel = subCategoryLabel || presetConfig.subCategoryLabel || "Sub-Category";
  const finalShowDateFilters = showDateFilters !== undefined ? showDateFilters : (presetConfig.showDateFilters !== undefined ? presetConfig.showDateFilters : true);
  const finalShowSLAStatus = showSLAStatus !== undefined ? showSLAStatus : (presetConfig.showSLAStatus !== undefined ? presetConfig.showSLAStatus : false);
  const finalShowStatus = showStatus !== undefined ? showStatus : true;

  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    status: initialFilters.status || null,
    priority: initialFilters.priority || null,
    category: initialFilters.category || null,
    subCategory: initialFilters.subCategory || null,
    slaStatus: initialFilters.slaStatus || null,
    assignedAgent: initialFilters.assignedAgent || null,
    startDate: initialFilters.startDate || "",
    endDate: initialFilters.endDate || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleDropdownChange = (name, option) => {
    // If category changes, clear any selected subCategory because options
    // are dependent on the selected category.
    if (name === 'category') {
      setFilters((prev) => ({ ...prev, [name]: option, subCategory: null }));
      return;
    }
    setFilters((prev) => ({ ...prev, [name]: option }));
  };

  const handleApply = () => {
    if (onApply) onApply(filters);
    setShowFilter(false); // Auto-close after applying
  };

  const handleReset = () => {
    const resetFilters = {
      status: null,
      priority: null,
      category: null,
      subCategory: null,
      slaStatus: null,
      assignedAgent: null,
      startDate: "",
      endDate: "",
    };
    setFilters(resetFilters);
    if (onReset) onReset(resetFilters);
  };

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== null && value !== ""
  ).length;

  return (
    <div className={styles.filterPanel}>
      {!hideToggleButton && (
        <div className={styles.fpShowFilter} onClick={() => setShowFilter(!showFilter)}>
          <span>{showFilter ? "Hide Filter" : "Show Filter"}</span>
        </div>
      )}
      {(hideToggleButton || showFilter) && (
        <div className={styles.filterPanelCont}>
          {/* Render order can be swapped with categoryFirst prop */}
          {categoryFirst ? (
            <>
              {/* Category Dropdown - FIRST */}
              <div className={styles.filterGroup}>
                <label htmlFor="category">{finalCategoryLabel}</label>
                <select
                  name="category"
                  className={styles.dropdown}
                  value={filters.category?.label || ""}
                  onChange={(e) => {
                    const selected = finalCategoryOptions.find(opt => opt.label === e.target.value);
                    handleDropdownChange("category", selected);
                  }}
                >
                  <option value="">Select {finalCategoryLabel.toLowerCase()}</option>
                  {finalCategoryOptions.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {finalShowStatus && (
                <>
                  {/* Status Dropdown - SECOND */}
                  <div className={styles.filterGroup}>
                    <label htmlFor="status">{finalStatusLabel}</label>
                    <select
                      name="status"
                      className={styles.dropdown}
                      value={filters.status?.label || ""}
                      onChange={(e) => {
                        const selected = finalStatusOptions.find(opt => opt.label === e.target.value);
                        handleDropdownChange("status", selected);
                      }}
                    >
                      <option value="">Select {finalStatusLabel.toLowerCase()}</option>
                      {finalStatusOptions.map((option) => (
                        <option key={option.label} value={option.label}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {finalShowStatus && (
                <div className={styles.filterGroup}>
                  <label htmlFor="status">{finalStatusLabel}</label>
                  <select
                    name="status"
                    className={styles.dropdown}
                    value={filters.status?.label || ""}
                    onChange={(e) => {
                      const selected = finalStatusOptions.find(opt => opt.label === e.target.value);
                      handleDropdownChange("status", selected);
                    }}
                  >
                    <option value="">Select {finalStatusLabel.toLowerCase()}</option>
                    {finalStatusOptions.map((option) => (
                      <option key={option.label} value={option.label}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Dropdown - SECOND */}
              <div className={styles.filterGroup}>
                <label htmlFor="category">{finalCategoryLabel}</label>
                <select
                  name="category"
                  className={styles.dropdown}
                  value={filters.category?.label || ""}
                  onChange={(e) => {
                    const selected = finalCategoryOptions.find(opt => opt.label === e.target.value);
                    handleDropdownChange("category", selected);
                  }}
                >
                  <option value="">Select {finalCategoryLabel.toLowerCase()}</option>
                  {finalCategoryOptions.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Priority Dropdown - THIRD (optional) */}
          {finalPriorityOptions && finalPriorityOptions.length > 0 && finalPriorityLabel && (
            <div className={styles.filterGroup}>
              <label htmlFor="priority">{finalPriorityLabel}</label>
              <select
                name="priority"
                className={styles.dropdown}
                value={filters.priority?.label || ""}
                onChange={(e) => {
                  const selected = finalPriorityOptions.find(opt => opt.label === e.target.value);
                  handleDropdownChange("priority", selected);
                }}
              >
                <option value="">Select {finalPriorityLabel.toLowerCase()}</option>
                {finalPriorityOptions.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sub-Category Dropdown - FOURTH */}
          {finalSubCategoryOptions && finalSubCategoryOptions.length > 0 && finalSubCategoryLabel && (
            <div className={styles.filterGroup}>
              <label htmlFor="subCategory">{finalSubCategoryLabel}</label>
              <select
                name="subCategory"
                className={styles.dropdown}
                value={filters.subCategory?.label || ""}
                onChange={(e) => {
                  // Filter the available sub-category options by selected category
                  const available = filters.category
                    ? finalSubCategoryOptions.filter(opt => opt.category === filters.category.label)
                    : finalSubCategoryOptions;
                  const selected = available.find(opt => opt.label === e.target.value);
                  handleDropdownChange("subCategory", selected);
                }}
              >
                <option value="">Select {finalSubCategoryLabel.toLowerCase()}</option>
                {(filters.category
                  ? finalSubCategoryOptions.filter(opt => opt.category === filters.category.label)
                  : finalSubCategoryOptions
                ).map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SLA Status Dropdown - FIFTH (only for Coordinator/Admin) */}
          {finalShowSLAStatus && finalSLAStatusOptions && finalSLAStatusOptions.length > 0 && (
            <div className={styles.filterGroup}>
              <label htmlFor="slaStatus">SLA Status</label>
              <select
                name="slaStatus"
                className={styles.dropdown}
                value={filters.slaStatus?.label || ""}
                onChange={(e) => {
                  const selected = finalSLAStatusOptions.find(opt => opt.label === e.target.value);
                  handleDropdownChange("slaStatus", selected);
                }}
              >
                <option value="">Select SLA status</option>
                {finalSLAStatusOptions.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start Date - SIXTH (only if enabled) */}
          {finalShowDateFilters && (
            <div className={styles.filterGroup}>
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                className={styles.dateTime}
                value={filters.startDate}
                onChange={handleChange}
              />
            </div>
          )}

          {/* End Date - SEVENTH (only if enabled) */}
          {finalShowDateFilters && (
            <div className={styles.filterGroup}>
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                className={styles.dateTime}
                value={filters.endDate}
                onChange={handleChange}
              />
            </div>
          )}

          {/* Actions */}
          <div className={styles.filterActions}>
            <Button
              variant="primary"
              size="default"
              onClick={handleApply}
            >
              Apply
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
