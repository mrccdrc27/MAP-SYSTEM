import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * Exports JSON data as an .xlsx file
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Desired name of the exported file
 * @param {Object} [options] - Optional settings
 * @param {Boolean} [options.prettyHeaders=true] - Format headers from keys (e.g., "contactName" → "Contact Name")
 */
export const exportToExcel = (data, fileName = "export.xlsx", options = {}) => {
  const { prettyHeaders = true } = options;

  if (!Array.isArray(data) || data.length === 0) {
    console.warn("⚠️ No data available to export.");
    return;
  }

  let exportData = data;

  if (prettyHeaders) {
    exportData = data.map((obj) => {
      const formatted = {};
      Object.keys(obj).forEach((key) => {
        const header = key
          .replace(/([A-Z])/g, " $1") // split camelCase
          .replace(/^./, (str) => str.toUpperCase()) // capitalize
          .trim();
        formatted[header] = obj[key];
      });
      return formatted;
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, fileName);
};
