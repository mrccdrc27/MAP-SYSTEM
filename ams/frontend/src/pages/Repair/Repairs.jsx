import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/NavBar";
import MediumButtons from "../../components/buttons/MediumButtons";
import MockupData from "../../data/mockData/repairs/asset-repair-mockup-data.json";
import AssetsMockupData from "../../data/mockData/assets/assets-mockup-data.json";
import Pagination from "../../components/Pagination";
import ActionButtons from "../../components/ActionButtons";
import ConfirmationModal from "../../components/Modals/DeleteModal";
import RepairFilterModal from "../../components/Modals/RepairFilterModal";
import Alert from "../../components/Alert";
import Footer from "../../components/Footer";
import { exportToExcel } from "../../utils/exportToExcel";
import { useAuth } from "../../context/AuthContext";

import "../../styles/Repairs/Repairs.css";

// TableHeader component to render the table header
function TableHeader({ allSelected, onHeaderChange }) {
  return (
    <tr>
      <th>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onHeaderChange}
        />
      </th>
      <th>ASSET ID</th>
      <th>ASSET NAME</th>
      <th>REPAIR TYPE</th>
      <th>REPAIR NAME</th>
      <th>START DATE</th>
      <th>END DATE</th>
      <th>COST</th>
      <th>SUPPLIER</th>
      <th>NOTES</th>
      <th>ATTACHMENT</th>
      <th>ACTION</th>
    </tr>
  );
}

// TableItem component to render each repair row
function TableItem({
  repair,
  isSelected,
  onRowChange,
  onDeleteClick,
  onViewClick,
}) {
  const assetLabel = repair.asset || "";
  const assetParts = assetLabel.split(" ");
  const assetId =
    assetParts.length > 1 ? assetParts[assetParts.length - 1] : "-";
  const assetName =
    assetParts.length > 1 ? assetParts.slice(0, -1).join(" ") : assetLabel;

  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onRowChange(repair.id, e.target.checked)}
        />
      </td>
      <td>{assetId}</td>
      <td>{assetName}</td>
      <td>{repair.type}</td>
      <td>{repair.name}</td>
      <td>{repair.start_date}</td>
      <td>{repair.end_date || "N/A"}</td>
      <td>{repair.cost}</td>
      <td>{repair.supplier || "N/A"}</td>
      <td>{repair.notes || "N/A"}</td>
      <td>
        {repair.attachments?.length
          ? `${repair.attachments.length} file(s)`
          : "N/A"}
      </td>
      <td>
        <ActionButtons
          showEdit
          showDelete
          showView
          editPath={`/repairs/edit/${repair.id}`}
          editState={{ repair }}
          onDeleteClick={() => onDeleteClick(repair.id)}
          onViewClick={() => onViewClick(repair)}
        />
      </td>
    </tr>
  );
}

export default function AssetRepairs() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Filter and data state
  const [filteredData, setFilteredData] = useState(MockupData);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Delete modal state
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});

  // Alert state
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      setTimeout(() => {
        setSuccessMessage("");
        window.history.replaceState({}, document.title);
      }, 5000);
    }
  }, [location]);

  // Paginate the data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRepairs = filteredData.slice(startIndex, endIndex);

  // Selection logic
  const allSelected =
    paginatedRepairs.length > 0 &&
    paginatedRepairs.every((item) => selectedIds.includes(item.id));

  const handleHeaderChange = (e) => {
    if (e.target.checked) {
      setSelectedIds((prev) => [
        ...prev,
        ...paginatedRepairs
          .map((item) => item.id)
          .filter((id) => !prev.includes(id)),
      ]);
    } else {
      setSelectedIds((prev) =>
        prev.filter(
          (id) => !paginatedRepairs.map((item) => item.id).includes(id)
        )
      );
    }
  };

  const handleRowChange = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
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
      console.log("Deleting single id:", deleteTarget);
      // remove from mock data / API call
    } else {
      console.log("Deleting multiple ids:", selectedIds);
      // remove multiple
      setSelectedIds([]); // clear selection
    }
    closeDeleteModal();
  };

  const handleViewClick = (repair) => {
    // Try to find the related asset based on the repair's asset field
    const assetLabel = (repair.asset || "").toLowerCase();

    let matchedAsset = AssetsMockupData.find((asset) => {
      const name = (asset.name || "").toLowerCase();
      const displayedId = (asset.displayed_id || "").toLowerCase();
      return (
        (assetLabel && name.includes(assetLabel)) ||
        (assetLabel && assetLabel.includes(displayedId))
      );
    });

    // Fallback: for mock data, try matching by id so View always opens an Asset view page
    if (!matchedAsset) {
      matchedAsset = AssetsMockupData.find((asset) => asset.id === repair.id);
    }

    if (matchedAsset) {
      navigate(`/assets/view/${matchedAsset.id}`);
    } else {
      // No linked asset found in mock data; surface a friendly message
      setErrorMessage("No linked asset found for this repair in mock data.");
      setTimeout(() => setErrorMessage(""), 4000);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : MockupData;
    exportToExcel(dataToExport, "Repairs_Records.xlsx");
  };

  // Apply filters to data
  const applyFilters = (filters) => {
    let filtered = [...MockupData];

    // Filter by Asset
    if (filters.asset && filters.asset.trim() !== "") {
      filtered = filtered.filter((repair) =>
        repair.asset?.toLowerCase().includes(filters.asset.toLowerCase())
      );
    }

    // Filter by Type
    if (filters.type) {
      filtered = filtered.filter(
        (repair) =>
          repair.type?.toLowerCase() === filters.type.value?.toLowerCase()
      );
    }

    // Filter by Name
    if (filters.name && filters.name.trim() !== "") {
      filtered = filtered.filter((repair) =>
        repair.name?.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    // Filter by Start Date
    if (filters.startDate && filters.startDate.trim() !== "") {
      filtered = filtered.filter(
        (repair) => repair.start_date === filters.startDate
      );
    }

    // Filter by End Date
    if (filters.endDate && filters.endDate.trim() !== "") {
      filtered = filtered.filter(
        (repair) => repair.end_date === filters.endDate
      );
    }

    // Filter by Cost
    if (filters.cost && filters.cost.trim() !== "") {
      const cost = parseFloat(filters.cost);
      filtered = filtered.filter((repair) => repair.cost === cost);
    }

    // Filter by Status
    if (filters.status) {
      filtered = filtered.filter(
        (repair) =>
          repair.statusType?.toLowerCase() ===
          filters.status.value?.toLowerCase()
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

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      {isDeleteModalOpen && (
        <ConfirmationModal
          closeModal={closeDeleteModal}
          actionType="delete"
          onConfirm={confirmDelete}
        />
      )}

      {/* Repair Filter Modal */}
      <RepairFilterModal
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
              <h2 className="h2">Asset Repairs ({filteredData.length})</h2>
              <section className="table-actions">
                {/* Bulk edit and delete buttons only when checkboxes selected */}
                {selectedIds.length > 0 && (
                  <>
                    <MediumButtons
                      type="edit"
                      onClick={() => console.log("Bulk edit repairs")}
                    />
                    <MediumButtons
                      type="delete"
                      onClick={() => openDeleteModal(null)}
                    />
                  </>
                )}
                <input
                  type="search"
                  placeholder="Search..."
                  className="search"
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
                {isAdmin() && (
                  <MediumButtons type="export" onClick={handleExport} />
                )}

                <MediumButtons
                  type="new"
                  navigatePage="/repairs/registration"
                />
              </section>
            </section>

            {/* Table Structure */}
            <section className="repairs-table-section">
              <table>
                <thead>
                  <TableHeader
                    allSelected={allSelected}
                    onHeaderChange={handleHeaderChange}
                  />
                </thead>
                <tbody>
                  {paginatedRepairs.length > 0 ? (
                    paginatedRepairs.map((repair) => (
                      <TableItem
                        key={repair.id}
                        repair={repair}
                        isSelected={selectedIds.includes(repair.id)}
                        onRowChange={handleRowChange}
                        onDeleteClick={openDeleteModal}
                        onViewClick={handleViewClick}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="no-data-message">
                        No Repairs Found.
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
                totalItems={filteredData.length}
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
