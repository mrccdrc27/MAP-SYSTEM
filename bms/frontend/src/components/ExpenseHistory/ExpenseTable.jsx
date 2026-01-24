import React from "react";
import "./ExpenseTable.css";

const ExpenseTable = ({ expenses, loading, onView }) => {
  const formatAmount = (amount) => {
    return `₱${parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="table-container">
      <table className="ledger-table">
        <thead>
          <tr>
            <th style={{ width: "12%" }}>DATE</th>
            <th style={{ width: "25%" }}>DESCRIPTION</th>
            <th style={{ width: "18%" }}>DEPARTMENT</th>
            <th style={{ width: "10%" }}>CATEGORY</th>
            <th style={{ width: "15%" }}>SUB-CATEGORY</th>
            <th style={{ width: "12%", textAlign: "right" }}>AMOUNT</th>
            <th style={{ width: "10%", textAlign: "center" }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" className="table-message">
                Loading...
              </td>
            </tr>
          ) : expenses.length > 0 ? (
            expenses.map((expense, index) => (
              <tr
                key={expense.id}
                className={index % 2 === 1 ? "alternate-row" : ""}
              >
                <td>{expense.date}</td>
                <td>{expense.description}</td>
                <td>{expense.department_name || "N/A"}</td>
                <td>{expense.category_name || "N/A"}</td>
                <td>{expense.sub_category_name || "N/A"}</td>
                <td style={{ textAlign: "right" }}>
                  {formatAmount(expense.amount)}
                </td>
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() => onView(expense)}
                    className="view-btn"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="table-message">
                No expenses found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ExpenseTable;