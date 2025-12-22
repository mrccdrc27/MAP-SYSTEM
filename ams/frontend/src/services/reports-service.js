import assetsAxios from "../api/assetsAxios";

/* ===============================
          ASSET REPORT
================================= */

/**
 * Fetch asset report data with optional filters
 * @param {Object} filters - Filter parameters
 * @param {number} filters.status_id - Filter by status ID
 * @param {number} filters.category_id - Filter by category ID
 * @param {number} filters.supplier_id - Filter by supplier ID
 * @param {number} filters.location_id - Filter by location ID
 * @param {string} filters.format - Response format: 'json' or 'xlsx'
 * @returns {Promise} - Report data or blob for Excel download
 */
export async function fetchAssetReport(filters = {}) {
  const params = new URLSearchParams();

  if (filters.status_id) params.append("status_id", filters.status_id);
  if (filters.category_id) params.append("category_id", filters.category_id);
  if (filters.supplier_id) params.append("supplier_id", filters.supplier_id);
  if (filters.location_id) params.append("location_id", filters.location_id);
  if (filters.product_id) params.append("product_id", filters.product_id);
  if (filters.manufacturer_id)
    params.append("manufacturer_id", filters.manufacturer_id);
  // Use 'export_format' instead of 'format' to avoid conflict with DRF's format suffix
  if (filters.export_format)
    params.append("export_format", filters.export_format);
  // Add columns parameter for selective column export
  if (filters.columns) params.append("columns", filters.columns);

  const queryString = params.toString();
  const url = `reports/assets/${queryString ? "?" + queryString : ""}`;

  // If requesting Excel format, return as blob
  // Use longer timeout (60 seconds) for report generation as it may take time
  if (filters.export_format === "xlsx" || !filters.export_format) {
    const res = await assetsAxios.get(url, {
      responseType: "blob",
      timeout: 60000,
    });
    return res.data;
  }

  // Use longer timeout for JSON report as well
  const res = await assetsAxios.get(url, { timeout: 60000 });
  return res.data;
}

/**
 * Download asset report as Excel file
 * @param {Object} filters - Filter parameters
 * @param {string} filename - Optional custom filename
 * @param {Array} columns - Optional array of column IDs to include
 */
export async function downloadAssetReportExcel(
  filters = {},
  filename = null,
  columns = []
) {
  const params = { ...filters, export_format: "xlsx" };
  if (columns && columns.length > 0) {
    params.columns = columns.join(",");
  }
  const blob = await fetchAssetReport(params);

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `asset_report_${new Date().toISOString().split("T")[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/* ===============================
      ASSET REPORT TEMPLATES
================================= */

/**
 * Fetch all report templates
 * @param {number} userId - Optional user ID to filter templates
 * @returns {Promise<Array>} - List of templates
 */
export async function fetchReportTemplates(userId = null) {
  let url = "report-templates/";
  if (userId) {
    url += `?user_id=${userId}`;
  }
  const res = await assetsAxios.get(url);
  return res.data;
}

/**
 * Fetch a single report template by ID
 * @param {number} templateId - Template ID
 * @returns {Promise<Object>} - Template data
 */
export async function fetchReportTemplateById(templateId) {
  const res = await assetsAxios.get(`report-templates/${templateId}/`);
  return res.data;
}

/**
 * Create a new report template
 * @param {Object} templateData - Template data (name, filters, columns, user_id)
 * @returns {Promise<Object>} - Created template
 */
export async function createReportTemplate(templateData) {
  const res = await assetsAxios.post("report-templates/", templateData);
  return res.data;
}

/**
 * Update an existing report template
 * @param {number} templateId - Template ID
 * @param {Object} templateData - Updated template data
 * @returns {Promise<Object>} - Updated template
 */
export async function updateReportTemplate(templateId, templateData) {
  const res = await assetsAxios.put(
    `report-templates/${templateId}/`,
    templateData
  );
  return res.data;
}

/**
 * Delete a report template (soft delete)
 * @param {number} templateId - Template ID
 * @returns {Promise<void>}
 */
export async function deleteReportTemplate(templateId) {
  await assetsAxios.delete(`report-templates/${templateId}/`);
}