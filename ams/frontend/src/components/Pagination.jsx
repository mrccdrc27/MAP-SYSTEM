// style
import "../styles/Pagination.css";
import { useRef } from "react";

const Pagination = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50, 100],
  siblingCount = 1,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const containerRef = useRef(null);

  const getScrollParent = (element) => {
    if (!element) return window;
    let parent = element.parentElement;
    const overflowRegex = /(auto|scroll)/;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflow = style.overflow + style.overflowY + style.overflowX;
      if (overflowRegex.test(overflow) && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return window;
  };

  const scrollToTop = () => {
    const target = getScrollParent(containerRef.current);
    try {
      if (target === window) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (typeof target.scrollTo === "function") {
        target.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        target.scrollTop = 0;
      }
    } catch (e) {
      try { target.scrollTop = 0; } catch (err) {}
    }
  };

  const handlePageClick = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    if (p !== currentPage) onPageChange(p);
    scrollToTop();
  };

  const handlePageSizeChange = (newSize) => {
    const size = Number(newSize) || pageSize;
    const newTotalPages = Math.max(1, Math.ceil(totalItems / size));
    onPageSizeChange(size);
    if (currentPage > newTotalPages) {
      onPageChange(newTotalPages);
    }
    scrollToTop();
  };

  const DOTS = "...";

  const getPaginationRange = () => {
    const totalPageNumbers = siblingCount * 2 + 5; // first, last, current, two DOTS

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 2);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages - 1);

    const showLeftDots = leftSiblingIndex > 2;
    const showRightDots = rightSiblingIndex < totalPages - 1;

    const pages = [];

    pages.push(1);

    if (showLeftDots) pages.push(DOTS);

    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      pages.push(i);
    }

    if (showRightDots) pages.push(DOTS);

    pages.push(totalPages);

    return pages;
  };

  const renderPageNumbers = () => {
    const range = getPaginationRange();

    return range.map((item, idx) => {
      if (item === DOTS) {
        return (
          <span key={`dots-${idx}`} className="pageDots">
            {DOTS}
          </span>
        );
      }

      return (
        <button
          key={item}
          className={`pageButton ${item === currentPage ? "active" : ""}`}
          onClick={() => handlePageClick(item)}
        >
          {item}
        </button>
      );
    });
  };

  return (
    <div className="paginationContainer" ref={containerRef}>
      {/* Left Side: Page Size Selector */}
      <div className="pageSizeSelector">
        <label htmlFor="pageSize">Show</label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
      <div className="pageNavigation">
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
