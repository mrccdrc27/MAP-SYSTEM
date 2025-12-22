import FilterPanel from "../../../shared/table/FilterPanel";

export default function SysAdminArticlesFilter({
  onApply,
  onReset,
  initialFilters = {},
  hideToggleButton = true,
  categoryOptions,
  visibilityOptions,
}) {
  const defaultVisibilityOptions = [
    { label: "Employee" },
    { label: "Ticket Coordinator" },
    { label: "System Admin" },
  ];

  return (
    <FilterPanel
      hideToggleButton={hideToggleButton}
      onApply={onApply}
      onReset={onReset}
      initialFilters={initialFilters}
      categoryLabel="Category"
      statusLabel="Visibility"
      categoryOptions={categoryOptions || []}
      statusOptions={visibilityOptions || defaultVisibilityOptions}
      showDateFilters={true}
      showStatus={true}
      categoryFirst={true}
      priorityOptions={[]}
      subCategoryOptions={[]}
    />
  );
}

// Export visibility options for convenience
export const ARTICLES_VISIBILITY_OPTIONS = [
  { label: "Employee" },
  { label: "Ticket Coordinator" },
  { label: "System Admin" },
];
