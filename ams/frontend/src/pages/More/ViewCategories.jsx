import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/NavBar";
import Pagination from "../../components/Pagination";
import MediumButtons from "../../components/buttons/MediumButtons";
import CategoryFilterModal from "../../components/Modals/CategoryFilterModal";
import DeleteModal from "../../components/Modals/DeleteModal";
import DefaultImage from "../../assets/img/default-image.jpg";
import Alert from "../../components/Alert";
import Footer from "../../components/Footer";
import "../../styles/Category.css";
import { fetchCategories, contextsBase, deleteCategory, bulkDeleteCategories } from '../../api/contextsApi'

// categories will be fetched from contexts backend

const filterConfig = [
  {
    type: "select",
    name: "type",
    label: "Type",
    options: [
      { value: "accessory", label: "Accessory" },
      { value: "consumable", label: "Consumable" },
      { value: "component", label: "Component" },
    ],
  },
  {
    type: "number",
    name: "quantity",
    label: "Quantity",
  },
];

// TableHeader component to render the table header
function TableHeader({ allSelected, onSelectAll }) {
  return (
    <tr>
      <th>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
        />
      </th>
      <th>NAME</th>
      <th>TYPE</th>
      <th>QUANTITY</th>
      <th>ACTIONS</th>
    </tr>
  );
}

// TableItem component to render each ticket row
function TableItem({ category, onDeleteClick, onCheckboxChange, isChecked }) {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  // Build image URL: API returns field `logo` (not `icon`).
  // If `logo` is a relative path, prefix it with `contextsBase` so the browser
  // requests the image from the contexts service rather than the frontend origin.
  const rawLogo = category.logo ?? category.icon ?? null
  let logoUrl = null
  if (rawLogo) {
    // Absolute URLs (http(s)://) should be used as-is
    if (/^https?:\/\//i.test(rawLogo)) {
      logoUrl = rawLogo
    } else if (rawLogo.startsWith('/')) {
      // contextsBase may be empty or end with a slash
      logoUrl = (contextsBase || '').replace(/\/$/, '') + rawLogo
    } else {
      // relative path without leading slash — treat similarly
      logoUrl = (contextsBase || '').replace(/\/$/, '') + '/' + rawLogo
    }
  }

  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onCheckboxChange(category.id, e.target.checked)}
        />
      </td>
      <td>
        <div className="category-name">
          <img src={logoUrl ?? DefaultImage} alt={category.name} />
          {category.name}
        </div>
      </td>
      <td>{category.type}</td>
      <td>
        {category.type === 'asset' ? (category.asset_count ?? 0) : category.type === 'component' ? (category.component_count ?? 0) : ''}
      </td>
      <td>
        <section className="action-button-section">
          <button
            title="Edit"
            className="action-button"
            onClick={() =>
              navigate('/More/CategoryEdit', { state: { category } })
            }
          >
            <i className="fas fa-edit"></i>
          </button>
          <button
            title="Delete"
            className="action-button"
            onClick={onDeleteClick}
          >
            <i className="fas fa-trash-alt"></i>
          </button>
        </section>
      </td>
    </tr>
  )
}

export default function Category() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isAddRecordSuccess, setAddRecordSuccess] = useState(false);
  const [isUpdateRecordSuccess, setUpdateRecordSuccess] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // default page size or number of items per page

  // filter state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [fetchedCategories, setFetchedCategories] = useState([])
  const [filteredData, setFilteredData] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch categories from contexts backend (minimal fields)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
          // Request both counts; serializer will provide numeric values (0 when none)
          const data = await fetchCategories({ fields: 'id,name,type,asset_count,component_count', page_size: 500 })
        if (!mounted) return
        setFetchedCategories(data)
        setFilteredData(data)
      } catch (err) {
        console.error('Failed to fetch categories', err)
        setFetchedCategories([])
        setFilteredData([])
      }
    })()
    return () => { mounted = false }
  }, [])

  // Apply filters to data
  const applyFilters = (filters) => {
    let filtered = [...fetchedCategories]

    // Filter by Name
    if (filters.name && filters.name.trim() !== '') {
      filtered = filtered.filter((category) =>
        (category.name || '').toLowerCase().includes(filters.name.toLowerCase())
      )
    }

    return filtered
  }

  // Handle filter apply
  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
    const filtered = applyFilters(filters);
    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Handle page size changes from Pagination: update page size and
  // ensure currentPage is within the new valid range so table shows data.
  const handlePageSizeChangeLocal = (newSize) => {
    const size = Number(newSize) || pageSize;
    const newTotalPages = Math.max(1, Math.ceil(searchedData.length / size));
    setPageSize(size);
    setCurrentPage((prev) => Math.min(prev, newTotalPages));
    if (typeof window !== 'undefined' && window.scrollTo) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchedData =
    normalizedQuery === ""
      ? filteredData
      : filteredData.filter((category) => {
          const name = category.name?.toLowerCase() || "";
          const type = category.type?.toLowerCase() || "";
          return name.includes(normalizedQuery) || type.includes(normalizedQuery);
        });

  // paginate the data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCategories = searchedData.slice(startIndex, endIndex);

  const allSelected =
    paginatedCategories.length > 0 &&
    paginatedCategories.every((category) => selectedIds.includes(category.id));

  const handleHeaderChange = (checked) => {
    if (checked) {
      setSelectedIds((prev) => [
        ...prev,
        ...paginatedCategories
          .map((item) => item.id)
          .filter((id) => !prev.includes(id)),
      ]);
    } else {
      setSelectedIds((prev) =>
        prev.filter(
          (id) => !paginatedCategories.map((item) => item.id).includes(id)
        )
      );
    }
  };

  const handleRowChange = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  // Retrieve the "addCategory" value passed from the navigation state.
  // If the "addCategory" is not exist, the default value for this is "undifiend".
  const addedCategory = location.state?.addedCategory;
  const updatedCategory = location.state?.updatedCategory;

  const actionStatus = (action, status) => {
    let timeoutId;

    if (action === "create" && status === true) {
      setAddRecordSuccess(true);
    }

    if (action === "update" && status === true) {
      setUpdateRecordSuccess(true);
    }

    // clear the navigation/history state so a full page refresh won't re-show the alert
    // replace the current history entry with an empty state
    navigate(location.pathname, { replace: true, state: {} });

    return (timeoutId = setTimeout(() => {
      if (action === "create") {
        setAddRecordSuccess(false);
      } else {
        setUpdateRecordSuccess(false);
      }
    }, 5000));
  };

  const getAction = () => {
    if (addedCategory == true) {
      return "create";
    }

    if (updatedCategory == true) {
      return "update";
    }

    return null;
  };

  const openDeleteModal = (id = null) => {
    setDeleteTarget(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    try {
      if (deleteTarget) {
        const resp = await deleteCategory(deleteTarget);
        // If backend indicates the item is in use or skipped, show singular in-use alert
        if (resp && (resp.in_use || (resp.skipped && Object.keys(resp.skipped).length))) {
          const msg = `The selected category cannot be deleted. Currently in use!`;
          setErrorMessage(msg);
          setTimeout(() => setErrorMessage(''), 5000);
          return { ok: false, data: { in_use: true } };
        }
        setSuccessMessage("Category deleted successfully!");
      } else {
        if (selectedIds.length > 0) {
          const resp = await bulkDeleteCategories(selectedIds);
          // If backend skipped some items, signal the modal to display usage message
          if (resp && resp.skipped && Object.keys(resp.skipped).length > 0) {
            const deletedCount = (resp && resp.deleted && resp.deleted.length) || 0;
            const skippedCount = Object.keys(resp.skipped).length;

            if (deletedCount > 0) {
              const parts = [`${deletedCount} categories deleted successfully`];
              if (skippedCount > 0) parts.push(`${skippedCount} skipped (in use)`);
              const msg = parts.join('; ') + '.';
              setSuccessMessage(msg);
              setErrorMessage('');
              setTimeout(() => setSuccessMessage(''), 5000);
              return { ok: false, data: resp };
            }

            // Only skipped
            const msg = `${skippedCount} categories skipped (currently in use).`;
            setErrorMessage(msg);
            setSuccessMessage('');
            setTimeout(() => setErrorMessage(''), 5000);
            return { ok: false, data: resp };
          }
          setSuccessMessage("Categories deleted successfully!");
        }
        setSelectedIds([]);
      }

      // Refresh the local list after deletion
      try {
        const data = await fetchCategories({ fields: 'id,name,type,asset_count,component_count', page_size: 500 })
        setFetchedCategories(data)
        setFilteredData(data)
      } catch (err) {
        console.error('Failed to refresh categories after delete', err)
      }

      // Success — close modal and return ok
      closeDeleteModal();
      setTimeout(() => setSuccessMessage(""), 5000);
      return { ok: true, data: null };
    } catch (err) {
      console.error('Delete failed', err)
      const respData = err?.response?.data;
      // Detect usage-related errors (backend returns ValidationError with 'error' or 'detail')
      const isUsage = respData && (respData.in_use || respData.skipped || (respData.error && typeof respData.error === 'string' && respData.error.toLowerCase().includes('use')) || (respData.detail && typeof respData.detail === 'string' && respData.detail.toLowerCase().includes('use')));
      if (isUsage) {
        // Set page-level generic in-use alert. Use singular/plural depending on context.
        const isMultiple = !deleteTarget && selectedIds && selectedIds.length > 1;
        const msg = isMultiple
          ? `The selected categories cannot be deleted. Currently in use!`
          : `The selected category cannot be deleted. Currently in use!`;
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(''), 5000);
        // Tell the modal/page that deletion was blocked
        return { ok: false, data: { in_use: true } };
      }

      const msg = respData?.detail || respData || err.message || 'Delete failed.'
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setTimeout(() => setErrorMessage(''), 5000)
      return { ok: false, data: { error: msg } };
    }
  };

  // Set the setAddRecordSuccess or setUpdateRecordSuccess state to true when trigger, then reset to false after 5 seconds.
  useEffect(() => {
    let timeoutId;

    timeoutId = actionStatus(getAction(), true);

    // cleanup the timeout on unmount or when addedCategory or updatedCategory changes
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [addedCategory, updatedCategory, navigate, location.pathname]);

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      {isAddRecordSuccess && (
        <Alert message="Category added successfully!" type="success" />
      )}

      {isUpdateRecordSuccess && (
        <Alert message="Category updated successfully!" type="success" />
      )}

      {isDeleteModalOpen && (
        <DeleteModal
          closeModal={closeDeleteModal}
          actionType="delete"
          onConfirm={confirmDelete}
          selectedCount={deleteTarget ? 1 : selectedIds.length}
        />
      )}

      <CategoryFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApplyFilter={handleApplyFilter}
        initialFilters={appliedFilters}
      />

      <section className="page-layout-with-table">
        <NavBar />

        <main className="main-with-table">
          <section className="table-layout">
            {/* Table Header */}
            <section className="table-header">
              <h2 className="h2">Categories ({searchedData.length})</h2>
              <section className="table-actions">
                {selectedIds.length > 0 && (
                  <MediumButtons
                    type="delete"
                    onClick={() => openDeleteModal(null)}
                  />
                )}
                <input
                  type="search"
                  placeholder="Search..."
                  className="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                <MediumButtons
                  type="new"
                  navigatePage="/More/CategoryRegistration"
                />
              </section>
            </section>

            {/* Table Structure */}
            <section className="table-section">
              <table>
                <thead>
                  <TableHeader
                    allSelected={allSelected}
                    onSelectAll={handleHeaderChange}
                  />
                </thead>
                <tbody>
                  {paginatedCategories.length > 0 ? (
                    paginatedCategories.map((category, index) => (
                      <TableItem
                        key={index}
                        category={category}
                        isChecked={selectedIds.includes(category.id)}
                        onCheckboxChange={handleRowChange}
                        onDeleteClick={() => openDeleteModal(category.id)}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="no-data-message">
                        No categories found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            {/* Table pagination */}
            <section className="table-pagination">
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={searchedData.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChangeLocal}
              />
            </section>
          </section>
        </main>
        <Footer />
      </section>
    </>
  );
}
