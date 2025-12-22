import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/NavBar";
import Pagination from "../../components/Pagination";
import MediumButtons from "../../components/buttons/MediumButtons";
import StatusFilterModal from "../../components/Modals/StatusFilterModal";
import DeleteModal from "../../components/Modals/DeleteModal";
import Status from "../../components/Status";
import MockupData from "../../data/mockData/more/status-mockup-data.json";
import Alert from "../../components/Alert";
import Footer from "../../components/Footer";

import "../../styles/Category.css";

const systemDefaultStatus = [
  "Archived",
  "Being Repaired",
  "Broken",
  "Deployed",
  "Lost or Stolen",
  "Pending",
  "Ready to Deploy",
];

const isDefaultStatus = (status) => {
  const isDefault = systemDefaultStatus.some(
    (defaultStatus) => defaultStatus.toLowerCase() === status.name.toLowerCase()
  );

  return isDefault || status.tag > 0;
};

// TableHeader component to render the table header
function TableHeader({ allSelected, onHeaderChange }) {
  return (
    <tr>
      <th>
        <input
          type="checkbox"
          name="checkbox-status"
          id="checkbox-status"
          checked={allSelected}
          onChange={(e) => onHeaderChange(e.target.checked)}
        />
      </th>
      <th>NAME</th>
      <th>TYPE</th>
      <th>NOTES</th>
      <th>ASSETS</th>
      <th>ACTIONS</th>
    </tr>
  );
}

// TableItem component to render each ticket row
function TableItem({ status, onDeleteClick, isSelected, onRowChange }) {
  const navigate = useNavigate();

  const getTitle = (actionType, status) => {
    const isDefault = systemDefaultStatus.some(
      (defaultStatus) =>
        defaultStatus.toLowerCase() === status.name.toLowerCase()
    );

    const isInUseOrDefault = isDefault || status.tag > 0;

    if (isInUseOrDefault) {
      if (actionType === "delete") {
        return "This status is currently in use and cannot be deleted.";
      }
      return "This status is currently in use and cannot be edited.";
    }

    return actionType === "delete" ? "Delete" : "Edit";
  };

  const disabled = isDefaultStatus(status);

  return (
    <tr>
      <td>
        <div className="checkbox-status">
          <input
            type="checkbox"
            name=""
            id=""
            checked={isSelected}
            onChange={(e) => onRowChange(status.id, e.target.checked)}
            disabled={disabled}
          />
        </div>
      </td>
      <td>{status.name}</td>
      <td>
        <Status
          type={status.type}
          name={status.type[0].toUpperCase() + status.type.slice(1)}
        />
      </td>
      <td>{status.notes || "-"}</td>
      <td>{status.tag}</td>
      <td>
        <section className="action-button-section">
          <button
            title={getTitle("edit", status)}
            className="action-button"
            onClick={() =>
              navigate(`/More/StatusEdit/${status.id}`, { state: { status } })
            }
            disabled={disabled}
          >
            <i className="fas fa-edit"></i>
          </button>
          <span title={getTitle("delete", status)}>
            <button
              className="action-button"
              onClick={onDeleteClick}
              disabled={disabled}
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          </span>
        </section>
      </td>
    </tr>
  );
}

export default function Category() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isAddRecordSuccess, setAddRecordSuccess] = useState(false);
  const [isUpdateRecordSuccess, setUpdateRecordSuccess] = useState(false);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // default page size or number of items per page

  // filter state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filteredData, setFilteredData] = useState(MockupData);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Retrieve the "status" navigation flags for success alerts
  const addedStatus = location.state?.addedStatus;
  const updatedStatus = location.state?.updatedStatus;

  const actionStatus = (action, status) => {
    let timeoutId;

    if (action === "create" && status === true) {
      setAddRecordSuccess(true);
    }

    if (action === "update" && status === true) {
      setUpdateRecordSuccess(true);
    }

    // clear the navigation/history state so a full page refresh won't re-show the alert
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
    if (addedStatus == true) {
      return "create";
    }

    if (updatedStatus == true) {
      return "update";
    }

    return null;
  };

  // Set the setAddRecordSuccess or setUpdateRecordSuccess state to true when triggered, then reset to false after 5 seconds.
  useEffect(() => {
    let timeoutId;

    timeoutId = actionStatus(getAction(), true);

    // cleanup the timeout on unmount or when flags change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [addedStatus, updatedStatus, navigate, location.pathname]);

  // Apply filters to data
  const applyFilters = (filters) => {
    let filtered = [...MockupData];

    // Sort by usage (Assets count)
    if (filters.usageSort === "desc") {
      filtered = [...filtered].sort(
        (a, b) => (b.tag || 0) - (a.tag || 0)
      );
    } else if (filters.usageSort === "asc") {
      filtered = [...filtered].sort(
        (a, b) => (a.tag || 0) - (b.tag || 0)
      );
    }

    return filtered;
  };

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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchedData =
    normalizedQuery === ""
      ? filteredData
      : filteredData.filter((status) => {
          const name = status.name?.toLowerCase() || "";
          const type = status.type?.toLowerCase() || "";
          const notes = status.notes?.toLowerCase() || "";
          return (
            name.includes(normalizedQuery) ||
            type.includes(normalizedQuery) ||
            notes.includes(normalizedQuery)
          );
        });

  // paginate the data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCategories = searchedData.slice(startIndex, endIndex);

  // Only non-default statuses are selectable for bulk actions
  const selectableStatuses = paginatedCategories.filter(
    (status) => !isDefaultStatus(status)
  );

  const allSelected =
    selectableStatuses.length > 0 &&
    selectableStatuses.every((status) => selectedIds.includes(status.id));

  const handleHeaderChange = (checked) => {
    if (checked) {
      setSelectedIds((prev) => [
        ...prev,
        ...selectableStatuses
          .map((status) => status.id)
          .filter((id) => !prev.includes(id)),
      ]);
    } else {
      setSelectedIds((prev) =>
        prev.filter(
          (id) => !selectableStatuses.map((status) => status.id).includes(id)
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

  const openDeleteModal = (id = null) => {
    setDeleteTarget(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      console.log("Deleting single status id:", deleteTarget);
      setSuccessMessage("Status deleted successfully!");
    } else {
      console.log("Deleting multiple status ids:", selectedIds);
      if (selectedIds.length > 0) {
        setSuccessMessage("Statuses deleted successfully!");
      }
      setSelectedIds([]);
    }
    setTimeout(() => setSuccessMessage(""), 5000);
    closeDeleteModal();
  };

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      {isAddRecordSuccess && (
        <Alert message="Status added successfully!" type="success" />
      )}

      {isUpdateRecordSuccess && (
        <Alert message="Status updated successfully!" type="success" />
      )}

      {isDeleteModalOpen && (
        <DeleteModal
          closeModal={closeDeleteModal}
          actionType="delete"
          onConfirm={confirmDelete}
        />
      )}

      <StatusFilterModal
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
              <h2 className="h2">Statuses ({searchedData.length})</h2>
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
                <button
                  type="button"
                  className="medium-button-filter"
                  onClick={() => {
                    setIsFilterModalOpen(true);
                  }}
                >
                  Filter
                </button>
                <MediumButtons
                  type="new"
                  navigatePage="/More/StatusRegistration"
                />
              </section>
            </section>

            {/* Table Structure */}
            <section className="table-section">
              <table>
                <thead>
                  <TableHeader
                    allSelected={allSelected}
                    onHeaderChange={handleHeaderChange}
                  />
                </thead>
                <tbody>
                  {paginatedCategories.length > 0 ? (
                    paginatedCategories.map((status, index) => (
                      <TableItem
                        key={index}
                        status={status}
                        isSelected={selectedIds.includes(status.id)}
                        onRowChange={handleRowChange}
                        onDeleteClick={() => openDeleteModal(status.id)}
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
                onPageSizeChange={setPageSize}
              />
            </section>
          </section>
        </main>
        <Footer />
      </section>
    </>
  );
}
