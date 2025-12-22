import { FaSort } from 'react-icons/fa';
import TablePagination from './TablePagination';
import styles from './TableContent.module.css';

/* === Sortable Header === */
const SortableHeader = ({ field, children, sortField, sortDirection, onSort }) => {
  const isActive = sortField === field;
  const ariaSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <th
      className={`${styles['sortable-header']} ${isActive ? styles.active : ''}`}
      onClick={() => onSort(field)}
      aria-sort={ariaSort}
      scope="col"
    >
      <div className={styles['sortable-header-content']}>
        <span>{children}</span>
        <FaSort className={`${styles['sort-icon']} ${isActive ? styles.active : ''}`} />
        {isActive && (
          <span className={styles['sort-direction']}>
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
};

/* === Status Badge === */
const StatusBadge = ({ status, colorMap = {} }) => {
  const defaultColors = {
    upgrade: styles['badge-blue'],
    repair: styles['badge-red'],
    maintenance: styles['badge-green'],
    active: styles['badge-green'],
    inactive: styles['badge-gray'],
    pending: styles['badge-yellow'],
    default: styles['badge-gray'],
  };

  const colorClass = { ...defaultColors, ...colorMap }[status?.toLowerCase()] || defaultColors.default;

  return (
    <span className={`${styles['status-badge']} ${colorClass}`} aria-label={`Status: ${status}`}>
      {status}
    </span>
  );
};

/* === Action Button === */
const ActionButton = ({ icon: Icon, onClick, variant = 'default', tooltip, disabled }) => {
  const variantClass = styles[`action-btn-${variant}`] || styles['action-btn-default'];

  return (
    <button
      onClick={onClick}
      className={`${styles['action-btn']} ${variantClass} ${disabled ? styles.disabled : ''}`}
      title={tooltip}
      disabled={disabled}
      aria-label={tooltip}
    >
      <Icon className={styles['action-icon']} aria-hidden="true" />
    </button>
  );
};

/* === TableContent === */
const TableContent = ({
  columns = [],
  data = [],
  totalItems = 0,
  onRowSelect,
  selectedRows = [],
  onSelectAll,
  sortField,
  sortDirection = 'asc',
  onSort,
  actions = [],
  showSelection = true,
  showFooter = true,
  currentPage = 1,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPage = 10,
  emptyMessage = 'No data available',
  loading = false,
  className = '',
  rowKey = 'id',
  tableTitle = '',
}) => {
  const totalItemsCount = totalItems >= 0 ? totalItems : data.length;
  const isAllSelected = selectedRows.length === data.length && data.length > 0;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < data.length;

  const handleSelectAll = (e) => onSelectAll?.(e.target.checked);
  const handleRowSelect = (id) => onRowSelect?.(id);

  if (loading) {
    return (
      <div className={styles['table-loading']} aria-busy="true">
        <div className={styles['loading-spinner']} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`${styles['data-table-container']} ${className}`}>
      {tableTitle && (
        <div className={styles['table-heading']}>
          <h2 className={styles['table-title']}>{tableTitle}</h2>
        </div>
      )}

      <div className={styles['table-wrapper-inner']}>
        <table className={styles['data-table']} aria-live="polite">
          <thead className={styles['table-header']}>
            <tr>
              {showSelection && (
                <th className={styles['selection-header']}>
                  <input
                    type="checkbox"
                    className={styles['table-checkbox']}
                    onChange={handleSelectAll}
                    checked={isAllSelected}
                    ref={(el) => el && (el.indeterminate = isIndeterminate)}
                    aria-label="Select all rows"
                  />
                </th>
              )}

              {columns.map((col) =>
                col.sortable ? (
                  <SortableHeader
                    key={col.key}
                    field={col.key}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={onSort}
                  >
                    {col.label}
                  </SortableHeader>
                ) : (
                  <th key={col.key} className={styles['table-header-cell']} scope="col">
                    {col.label}
                  </th>
                )
              )}

              {actions.length > 0 && (
                <th className={`${styles['table-header-cell']} ${styles['actions-header']}`} scope="col">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className={styles['table-body']}>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showSelection ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className={styles['empty-state']}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const rowId = row[rowKey] ?? index;
                const isSelected = selectedRows.includes(rowId);

                return (
                  <tr
                    key={rowId}
                    className={`${styles['table-row']} ${isSelected ? styles['selected-row'] : ''}`}
                    aria-selected={isSelected}
                  >
                    {showSelection && (
                      <td className={styles['selection-cell']}>
                        <input
                          type="checkbox"
                          className={styles['table-checkbox']}
                          checked={isSelected}
                          onChange={() => handleRowSelect(rowId)}
                          aria-label={`Select row ${index + 1}`}
                        />
                      </td>
                    )}

                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`${styles['table-cell']} ${col.cellClassName || ''}`}
                        data-label={col.label}
                      >
                        {col.render
                          ? col.render(row[col.key], row, index)
                          : <span className={col.className || styles['cell-content']}>{row[col.key] ?? '-'}</span>}
                      </td>
                    ))}

                    {actions.length > 0 && (
                      <td className={`${styles['table-cell']} ${styles['actions-cell']}`}>
                        <div className={styles['actions-container']}>
                          {actions.map((action, i) => (
                            <ActionButton
                              key={i}
                              icon={action.icon}
                              onClick={() => action.onClick(row, index)}
                              variant={action.variant}
                              tooltip={action.tooltip}
                              disabled={action.disabled?.(row)}
                            />
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showFooter && (
        <TablePagination
          totalItems={totalItemsCount}
          currentPage={currentPage}
          initialItemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          alwaysShow
        />
      )}
    </div>
  );
};

export default TableContent;
export { StatusBadge, ActionButton };
