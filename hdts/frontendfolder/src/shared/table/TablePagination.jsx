import { useState, useEffect, useRef } from "react";
import styles from "./TablePagination.module.css";

const TablePagination = ({
  totalItems = 0,
  currentPage = 1,
  initialItemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  alwaysShow = false,
  pageSizeOptions = [5, 10, 20, 50, 100],
}) => {
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const previousItemsPerPage = useRef(initialItemsPerPage);
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Sync internal state when initialItemsPerPage changes
  useEffect(() => {
    setItemsPerPage(initialItemsPerPage);
    previousItemsPerPage.current = initialItemsPerPage;
  }, [initialItemsPerPage]);

  // Only call onItemsPerPageChange when itemsPerPage actually changes
  useEffect(() => {
    if (itemsPerPage !== previousItemsPerPage.current) {
      console.log('TablePagination: itemsPerPage actually changed from', previousItemsPerPage.current, 'to', itemsPerPage);
      onItemsPerPageChange?.(itemsPerPage);
      previousItemsPerPage.current = itemsPerPage;
    }
  }, [itemsPerPage, onItemsPerPageChange]);

  if (!alwaysShow && totalItems <= itemsPerPage) {
    return null; // hide if everything fits on one page
  }

  const handlePageClick = (page) => {
    console.log('TablePagination: handlePageClick called with page:', page, 'totalPages:', totalPages);
    if (page >= 1 && page <= totalPages) {
      onPageChange?.(page);
    }
  };

  const handleItemsPerPageChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setItemsPerPage(value);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            className={`${styles.pageButton} ${i === currentPage ? styles.active : ""}`}
            onClick={() => handlePageClick(i)}
            type="button"
          >
            {i}
          </button>
        );
      }
    } else {
      // Show first, current page area, and last for larger page counts
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <button
            key={i}
            className={`${styles.pageButton} ${i === currentPage ? styles.active : ""}`}
            onClick={() => handlePageClick(i)}
            type="button"
          >
            {i}
          </button>
        );
      }
    }

    return pages;
  };

  return (
    <div className={styles.paginationContainer}>
      {/* Left Side: Page Size Selector */}
      <div className={styles.pageSizeSelector}>
        <label htmlFor="pageSize">Show</label>
        <select
          id="pageSize"
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>items per page</span>
      </div>

      {/* Right Side: Page Navigation */}
      <div className={styles.pageNavigation}>
        <button
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          type="button"
          className={styles.navButton}
        >
          Prev
        </button>
        {renderPageNumbers()}
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          type="button"
          className={styles.navButton}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
