import React from "react";
import {
  calculateVariancePercentage,
  getVarianceColor,
  getStatusIcon,
  getTrendArrow,
  formatCurrency,
} from "../../utils/varianceReportUtils";

const ReportRow = ({ item, level }) => {
  const variancePercentage = calculateVariancePercentage(
    item.budget,
    item.actual
  );

  // Determine row style based on hierarchy level
  const isRoot = level === 0;
  const isDept = level === 1;
  const isItem = level >= 2;

  const availableColor = getVarianceColor(variancePercentage, item.available);
  const StatusIcon = getStatusIcon(variancePercentage, item.available);
  const TrendArrow = getTrendArrow(variancePercentage);

  const indentStyle = {
    paddingLeft: `${12 + level * 20}px`,
    fontWeight: isRoot ? "800" : isDept ? "600" : "400",
    backgroundColor: isRoot ? "#e6f2ff" : isDept ? "#f9fafb" : "transparent",
    borderLeft: isRoot ? "4px solid #007bff" : "none",
  };

  return (
    <tr
      className={`level-${level}-row`}
      style={isRoot ? { borderTop: "2px solid #dee2e6" } : {}}
    >
      <td style={indentStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isRoot && (
            <div
              style={{
                width: "4px",
                height: "16px",
                backgroundColor: "#007bff",
                borderRadius: "2px",
              }}
            ></div>
          )}
          <span
            style={{ fontSize: isItem ? "0.9rem" : "1rem", color: "#374151" }}
          >
            {item.category.toUpperCase()}
          </span>
          {/* Only show item count if children exist and length > 0 */}
          {!isItem && item.children && item.children.length > 0 && (
            <span style={{ fontSize: "11px", color: "#6b7280" }}>
              ({item.children.length} items)
            </span>
          )}
        </div>
      </td>
      <td>
        <div
          style={{ fontWeight: isRoot ? "700" : "400", fontSize: "0.95rem" }}
        >
          {formatCurrency(item.budget)}
        </div>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{ fontWeight: isRoot ? "700" : "400", fontSize: "0.95rem" }}
          >
            {formatCurrency(item.actual)}
          </span>
          {/* Variance Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "11px",
              color: availableColor,
            }}
          >
            {TrendArrow}
            {Math.abs(variancePercentage).toFixed(1)}%
          </div>
        </div>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {StatusIcon}
          <span
            style={{
              color: availableColor,
              fontWeight: "700",
              fontSize: "0.95rem",
            }}
          >
            {formatCurrency(item.available)}
          </span>
        </div>
      </td>
    </tr>
  );
};

export default ReportRow;