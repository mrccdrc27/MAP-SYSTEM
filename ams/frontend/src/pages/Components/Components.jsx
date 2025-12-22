import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NavBar from "../../components/NavBar";
import Status from "../../components/Status";
import MediumButtons from "../../components/buttons/MediumButtons";
import ComponentFilterModal from "../../components/Modals/ComponentFilterModal";
import Pagination from "../../components/Pagination";
import ActionButtons from "../../components/ActionButtons";
import ConfirmationModal from "../../components/Modals/DeleteModal";
import Alert from "../../components/Alert";
import Footer from "../../components/Footer";
import DefaultImage from "../../assets/img/default-image.jpg";
import MockupData from "../../data/mockData/components/component-mockup-data.json";
import { exportToExcel } from "../../utils/exportToExcel";
import { fetchAllComponents } from "../../services/assets-service";

import "../../styles/components/Components.css";

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
      <th>IMAGE</th>
      <th>NAME</th>
      <th>CATEGORY</th>
      <th>MANUFACTURER</th>
      <th>DEPRECIATION</th>
      <th>CHECK-OUT</th>
      <th>CHECK-IN</th>
      <th>ACTION</th>
    </tr>
  );
}

// TableItem component to render each asset row
function TableItem({
  asset,
  isSelected,
  onRowChange,
  onDeleteClick,
  onViewClick,
  onCheckInOut,
}) {
  const baseImage = asset.image
    ? `${ASSETS_API_URL.replace(/\/$/, "")}${asset.image}`
    : DefaultImage;

  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onRowChange(asset.id, e.target.checked)}
        />
      </td>
      <td>
        <img
          src={baseImage}
          alt={asset.name}
          className="table-img"
          onError={(e) => {
            e.target.src = DefaultImage;
          }}
        />
      </td>
      <td>{asset.name}</td>
      <td>{asset.category || "N/A"}</td>
      <td>{asset.manufacturer || "N/A"}</td>
      <td>{asset.depreciation || "N/A"}</td>

      {/* Check-out Column */}
      <td>
        <ActionButtons
          showCheckout
          onCheckoutClick={() => onCheckInOut(asset, "checkout")}
        />
      </td>

      {/* Check-in Column */}
      <td>
        <ActionButtons
          showCheckin
          onCheckinClick={() => onCheckInOut(asset, "checkin")}
        />
      </td>

      <td>
        <ActionButtons
          showEdit
          showDelete
          showView
          editPath={`/components/edit/${asset.id}`}
          editState={{ item: asset }}
          onDeleteClick={() => onDeleteClick(asset.id)}
          onViewClick={() => onViewClick(asset)}
        />
      </td>
    </tr>
  );
}

export default function Assets() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // base data state
  const [baseData, setBaseData] = useState([]);

  // Load components from API
  useEffect(() => {
    async function loadComponents() {
      try {
        const data = await fetchAllComponents();

        const processed = data.map((asset) => {
          const available = asset.available_quantity ?? 0;
          const checkedOut = asset.checked_out_quantity ?? 0;

          return {
            ...asset,
            showCheckout: available > 0,
            showCheckin: checkedOut > 0,
          };
        });

        setBaseData(processed);
        setFilteredData(processed);
      } catch (error) {
        setErrorMessage("Failed to load components.");
      }
    }

    loadComponents();
  }, []);

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [filteredData, setFilteredData] = useState(baseData);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    console.log("Filter Modal State Changed:", isFilterModalOpen);
  }, [isFilterModalOpen]);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // default page size or number of items per page

  // selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Helper to normalise date strings (YYYY-MM-DD) for comparison
  const toDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    // Guard against invalid dates from bad mock data
    return Number.isNaN(d.getTime()) ? null : d;
  };

  // Apply filters to data
  const applyFilters = (filters) => {
    let filtered = [...baseData];

    // Category (Dropdown)
    if (filters.category && filters.category.label) {
      const categoryLabel = filters.category.label.toLowerCase();
      filtered = filtered.filter((component) =>
        component.category?.toLowerCase().includes(categoryLabel)
      );
    }

    // Manufacturer (Dropdown)
    if (filters.manufacturer && filters.manufacturer.label) {
      const manufacturerLabel = filters.manufacturer.label.toLowerCase();
      filtered = filtered.filter((component) =>
        component.manufacturer?.toLowerCase().includes(manufacturerLabel)
      );
    }

    // Supplier (Dropdown)
    if (filters.supplier && filters.supplier.label) {
      const supplierLabel = filters.supplier.label.toLowerCase();
      filtered = filtered.filter((component) =>
        component.supplier?.toLowerCase().includes(supplierLabel)
      );
    }

    // Location (Dropdown)
    if (filters.location && filters.location.label) {
      const locationLabel = filters.location.label.toLowerCase();
      filtered = filtered.filter((component) =>
        component.location?.toLowerCase().includes(locationLabel)
      );
    }

    // Purchase Date range
    const purchaseFrom = toDate(filters.purchaseDateFrom);
    const purchaseTo = toDate(filters.purchaseDateTo);
    if (purchaseFrom || purchaseTo) {
      filtered = filtered.filter((component) => {
        const purchaseDate = toDate(component.purchase_date);
        if (!purchaseDate) return false;
        if (purchaseFrom && purchaseDate < purchaseFrom) return false;
        if (purchaseTo && purchaseDate > purchaseTo) return false;
        return true;
      });
    }

    // Due for Check-in range
    // NOTE: components list does not have a direct "due for check-in" field.
    // For now, we treat this as a no-op so the UI remains consistent
    // and can be wired to real data once available.

    // Created At range (front-end only; not present in current mock data)
    const createdFrom = toDate(filters.createdAtFrom);
    const createdTo = toDate(filters.createdAtTo);
    if (createdFrom || createdTo) {
      filtered = filtered.filter((component) => {
        const createdAt = toDate(component.created_at);
        if (!createdAt) return false;
        if (createdFrom && createdAt < createdFrom) return false;
        if (createdTo && createdAt > createdTo) return false;
        return true;
      });
    }

    // Updated At range (front-end only; not present in current mock data)
    const updatedFrom = toDate(filters.updatedAtFrom);
    const updatedTo = toDate(filters.updatedAtTo);
    if (updatedFrom || updatedTo) {
      filtered = filtered.filter((component) => {
        const updatedAt = toDate(component.updated_at);
        if (!updatedAt) return false;
        if (updatedFrom && updatedAt < updatedFrom) return false;
        if (updatedTo && updatedAt > updatedTo) return false;
        return true;
      });
    }

    return filtered;
  };

  // Combine modal filters and search term
  const applyFiltersAndSearch = (filters, term) => {
    let filtered = applyFilters(filters || {});

    if (term && term.trim() !== "") {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(
        (component) =>
          (component.name &&
            component.name.toLowerCase().includes(lowerTerm)) ||
          (component.category &&
            component.category.toLowerCase().includes(lowerTerm)) ||
          (component.manufacturer &&
            component.manufacturer.toLowerCase().includes(lowerTerm)) ||
          (component.supplier &&
            component.supplier.toLowerCase().includes(lowerTerm)) ||
          (component.location &&
            component.location.toLowerCase().includes(lowerTerm))
      );
    }

    return filtered;
  };

  // Handle filter apply
  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
    const filtered = applyFiltersAndSearch(filters, searchTerm);
    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle search input
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setCurrentPage(1);
    const filtered = applyFiltersAndSearch(appliedFilters, term);
    setFilteredData(filtered);
  };

  // paginate the data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAssets = filteredData.slice(startIndex, endIndex);

  // selection logic
  const allSelected =
    paginatedAssets.length > 0 &&
    paginatedAssets.every((item) => selectedIds.includes(item.id));

  const handleHeaderChange = (e) => {
    if (e.target.checked) {
      setSelectedIds((prev) => [
        ...prev,
        ...paginatedAssets
          .map((item) => item.id)
          .filter((id) => !prev.includes(id)),
      ]);
    } else {
      setSelectedIds((prev) =>
        prev.filter(
          (id) => !paginatedAssets.map((item) => item.id).includes(id)
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

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  // delete modal state
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
      // remove from mock data / API call
    } else {
      console.log("Deleting multiple ids:", selectedIds);
      // remove multiple
      setSelectedIds([]); // clear selection
    }
    closeDeleteModal();
  };

  const handleViewClick = (component) => {
    navigate(`/components/view/${component.id}`, {
      state: { component },
    });
  };

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

  const handleExport = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : baseData;
    exportToExcel(dataToExport, "Assets_Records.xlsx");
  };

  const handleCheckInOut = (asset, action) => {
    // Build minimal mock item data expected by ComponentCheckout/ComponentCheckin
    const available_quantity = asset.available_quantity ?? 10;
    const remaining_quantity = asset.remaining_quantity ?? available_quantity;

    const item = {
      id: asset.id,
      name: asset.name,
      available_quantity,
      remaining_quantity,
    };

    if (action === "checkin") {
      navigate(`/components/check-in/${asset.id}`, {
        state: {
          item,
          componentName: asset.name,
        },
      });
    } else {
      navigate(`/components/check-out/${asset.id}`, {
        state: { item },
      });
    }
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

      {/* Component Filter Modal */}
      <ComponentFilterModal
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
              <h2 className="h2">Components ({filteredData.length})</h2>
              <section className="table-actions">
                {/* Bulk edit and delete buttons only when checkboxes selected */}
                {selectedIds.length > 0 && (
                  <>
                    <MediumButtons
                      type="edit"
                      onClick={() =>
                        navigate("/components/bulk-edit", {
                          state: { selectedIds },
                        })
                      }
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
                  value={searchTerm}
                  onChange={handleSearch}
                />
                <button
                  type="button"
                  className="medium-button-filter"
                  onClick={() => {
                    console.log("DIRECT FILTER BUTTON CLICKED!");
                    setIsFilterModalOpen(true);
                  }}
                >
                  Filter
                </button>
                {isAdmin() && (
                  <>
                    <MediumButtons type="export" onClick={handleExport} />
                    <MediumButtons
                      type="new"
                      navigatePage="/components/registration"
                    />
                  </>
                )}
              </section>
            </section>

            {/* Table Structure */}
            <section className="assets-table-section">
              <table>
                <thead>
                  <TableHeader
                    allSelected={allSelected}
                    onHeaderChange={handleHeaderChange}
                  />
                </thead>
                <tbody>
                  {paginatedAssets.length > 0 ? (
                    paginatedAssets.map((asset) => (
                      <TableItem
                        key={asset.id}
                        asset={asset}
                        isSelected={selectedIds.includes(asset.id)}
                        onRowChange={handleRowChange}
                        onDeleteClick={openDeleteModal}
                        onViewClick={handleViewClick}
                        onCheckInOut={handleCheckInOut}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="no-data-message">
                        No Assets Found.
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
