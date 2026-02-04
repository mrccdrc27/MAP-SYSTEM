import React from "react";
import { ChevronDown } from "lucide-react";
import Pagination from "../common/Pagination";

const BudgetAdjustmentTab = ({
  adjustments,
  loading,
  pagination,
  searchTerm,
  setSearchTerm,
  selectedDepartment,
  departmentOptions,
  handleDepartmentSelect,
  selectedCategory,
  categoryOptions,
  handleCategorySelect,
  selectedAction,
  showActionDropdown,
  toggleActionDropdown,
  handleActionSelect,
  selectedRowId,
  handleRowSelect,
  isFinanceManager,
  currentPage,
  pageSize,
  setCurrentPage,
  setPageSize,
  showDepartmentDropdown,
  toggleDepartmentDropdown,
  showCategoryDropdown,
  toggleCategoryDropdown,
  getDepartmentDisplay,
  getCategoryDisplay,
  getActionDisplay,
  formatTableAmount,
  getCompactDepartmentName,
}) => {
  return (
    <>
      <div
        className="top"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2
          className="page-title"
          style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}
        >
          Budget Adjustment
        </h2>
        <div
          className="controls-container"
          style={{ display: "flex", gap: "10px" }}
        >
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "13px",
              width: "180px",
              background: "white",
            }}
          />

          {/* Department Filter */}
          <div className="filter-dropdown" style={{ position: "relative" }}>
            <button
              onClick={toggleDepartmentDropdown}
              style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                minWidth: "160px",
                maxWidth: "200px",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  flex: 1,
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: "13px",
                }}
              >
                {getDepartmentDisplay()}
              </span>
              <ChevronDown size={14} />
            </button>
            {showDepartmentDropdown && (
              <div
                className="dropdown-menu"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  width: "100%",
                  zIndex: 10,
                  maxHeight: "none",
                  overflowY: "visible",
                }}
              >
                {departmentOptions.map((dept) => (
                  <div
                    key={dept.value}
                    onClick={() => handleDepartmentSelect(dept.value)}
                    className="dropdown-item"
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "13px",
                      whiteSpace: "normal",
                    }}
                  >
                    {dept.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="filter-dropdown" style={{ position: "relative" }}>
            <button
              onClick={toggleCategoryDropdown}
              style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                minWidth: "140px",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "13px" }}>{getCategoryDisplay()}</span>
              <ChevronDown size={14} />
            </button>
            {showCategoryDropdown && (
              <div
                className="dropdown-menu"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  width: "100%",
                  zIndex: 1000,
                }}
              >
                {categoryOptions.map((cat) => (
                  <div
                    key={cat.value}
                    onClick={() => handleCategorySelect(cat.value)}
                    className="dropdown-item"
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    {cat.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Button (Finance Only) */}
          {isFinanceManager && (
            <div className="filter-dropdown" style={{ position: "relative" }}>
              <button
                onClick={toggleActionDropdown}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#007bff",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  minWidth: "140px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                <span>{getActionDisplay()}</span>
                <ChevronDown size={14} />
              </button>
              {showActionDropdown && (
                <div
                  className="dropdown-menu"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    backgroundColor: "white",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "100%",
                    zIndex: 1000,
                  }}
                >
                  <div
                    onClick={() => handleActionSelect("modify")}
                    className="dropdown-item"
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Modify Budget
                  </div>
                  <div
                    onClick={() => handleActionSelect("add")}
                    className="dropdown-item"
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Add Budget
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          height: "1px",
          backgroundColor: "#e0e0e0",
          marginBottom: "20px",
        }}
      ></div>

      <div
        style={{
          flex: "1 1 auto",
          overflowY: "auto",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
        }}
      >
        <table
          className="ledger-table"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 1,
              backgroundColor: "#f8f9fa",
            }}
          >
            <tr>
              {[
                "TICKET ID",
                "DATE",
                "DEPARTMENT",
                "CATEGORY",
                "FUNDING SOURCE",
                "TARGET",
                "AMOUNT",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    borderBottom: "2px solid #dee2e6",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ padding: "20px", textAlign: "center" }}
                >
                  Loading...
                </td>
              </tr>
            ) : adjustments.length > 0 ? (
              adjustments.map((entry, index) => (
                <tr
                  key={entry.id}
                  // MODIFICATION: Pass the whole entry object, but ensure parent uses entry.id
                  onClick={() => handleRowSelect(entry)}
                  style={{
                    backgroundColor:
                      selectedRowId === entry.id
                        ? "#e3f2fd"
                        : index % 2
                          ? "#F8F8F8"
                          : "white",
                    cursor: "pointer",
                    borderBottom: "1px solid #dee2e6",
                  }}
                >
                  <td style={{ padding: "12px" }}>{entry.ticket_id}</td>
                  <td style={{ padding: "12px" }}>{entry.date}</td>
                  <td style={{ padding: "12px" }}>
                    {getCompactDepartmentName(entry.department_name)}
                  </td>
                  <td style={{ padding: "12px" }}>{entry.category}</td>

                  {/* FIX START: Swap Debit/Credit to match Funding Source/Target Headers */}
                  {/* Funding Source (Column 5) = Credit Account */}
                  <td style={{ padding: "12px" }}>{entry.credit_account}</td>

                  {/* Target (Column 6) = Debit Account */}
                  <td style={{ padding: "12px" }}>{entry.debit_account}</td>
                  {/* FIX END */}

                  <td style={{ padding: "12px" }}>
                    {formatTableAmount(entry.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  style={{ padding: "20px", textAlign: "center" }}
                >
                  No entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.count > 0 && !loading && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={pagination.count}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setCurrentPage(1);
          }}
        />
      )}
    </>
  );
};

export default BudgetAdjustmentTab;
