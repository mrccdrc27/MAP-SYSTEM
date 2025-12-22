// style
import styles from "./pagination.module.css";

const Pagination = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50, 100],
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const renderPageNumbers1 = () => {
    const pages = [];

    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          className={`${styles.pageButton} ${
            i === currentPage ? styles.active : ""
          }`}
          onClick={() => handlePageClick(i)}
        >
          {i}
        </button>
      );
    }

    return pages;
  };

  const renderPageNumbers = () => {
    const pages = [];
    const delta = 2; // how many pages to show before/after current page
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    // Always show first page
    pages.push(
      <button
        key={1}
        className={`${styles.pageButton} ${
          currentPage === 1 ? styles.active : ""
        }`}
        onClick={() => handlePageClick(1)}
      >
        1
      </button>
    );

    // Left ellipsis
    if (left > 2) {
      pages.push(
        <span key="left-ellipsis" className={styles.ellipsis}>
          ...
        </span>
      );
    }

    // Middle pages
    for (let i = left; i <= right; i++) {
      pages.push(
        <button
          key={i}
          className={`${styles.pageButton} ${
            currentPage === i ? styles.active : ""
          }`}
          onClick={() => handlePageClick(i)}
        >
          {i}
        </button>
      );
    }

    // Right ellipsis
    if (right < totalPages - 1) {
      pages.push(
        <span key="right-ellipsis" className={styles.ellipsis}>
          ...
        </span>
      );
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(
        <button
          key={totalPages}
          className={`${styles.pageButton} ${
            currentPage === totalPages ? styles.active : ""
          }`}
          onClick={() => handlePageClick(totalPages)}
        >
          {totalPages}
        </button>
      );
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
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
        >
          Prev
        </button>
        {renderPageNumbers()}
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
