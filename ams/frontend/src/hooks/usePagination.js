import { useState, useMemo } from 'react';

const usePagination = (data, initialItemsPerPage = 20) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  // Reset to page 1 when data changes
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  return {
    currentPage,
    itemsPerPage,
    paginatedData,
    totalItems: data.length,
    totalPages: Math.ceil(data.length / itemsPerPage),
    handlePageChange,
    handleItemsPerPageChange,
    resetPagination
  };
};

export default usePagination;
