// Category Details Data - Contains all hardcoded category information for DetailedViewPage
// This file maps category data to detailed view properties

/**
 * Get detailed category information for the DetailedViewPage
 * @param {Object} category - The base category object from MockupData
 * @returns {Object} - Complete category details object
 */
export const getCategoryDetails = (category) => {
  if (!category) return null;

  return {
    breadcrumbRoot: "Categories",
    breadcrumbCurrent: "Show Category",
    breadcrumbRootPath: "/More/ViewCategories",
    title: category.name,
    subtitle: `Category ID: ${category.id}`,
    imageSrc: category.icon,
    imageAlt: category.name,
  };
};

/**
 * Get tabs configuration for category details page
 * @returns {Array} - Array of tab objects with label property
 */
export const getCategoryTabs = () => {
  return [
    { label: "About" },
  ];
};

