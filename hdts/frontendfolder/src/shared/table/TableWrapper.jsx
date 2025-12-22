import { FaFilter, FaPlus, FaDownload } from 'react-icons/fa';
import styles from './TableWrapper.module.css';
import MediumButtons from '../buttons/MediumButtons';

// Search input component
const SearchInput = ({ value, onChange }) => (
  <div className={styles['search-container']}>
    <input
      type="text"
      placeholder="Search..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={styles['search-input']}
    />
  </div>
);

// Filter dropdown
const FilterDropdown = ({ filters, selected, onChange }) => (
  <div className={styles['filter-container']}>
    <FaFilter className={styles['filter-icon']} />
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className={styles['filter-select']}
    >
      {filters.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  </div>
);

// Filter/Sort buttons
const FilterSortButtons = ({ onFilterClick, onSortClick, showFilter, showSort }) => (
  <div className={styles['filter-sort-buttons']}>
    {showFilter && (
      <MediumButtons
        type="Filter"
        deleteModalOpen={onFilterClick}
        className={`${styles.btn} ${styles['btn-secondary']}`}
      />
    )}
    {showSort && (
      <MediumButtons
        type="Sort"
        deleteModalOpen={onSortClick}
        className={`${styles.btn} ${styles['btn-secondary']}`}
      />
    )}
  </div>
);

// Action buttons
const ActionButtons = ({ onExport, onNew }) => (
  <div className={styles['table-actions']}>
    {onExport && (
      <button onClick={onExport} className={`${styles.btn} ${styles['btn-secondary']}`}>
        <FaDownload className={styles['btn-icon']} />
        Export
      </button>
    )}
    {onNew && (
      <button onClick={onNew} className={`${styles.btn} ${styles['btn-primary']}`}>
        <FaPlus className={styles['btn-icon']} />
        New
      </button>
    )}
  </div>
);

// Main wrapper component
const TableWrapper = ({
  title = 'Table',
  children,
  onNew,
  onExport,
  searchTerm = '',
  onSearchChange,
  filters = [],
  selectedFilter,
  onFilterChange,
  showSearch = true,
  showFilters = true,
  showActions = true,
  showSortButton = true,
  showFilterButton = true,
  onSortClick,
  onFilterClick,
  className = '',
}) => {
  const hasFilters = showFilters && filters.length > 0;

  return (
    <div className={`${styles['table-wrapper']} ${className}`}>
      <div className={styles.container}>
        <div className={styles['table-card']}>

          {/* === Header === */}
          <div className={styles['table-header']}>
            <div className={styles['table-header-top']}>
              <h1 className={styles['table-title']}>{title}</h1>

              <div className={styles['controls-right']}>
                {showSearch && (
                  <SearchInput value={searchTerm} onChange={onSearchChange} />
                )}

                {hasFilters && (
                  <FilterDropdown
                    filters={filters}
                    selected={selectedFilter}
                    onChange={onFilterChange}
                  />
                )}

                <FilterSortButtons
                  onFilterClick={onFilterClick}
                  onSortClick={onSortClick}
                  showFilter={showFilterButton}
                  showSort={showSortButton}
                />

                {showActions && <ActionButtons onExport={onExport} onNew={onNew} />}
              </div>
            </div>
          </div>

          {/* === Content === */}
          <div className={styles['table-content']}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default TableWrapper;
