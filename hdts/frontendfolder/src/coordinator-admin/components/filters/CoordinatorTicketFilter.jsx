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
  // control whether to hide category and sub-category filters
  hideCategory = false,
  hideSubCategory = false,
}) {
  // Default status options (all statuses for coordinator/admin)
  const defaultStatusOptions = [
    { label: "New", category: "New" },
    { label: "Pending", category: "Active" },
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
    { label: "IT Support", category: "IT Support" },
    { label: "Asset Check In", category: "Asset Check In" },
    { label: "Asset Check Out", category: "Asset Check Out" },
    { label: "New Budget Proposal", category: "New Budget Proposal" },
    { label: "General Request", category: "General Request" },
  ];

  // Mapping of category labels to category IDs for sub-category filtering
  // This ensures sub-categories are filtered based on the category name
  const categoryMapping = {
    "IT Support": "IT Support",
    "Asset Check In": "Asset Check In",
    "Asset Check Out": "Asset Check Out",
    "New Budget Proposal": "New Budget Proposal",
    "General Request": "General Request",
  };

  // Ensure categoryOptions have proper structure for sub-category filtering
  // Map dynamic categories to include the category ID for sub-category matching
  const enhancedCategoryOptions = (categoryOptions || defaultCategoryOptions).map(cat => {
    const label = typeof cat === 'string' ? cat : cat.label;
    const categoryId = categoryMapping[label] || label;
    return {
      label,
      category: categoryId,
    };
  });

  // Default sub-category options
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
    // Asset Check In & Out sub-categories (shared - only define once)
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

  // Sub-category mapping for normalization (for dynamic options only)
  const subCategoryMapping = {
    // IT Support
    "Technical Assistance": "IT Support",
    "Software Installation/Update": "IT Support",
    "Hardware Troubleshooting": "IT Support",
    "Email/Account Access Issue": "IT Support",
    "Internet/Network Connectivity Issue": "IT Support",
    "Printer/Scanner Setup or Issue": "IT Support",
    "System Performance Issue": "IT Support",
    "Virus/Malware Check": "IT Support",
    "IT Consultation Request": "IT Support",
    "Data Backup/Restore": "IT Support",
    // Asset Check In
    "Laptop": "Asset Check In",
    "Printer": "Asset Check In",
    "Projector": "Asset Check In",
    "Mouse": "Asset Check In",
    "Keyboard": "Asset Check In",
    // Budget Proposal
    "CAPEX": "New Budget Proposal",
    "OPEX": "New Budget Proposal",
    "MERCH-SUP": "New Budget Proposal",
    "MERCH-SW": "New Budget Proposal",
  };

  // Use defaults always for sub-categories to ensure proper category mapping
  // Don't use dynamically generated ones which lack the category property
  const finalSubCategoryOptions = defaultSubCategoryOptions;
  
  // Since we're using defaultSubCategoryOptions which already have proper structure,
  // just ensure they're in the right format
  const normalizedSubCategoryOptions = finalSubCategoryOptions.filter(subCat => subCat && subCat.label);

  // Default SLA status options
  const defaultSLAStatusOptions = [
    { label: "On Time", category: "Good" },
    { label: "Due Soon", category: "Warning" },
    { label: "Overdue", category: "Critical" },
  ];

  // Build fields array dynamically - only include 'status' if showStatus is true
  // Exclude category and subCategory if hideCategory/hideSubCategory are true
  const fields = [
    ...(showStatus ? ['status'] : []),
    'priority',
    ...(hideCategory ? [] : ['category']),
    ...(hideSubCategory ? [] : ['subCategory']),
    'slaStatus',
    'startDate',
    'endDate',
  ];

  return (
    <FilterPanel
      // Use base FilterPanel with custom configuration
      hideToggleButton={hideToggleButton}
      // Explicitly list fields to render for Ticket Management (exclude 'rating')
      fields={fields}
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
      categoryOptions={enhancedCategoryOptions}
      subCategoryOptions={normalizedSubCategoryOptions}
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
