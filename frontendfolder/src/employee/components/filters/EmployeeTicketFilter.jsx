import FilterPanel from "../../../shared/table/FilterPanel";
import { TICKET_CATEGORIES } from '../../../shared/constants/ticketCategories';
import ticketConfig from '../../../utilities/ticket-data/ticketConfig';
import { subCategories as MOCK_SUBCATEGORIES, budgetSubCategories as MOCK_BUDGET_SUBCATS } from '../../../mock-data/tickets';

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

  // Default category options derived from shared constants used by the submission form
  const defaultCategoryOptions = (TICKET_CATEGORIES || []).map((c) => ({ label: c, category: 'Form' }));

  // Build default sub-category options from ticketConfig and mock-data where available
  const buildDefaultSubCategories = () => {
    const out = [];
    try {
      // IT Support subcategories (ticketConfig.itSupport)
      const itOpts = ticketConfig?.itSupport?.fields?.find(f => f.name === 'subcategory')?.options || [];
      itOpts.forEach(o => out.push({ label: o, category: 'IT Support' }));

      // Asset check-in/out subcategories (product types)
      const inOpts = ticketConfig?.assetCheckIn?.fields?.find(f => f.name === 'subcategory')?.options || [];
      inOpts.forEach(o => out.push({ label: o, category: 'Asset Check In' }));
      const outOpts = ticketConfig?.assetCheckOut?.fields?.find(f => f.name === 'subcategory')?.options || [];
      outOpts.forEach(o => out.push({ label: o, category: 'Asset Check Out' }));

      // Budget proposal subcategories from mock-data
      (MOCK_SUBCATEGORIES?.budgetSubCategories || MOCK_BUDGET_SUBCATS || []).forEach(o => out.push({ label: o, category: 'New Budget Proposal' }));

      // 'Others' (General Request) subcategories from mock-data mapping
      const generalSubs = MOCK_SUBCATEGORIES?.['General Request'] || MOCK_SUBCATEGORIES?.['Others'] || [];
      (generalSubs || []).forEach(o => out.push({ label: o, category: 'Others' }));
    } catch (e) {
      // fallback: no-op
    }
    return out;
  };

  const defaultSubCategoryOptions = buildDefaultSubCategories();

  return (
    <FilterPanel
      // Use base FilterPanel with custom configuration
      hideToggleButton={hideToggleButton}
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
      categoryOptions={categoryOptions || defaultCategoryOptions}
      subCategoryOptions={subCategoryOptions || defaultSubCategoryOptions}
      
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
