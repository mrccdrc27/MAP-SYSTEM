// src/components/ticket/Pagination.jsx
import React from 'react';
import styles from './ticketComments.module.css';

const Pagination = ({ pagination, onPageChange, loading }) => {
  if (pagination.total_pages <= 1) return null;

  const pages = [];
  const maxPages = 5;
  let startPage = Math.max(1, pagination.current_page - Math.floor(maxPages / 2));
  let endPage = Math.min(pagination.total_pages, startPage + maxPages - 1);

  if (endPage - startPage + 1 < maxPages) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className={styles.pagination}>
      <button
        onClick={() => onPageChange(pagination.current_page - 1)}
        disabled={!pagination.previous || loading}
        className={styles.paginationButton}
      >
        <i className="fas fa-chevron-left"></i> Previous
      </button>

      <div className={styles.pageNumbers}>
        {startPage > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className={styles.pageButton}>1</button>
            {startPage > 2 && <span className={styles.ellipsis}>...</span>}
          </>
        )}

        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`${styles.pageButton} ${page === pagination.current_page ? styles.activePage : ''}`}
            disabled={loading}
          >
            {page}
          </button>
        ))}

        {endPage < pagination.total_pages && (
          <>
            {endPage < pagination.total_pages - 1 && <span className={styles.ellipsis}>...</span>}
            <button onClick={() => onPageChange(pagination.total_pages)} className={styles.pageButton}>
              {pagination.total_pages}
            </button>
          </>
        )}
      </div>

      <button
        onClick={() => onPageChange(pagination.current_page + 1)}
        disabled={!pagination.next || loading}
        className={styles.paginationButton}
      >
        Next <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
};

export default Pagination;