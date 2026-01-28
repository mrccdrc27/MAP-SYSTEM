import React from 'react';
import styles from './Table.module.css';

/**
 * Standardized Table component
 * @param {Array} headers - Array of table headers
 * @param {React.ReactNode} children - Table body content (rows)
 * @param {boolean} loading - Whether the table is in a loading state
 * @param {string} emptyMessage - Message to display when there's no data
 * @param {number} colSpan - Colspan for loading/empty states (should match headers length)
 */
const Table = ({ 
  headers = [], 
  children, 
  loading = false, 
  emptyMessage = 'No data found',
  className = ''
}) => {
  return (
    <div className={`${styles.tableWrapper} ${className}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={headers.length} className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading data...</p>
              </td>
            </tr>
          ) : React.Children.count(children) === 0 ? (
            <tr>
              <td colSpan={headers.length} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
