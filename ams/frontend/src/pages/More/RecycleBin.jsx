import { useEffect, useRef, useState } from "react";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import Alert from "../../components/Alert";
import MediumButtons from "../../components/buttons/MediumButtons";
import RecycleBinFilterModal from "../../components/Modals/RecycleBinFilterModal";
import Pagination from "../../components/Pagination";
import { exportToExcel } from "../../utils/exportToExcel";
import "../../styles/Table.css";
import "../../styles/TabNavBar.css";
import "../../styles/RecycleBin.css";
import ActionButtons from "../../components/ActionButtons";
import ConfirmationModal from "../../components/Modals/DeleteModal";

// Import mock data
import deletedAssets from "../../data/mockData/assets/deleted-asset-mockup-data.json";
import deletedComponents from "../../data/mockData/components/deleted-component-mockup-data.json";

// TableHeader
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
      <th>NAME</th>
      <th>CATEGORY</th>
      <th>MANUFACTURER</th>
      <th>SUPPLIER</th>
      <th>LOCATION</th>
      <th>ACTION</th>
    </tr>
  );
}

// TableItem
function TableItem({ item, isSelected, onRowChange, onDeleteClick, onRecoverClick }) {
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onRowChange(item.id, e.target.checked)}
        />
      </td>
      <td>{item.name}</td>
      <td>{item.category}</td>
      <td>{item.manufacturer}</td>
      <td>{item.supplier}</td>
      <td>{item.location}</td>
      <td>
        <ActionButtons
          showRecover
          showDelete
          onRecoverClick={() => onRecoverClick(item.id)}
          onDeleteClick={() => onDeleteClick(item.id)}
        />
      </td>
    </tr>
  );
}

export default function RecycleBin() {
  // export toggle
  const [exportToggle, setExportToggle] = useState(false);
  const exportRef = useRef(null);
  const toggleRef = useRef(null);

  // active tab (assets | components)
  const [activeTab, setActiveTab] = useState("assets");
  // choose dataset depending on tab
  const data = activeTab === "assets" ? deletedAssets : deletedComponents;

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // filter state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filteredData, setFilteredData] = useState(data);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Apply filters to data
  const applyFilters = (filters) => {
    let filtered = [...data];

    // Filter by Name
    if (filters.name && filters.name.trim() !== "") {
      filtered = filtered.filter((item) =>
        item.name?.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    // Filter by Category
    if (filters.category && filters.category.trim() !== "") {
      filtered = filtered.filter((item) =>
        item.category?.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    // Filter by Manufacturer
    if (filters.manufacturer && filters.manufacturer.trim() !== "") {
      filtered = filtered.filter((item) =>
        item.manufacturer?.toLowerCase().includes(filters.manufacturer.toLowerCase())
      );
    }

    // Filter by Supplier
    if (filters.supplier && filters.supplier.trim() !== "") {
      filtered = filtered.filter((item) =>
        item.supplier?.toLowerCase().includes(filters.supplier.toLowerCase())
      );
    }

    // Filter by Location
    if (filters.location && filters.location.trim() !== "") {
      filtered = filtered.filter((item) =>
        item.location?.toLowerCase().includes(filters.location.toLowerCase())
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
      : filteredData.filter((item) => {
          const name = item.name?.toLowerCase() || "";
          const category = item.category?.toLowerCase() || "";
          const manufacturer = item.manufacturer?.toLowerCase() || "";
          const supplier = item.supplier?.toLowerCase() || "";
          const location = item.location?.toLowerCase() || "";
          return (
            name.includes(normalizedQuery) ||
            category.includes(normalizedQuery) ||
            manufacturer.includes(normalizedQuery) ||
            supplier.includes(normalizedQuery) ||
            location.includes(normalizedQuery)
          );
        });

  // Handle export
  const handleExport = () => {
    const dataToExport = searchedData.length > 0 ? searchedData : filteredData;
    exportToExcel(dataToExport, "RecycleBin_Records.xlsx");
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedActivity = searchedData.slice(startIndex, endIndex);

  // selection
  const [selectedIds, setSelectedIds] = useState([]);

  const allSelected =
    paginatedActivity.length > 0 &&
    paginatedActivity.every((item) => selectedIds.includes(item.id));

  const handleHeaderChange = (e) => {
    if (e.target.checked) {
      setSelectedIds((prev) => [
        ...prev,
        ...paginatedActivity.map((item) => item.id).filter((id) => !prev.includes(id)),
      ]);
    } else {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedActivity.map((item) => item.id).includes(id))
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

  // delete modal state
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // null = bulk, id = single

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
      setSuccessMessage("Item deleted successfully from Recycle Bin!");
      // remove from mock data / API call
    } else {
      console.log("Deleting multiple ids:", selectedIds);
      if (selectedIds.length > 0) {
        setSuccessMessage("Items deleted successfully from Recycle Bin!");
      }
      // remove multiple
      setSelectedIds([]); // clear selection
    }
    setTimeout(() => setSuccessMessage(""), 5000);
    closeDeleteModal();
  };

  // recover modal state
  const [isRecoverModalOpen, setRecoverModalOpen] = useState(false);
  const [recoverTarget, setRecoverTarget] = useState(null);

  const openRecoverModal = (id = null) => {
    setRecoverTarget(id);
    setRecoverModalOpen(true);
  };

  const closeRecoverModal = () => {
    setRecoverModalOpen(false);
    setRecoverTarget(null);
  };

  const confirmRecover = () => {
    if (recoverTarget) {
      console.log("Recovering single id:", recoverTarget);
      // API call or restore from mock
    } else {
      console.log("Recovering multiple ids:", selectedIds);
      setSelectedIds([]); // clear selection if bulk
    }
    closeRecoverModal();
  };

  // Update filteredData when tab changes
  useEffect(() => {
    setFilteredData(data);
    setAppliedFilters({});
  }, [activeTab, data]);

  // outside click for export toggle
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        exportToggle &&
        exportRef.current &&
        !exportRef.current.contains(event.target) &&
        toggleRef.current &&
        !toggleRef.current.contains(event.target)
      ) {
        setExportToggle(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [exportToggle]);

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

      {isRecoverModalOpen && (
        <ConfirmationModal
          closeModal={closeRecoverModal}
          actionType="recover"
          onConfirm={confirmRecover}
        />
      )}

      <RecycleBinFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApplyFilter={handleApplyFilter}
        initialFilters={appliedFilters}
        activeTab={activeTab}
      />

      <section className="page-layout-with-table">
        <NavBar />

        <main className="main-with-table">
          { /* Tab Navigation */}
          <div className="tab-nav">
            <ul>
              <li className={activeTab === "assets" ? "active" : ""}>
                <a
                  className={activeTab === "assets" ? "active" : ""}
                  onClick={() => {
                    setActiveTab("assets");
                    setCurrentPage(1);
                    setSelectedIds([]);
                  }}
                >
                  Assets ({deletedAssets.length})
                </a>
              </li>
              <li className={activeTab === "components" ? "active" : ""}>
                <a
                  className={activeTab === "components" ? "active" : ""}
                  onClick={() => {
                    setActiveTab("components");
                    setCurrentPage(1);
                    setSelectedIds([]);
                  }}
                >
                  Components ({deletedComponents.length})
                </a>
              </li>
            </ul>
          </div>

          <section className="table-layout">
            <section className="table-header">
              <h2 className="h2">
                {activeTab === "assets"
                  ? `Deleted Assets (${searchedData.length})`
                  : `Deleted Components (${searchedData.length})`}
              </h2>
              <section className="table-actions">
                {/* Bulk recover button only when checkboxes selected */}
                {selectedIds.length > 0 && (
                  <MediumButtons
                    type="recover"
                    onClick={() => openRecoverModal(null)}
                  />
                )}

                {/* Bulk delete button only when checkboxes selected */}
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
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  Filter
                </button>

                <MediumButtons
                  type="export"
                  onClick={handleExport}
                />
              </section>
            </section>

            <section className="recycle-bin-table-section">
              <table>
                <thead>
                  <TableHeader
                    allSelected={allSelected}
                    onHeaderChange={handleHeaderChange}
                  />
                </thead>
                <tbody>
                  {paginatedActivity.length > 0 ? (
                    paginatedActivity.map((item) => (
                      <TableItem
                        key={item.id}
                        item={item}
                        isSelected={selectedIds.includes(item.id)}
                        onRowChange={handleRowChange}
                        onDeleteClick={openDeleteModal}
                        onRecoverClick={openRecoverModal}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="no-data-message">
                        No Deleted Items Found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

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