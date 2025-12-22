import React from 'react';
import PropTypes from 'prop-types';
import '../styles/Table.css';
import '../styles/custom-colors.css';

const Table = ({
  columns,
  data,
  onRowSelect,
  selectedRows = [],
  showCheckbox = true,
  className = '',
  emptyMessage = 'No data found.',
  isLoading = false
}) => {
  const handleSelectAll = (e) => {
    if (onRowSelect) {
      if (e.target.checked) {
        const allIds = data.map((_, index) => index);
        onRowSelect(allIds);
      } else {
        onRowSelect([]);
      }
    }
  };

  const handleRowSelect = (index) => {
    if (onRowSelect) {
      const newSelection = selectedRows.includes(index)
        ? selectedRows.filter(id => id !== index)
        : [...selectedRows, index];
      onRowSelect(newSelection);
    }
  };

  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < data.length;

  if (isLoading) {
    return (
      <div className="table-loading">
        <p>Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="table-empty">
        <p className="table-message">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`table-container ${className}`}>
      <table className={`data-table ${className}`}>
        <thead>
          <tr>
            {showCheckbox && (
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={input => {
                    if (input) input.indeterminate = isIndeterminate;
                  }}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.accessor}
                className={column.className || ''}
                style={column.width ? { width: column.width } : {}}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.id || index}>
              {showCheckbox && (
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(index)}
                    onChange={() => handleRowSelect(index)}
                  />
                </td>
              )}
              {columns.map((column) => (
                <td
                  key={column.accessor}
                  className={column.cellClassName || ''}
                >
                  {column.render
                    ? column.render(row, index)
                    : row[column.accessor]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

Table.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      header: PropTypes.string.isRequired,
      accessor: PropTypes.string.isRequired,
      render: PropTypes.func,
      className: PropTypes.string,
      cellClassName: PropTypes.string,
      width: PropTypes.string,
    })
  ).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  onRowSelect: PropTypes.func,
  selectedRows: PropTypes.arrayOf(PropTypes.number),
  showCheckbox: PropTypes.bool,
  className: PropTypes.string,
  emptyMessage: PropTypes.string,
  isLoading: PropTypes.bool,
};

export default Table;