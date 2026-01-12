import FilterPanel from "../../../shared/table/FilterPanel";

/**
 * EmployeeTicketFilter - Wrapper component for Employee ticket filtering
 * Used in: Active Tickets, Ticket Records pages
 * 
 * Filters (in order):
 * 1. Status
 * 2. Priority
 * 3. Category
 * 4. Sub-Category
 * 5. Start Date
 * 6. End Date
 */
export default function EmployeeTicketFilter({
  onApply,
  onReset,
  initialFilters = {},
  hideToggleButton = true,
  // Allow customization for Active Tickets vs Ticket Records
  statusOptions,
  // Can override other options if needed
  priorityOptions,
  categoryOptions,
  subCategoryOptions,
  // Control whether the Status dropdown is shown. Defaults to true.
  showStatus = true,
}) {
  // Default status options for Active Tickets
  const defaultActiveStatusOptions = [
    { label: "Pending", category: "Active" },
    { label: "In Progress", category: "Active" },
    { label: "On Hold", category: "Active" },
    { label: "Resolved", category: "Complete" },
  ];

  // Default status options for Ticket Records
  const defaultRecordStatusOptions = [
    { label: "Closed", category: "Completed" },
    { label: "Rejected", category: "Completed" },
    { label: "Withdrawn", category: "Completed" },
  ];

  // Default priority options (same for both pages)
  const defaultPriorityOptions = [
    { label: "Critical", category: "Urgent" },
    { label: "High", category: "Important" },
    { label: "Medium", category: "Normal" },
    { label: "Low", category: "Minor" },
  ];

  // Default category options - same as CoordinatorTicketFilter for consistency
  const defaultCategoryOptions = [
    { label: "IT Support", category: "IT Support" },
    { label: "Asset Check In", category: "Asset Check In" },
    { label: "Asset Check Out", category: "Asset Check Out" },
    { label: "New Budget Proposal", category: "New Budget Proposal" },
    { label: "General Request", category: "General Request" },
  ];

  // Mapping of category labels to category IDs for sub-category filtering
  const categoryMapping = {
    "IT Support": "IT Support",
    "Asset Check In": "Asset Check In",
    "Asset Check Out": "Asset Check Out",
    "New Budget Proposal": "New Budget Proposal",
    "General Request": "General Request",
  };

  // Ensure categoryOptions have proper structure for sub-category filtering
  const enhancedCategoryOptions = (categoryOptions || defaultCategoryOptions).map(cat => {
    const label = typeof cat === 'string' ? cat : cat.label;
    const categoryId = categoryMapping[label] || label;
    return {
      label,
      category: categoryId,
    };
  });

  // Default sub-category options - same as CoordinatorTicketFilter for consistency
  // Note: General Request has no sub-categories, so they are excluded
  const defaultSubCategoryOptions = [
    // IT Support sub-categories
    { label: "Technical Assistance", category: "IT Support" },
    { label: "Software Installation/Update", category: "IT Support" },
    { label: "Hardware Troubleshooting", category: "IT Support" },
    { label: "Email/Account Access Issue", category: "IT Support" },
    { label: "Internet/Network Connectivity Issue", category: "IT Support" },
    { label: "Printer/Scanner Setup or Issue", category: "IT Support" },
    { label: "System Performance Issue", category: "IT Support" },
    { label: "Virus/Malware Check", category: "IT Support" },
    { label: "IT Consultation Request", category: "IT Support" },
    { label: "Data Backup/Restore", category: "IT Support" },
    // Asset Check In & Out sub-categories
    { label: "Laptop", category: "Asset Check In" },
    { label: "Printer", category: "Asset Check In" },
    { label: "Projector", category: "Asset Check In" },
    { label: "Mouse", category: "Asset Check In" },
    { label: "Keyboard", category: "Asset Check In" },
    // New Budget Proposal sub-categories
    { label: "CAPEX", category: "New Budget Proposal" },
    { label: "OPEX", category: "New Budget Proposal" },
    { label: "MERCH-SUP", category: "New Budget Proposal" },
    { label: "MERCH-SW", category: "New Budget Proposal" },
  ];

  // Use defaults always for sub-categories to ensure proper category mapping
  const normalizedSubCategoryOptions = defaultSubCategoryOptions.filter(subCat => subCat && subCat.label);

  // Build fields array - exclude rating field for employees
  const fields = [
    ...(showStatus ? ['status'] : []),
    'priority',
    'category',
    'subCategory',
    'startDate',
    'endDate',
  ];

  return (
    <FilterPanel
      // Use base FilterPanel with custom configuration
      hideToggleButton={hideToggleButton}
      fields={fields}
      onApply={onApply}
      onReset={onReset}
      initialFilters={initialFilters}
      showStatus={showStatus}
      
      // Filter order: Status, Priority, Category, Sub-Category, Start Date, End Date
      statusLabel="Status"
      priorityLabel="Priority"
      categoryLabel="Category"
      subCategoryLabel="Sub-Category"
      
      // Options (can be overridden by props)
      statusOptions={statusOptions || defaultActiveStatusOptions}
      priorityOptions={priorityOptions || defaultPriorityOptions}
      categoryOptions={enhancedCategoryOptions}
      subCategoryOptions={subCategoryOptions || normalizedSubCategoryOptions}
      
      // Show date filters (Employee needs Start Date and End Date)
      showDateFilters={true}
      
      // Hide SLA Status (Employee doesn't see this)
      showSLAStatus={false}
    />
  );
}

// Export preset status options for convenience
export const ACTIVE_TICKET_STATUS_OPTIONS = [
  { label: "Pending", category: "Active" },
  { label: "In Progress", category: "Active" },
  { label: "On Hold", category: "Active" },
  { label: "Resolved", category: "Complete" },
];

export const TICKET_RECORD_STATUS_OPTIONS = [
  { label: "Closed", category: "Completed" },
  { label: "Rejected", category: "Completed" },
  { label: "Withdrawn", category: "Completed" },
];
