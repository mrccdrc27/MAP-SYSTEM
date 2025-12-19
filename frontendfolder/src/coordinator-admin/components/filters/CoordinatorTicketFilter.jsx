import FilterPanel from "../../../shared/table/FilterPanel";

export default function CoordinatorTicketFilter({
  onApply,
  onReset,
  initialFilters = {},
  hideToggleButton = true,
  // Allow customization if needed
  statusOptions,
  priorityOptions,
  categoryOptions,
  subCategoryOptions,
  slaStatusOptions,
  // control whether FilterPanel shows the status dropdown
  showStatus = true,
}) {
  // Default status options (all statuses for coordinator/admin)
  const defaultStatusOptions = [
    { label: "New", category: "New" },
    { label: "Open", category: "Active" },
    { label: "In Progress", category: "Active" },
    { label: "On Hold", category: "Active" },
    { label: "Resolved", category: "Completed" },
    { label: "Closed", category: "Completed" },
    { label: "Rejected", category: "Completed" },
    { label: "Withdrawn", category: "Completed" },
  ];

  // Default priority options
  const defaultPriorityOptions = [
    { label: "Critical", category: "Urgent" },
    { label: "High", category: "Important" },
    { label: "Medium", category: "Normal" },
    { label: "Low", category: "Minor" },
  ];

  // Default category options
  const defaultCategoryOptions = [
    { label: "Hardware", category: "IT" },
    { label: "Software", category: "IT" },
    { label: "Network", category: "IT" },
    { label: "Account", category: "Access" },
    { label: "Other", category: "General" },
  ];

  // Default sub-category options
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

  // Default SLA status options
  const defaultSLAStatusOptions = [
    { label: "On Time", category: "Good" },
    { label: "Due Soon", category: "Warning" },
    { label: "Overdue", category: "Critical" },
  ];

  return (
    <FilterPanel
      // Use base FilterPanel with custom configuration
      hideToggleButton={hideToggleButton}
      showStatus={showStatus}
      onApply={onApply}
      onReset={onReset}
      initialFilters={initialFilters}
      
      // Filter order: Status, Priority, Category, Sub-Category, SLA Status, Start Date, End Date
      statusLabel="Status"
      priorityLabel="Priority"
      categoryLabel="Category"
      subCategoryLabel="Sub-Category"
      
      // Options (can be overridden by props)
      statusOptions={statusOptions || defaultStatusOptions}
      priorityOptions={priorityOptions || defaultPriorityOptions}
      categoryOptions={categoryOptions || defaultCategoryOptions}
      subCategoryOptions={subCategoryOptions || defaultSubCategoryOptions}
      slaStatusOptions={slaStatusOptions || defaultSLAStatusOptions}
      
      // Show date filters
      showDateFilters={true}
      
      // Show SLA Status (Coordinator/Admin needs this)
      showSLAStatus={true}
    />
  );
}

// Export status options for convenience
export const COORDINATOR_TICKET_STATUS_OPTIONS = [
  { label: "New", category: "New" },
  { label: "Open", category: "Active" },
  { label: "In Progress", category: "Active" },
  { label: "On Hold", category: "Active" },
  { label: "Resolved", category: "Completed" },
  { label: "Closed", category: "Completed" },
  { label: "Rejected", category: "Completed" },
  { label: "Withdrawn", category: "Completed" },
];
