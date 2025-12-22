// Depreciation Details Data - Contains all hardcoded depreciation information for DetailedViewPage
// This file maps depreciation data to detailed view properties

/**
 * Get detailed depreciation information for the DetailedViewPage
 * @param {Object} depreciation - The base depreciation object from MockupData
 * @returns {Object} - Complete depreciation details object
 */
export const getDepreciationDetails = (depreciation) => {
  if (!depreciation) return null;

  return {
    breadcrumbRoot: "Depreciations",
    breadcrumbCurrent: "Show Depreciation",
    breadcrumbRootPath: "/More/Depreciations",
    title: depreciation.name,
    subtitle: `Depreciation ID: ${depreciation.id}`,
  };
};

/**
 * Get tabs configuration for depreciation details page
 * @returns {Array} - Array of tab objects with label property
 */
export const getDepreciationTabs = () => {
  return [
    { label: "About" },
  ];
};

