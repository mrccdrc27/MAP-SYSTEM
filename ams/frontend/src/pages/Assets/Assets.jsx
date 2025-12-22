import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NavBar from "../../components/NavBar";
import Status from "../../components/Status";
import MediumButtons from "../../components/buttons/MediumButtons";
import Pagination from "../../components/Pagination";
import ActionButtons from "../../components/ActionButtons";
import ConfirmationModal from "../../components/Modals/DeleteModal";
import AssetFilterModal from "../../components/Modals/AssetFilterModal";
import Alert from "../../components/Alert";
import Footer from "../../components/Footer";
import DefaultImage from "../../assets/img/default-image.jpg";
import { exportToExcel } from "../../utils/exportToExcel";
import "../../styles/Assets/Assets.css";
import { fetchAllAssets } from "../../services/assets-service";

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
      <th>IMAGE</th>
      <th>ID</th>
      <th>NAME</th>
      <th>SERIAL</th>
      <th>STATUS</th>
      <th>WARRANTY</th>
      <th>END OF LIFE</th>
      <th>CHECK-IN / CHECK-OUT</th>
      <th>ACTION</th>
    </tr>
  );
}

// Helper to determine action button state
function getActionState(asset) {
  const status = asset.status_details?.type;
  const hasTicket = !!asset.ticket_details;

  // No actions for undeployable or archived
  if (status === "undeployable" || status === "archived") {
    return {
      showCheckin: false,
      showCheckout: false,
      checkoutDisabled: false,
    };
  }

  return {
    showCheckin: status === "deployed",

    showCheckout: status === "pending" || status === "deployable",

    checkoutDisabled:
      (status === "pending" || status === "deployable") && !hasTicket,
  };
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
  const baseImage = asset.image || DefaultImage;

  const actions = getActionState(asset);

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
      <td>{asset.asset_id}</td>
      <td>{asset.name}</td>
      <td>{asset.serial_number || "N/A"}</td>
      <td>
        <Status
          type={asset.status_details?.type?.toLowerCase()}
          name={asset.status_details?.name}
        />
      </td>
      <td>{asset.warranty_expiration || "N/A"}</td>
      <td>{asset.product_details.end_of_life || "N/A"}</td>
      {/* Check-in/Check-out Column */}
      <td>
        <ActionButtons
          showCheckin={actions.showCheckin}
          showCheckout={actions.showCheckout}
          disableCheckout={actions.checkoutDisabled}
          onCheckoutClick={() => onCheckInOut(asset)}
          onCheckinClick={() => onCheckInOut(asset)}
        />
      </td>

      <td>
        <ActionButtons
          showView
          showEdit
          showDelete
          onViewClick={() => onViewClick(asset.id)}
          editPath={`/assets/edit/${asset.id}`}
          onDeleteClick={() => onDeleteClick(asset.id)}
        />
      </td>
    </tr>
  );
}

export default function Assets() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Assets state
  const [assets, setAssets] = useState([]);

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [filteredData, setFilteredData] = useState(assets);

  // Load success message from navigation state
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      setTimeout(() => {
        setSuccessMessage("");
        window.history.replaceState({}, document.title);
      }, 5000);
    }
  }, [location]);

  // Fetch assets on component mount
  useEffect(() => {
    const loadAssets = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAllAssets();
        setAssets(data);
        setFilteredData(data);
        setErrorMessage("");
      } catch (error) {
        console.error("Error fetching assets:", error);
        setErrorMessage("Failed to load assets. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();
  }, []);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // default page size or number of items per page

  // selection state
  const [selectedIds, setSelectedIds] = useState([]);

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

  const handleDeleteSuccess = (deletedIds) => {
    if (Array.isArray(deletedIds)) {
      // Bulk delete
      setAssets((prev) => prev.filter((p) => !deletedIds.includes(p.id)));
      setFilteredData((prev) => prev.filter((p) => !deletedIds.includes(p.id)));
      setSuccessMessage(`${deletedIds.length} assets deleted successfully!`);
      setSelectedIds([]);
    } else {
      // Single delete
      setAssets((prev) => prev.filter((p) => p.id !== deletedIds));
      setFilteredData((prev) => prev.filter((p) => p.id !== deletedIds));
      setSuccessMessage("Asset deleted successfully!");
    }
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  const handleDeleteError = (error) => {
    setErrorMessage(
      error.response?.data?.detail || "Failed to delete product(s)."
    );
    setTimeout(() => setErrorMessage(""), 5000);
  };

  const handleViewClick = (assetId) => {
    navigate(`/assets/view/${assetId}`);
  };

  const handleEditClick = (assetId) => {
    navigate(`/assets/edit/${assetId}`);
  };

  // Apply filters to data (base: all assets)
  const applyFilters = (filters) => {
    let filtered = [...assets];

    // Filter by Asset ID
    if (filters.assetId && filters.assetId.trim() !== "") {
      filtered = filtered.filter((asset) =>
        asset.displayed_id.toLowerCase().includes(filters.assetId.toLowerCase())
      );
    }

    // Filter by Asset Model
    if (filters.assetModel && filters.assetModel.trim() !== "") {
      filtered = filtered.filter((asset) =>
        asset.product?.toLowerCase().includes(filters.assetModel.toLowerCase())
      );
    }

    // Filter by Status
    if (filters.status) {
      filtered = filtered.filter(
        (asset) =>
          asset.status.toLowerCase() === filters.status.value.toLowerCase()
      );
    }

    // Filter by Supplier
    if (filters.supplier) {
      filtered = filtered.filter((asset) =>
        asset.supplier
          ?.toLowerCase()
          .includes(filters.supplier.label.toLowerCase())
      );
    }

    // Filter by Location
    if (filters.location) {
      filtered = filtered.filter((asset) =>
        asset.location
          ?.toLowerCase()
          .includes(filters.location.label.toLowerCase())
      );
    }

    // Filter by Asset Name
    if (filters.assetName && filters.assetName.trim() !== "") {
      filtered = filtered.filter((asset) =>
        asset.name.toLowerCase().includes(filters.assetName.toLowerCase())
      );
    }

    // Filter by Serial Number
    if (filters.serialNumber && filters.serialNumber.trim() !== "") {
      filtered = filtered.filter((asset) =>
        asset.serial_number
          ?.toLowerCase()
          .includes(filters.serialNumber.toLowerCase())
      );
    }

    // Filter by Warranty Expiration
    if (
      filters.warrantyExpiration &&
      filters.warrantyExpiration.trim() !== ""
    ) {
      filtered = filtered.filter(
        (asset) => asset.warranty_expiration_date === filters.warrantyExpiration
      );
    }

    // Filter by Order Number
    if (filters.orderNumber && filters.orderNumber.trim() !== "") {
      filtered = filtered.filter((asset) =>
        asset.order_number
          ?.toLowerCase()
          .includes(filters.orderNumber.toLowerCase())
      );
    }

    // Filter by Purchase Date
    if (filters.purchaseDate && filters.purchaseDate.trim() !== "") {
      filtered = filtered.filter(
        (asset) => asset.purchase_date === filters.purchaseDate
      );
    }

    // Filter by Purchase Cost
    if (filters.purchaseCost && filters.purchaseCost.trim() !== "") {
      const cost = parseFloat(filters.purchaseCost);
      filtered = filtered.filter((asset) => asset.purchase_cost === cost);
    }

    return filtered;
  };

  const applyFiltersAndSearch = (filters, term) => {
    let filtered = applyFilters(filters || {});

    if (term && term.trim() !== "") {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          (asset.name && asset.name.toLowerCase().includes(lowerTerm)) ||
          (asset.displayed_id &&
            asset.displayed_id.toLowerCase().includes(lowerTerm)) ||
          (asset.category && asset.category.toLowerCase().includes(lowerTerm))
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

  const handleExport = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : assets;
    exportToExcel(dataToExport, "Assets_Records.xlsx");
  };

  const handleCheckInOut = (asset) => {
    const assetId = asset.id;
    const assetDisplayId = asset.asset_id;
    const assetName = asset.name;
    const checkoutId = asset.active_checkout;
    const ticketId = asset.ticket_details?.id;

    if (checkoutId) {
      navigate(`/assets/check-in/${assetId}`, {
        state: { assetDisplayId, assetName, checkoutId, ticketId },
      });
    } else {
      navigate(`/assets/check-out/${asset.id}`, {
        state: { assetDisplayId, assetName, assetId, ticketId },
      });
    }
  };

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      {isDeleteModalOpen && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          closeModal={closeDeleteModal}
          actionType={deleteTarget ? "delete" : "bulk-delete"}
          entityType="asset"
          targetId={deleteTarget}
          targetIds={selectedIds}
          onSuccess={handleDeleteSuccess}
          onError={handleDeleteError}
        />
      )}

      {/* Asset Filter Modal */}
      <AssetFilterModal
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
              <h2 className="h2">Assets ({filteredData.length})</h2>
              <section className="table-actions">
                {/* Bulk edit and delete buttons only when checkboxes selected */}
                {selectedIds.length > 0 && (
                  <>
                    <MediumButtons
                      type="edit"
                      onClick={() =>
                        navigate("/assets/bulk-edit", {
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
                    console.log("🔘 DIRECT FILTER BUTTON CLICKED!");
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
                      onClick={() => navigate("/assets/registration")}
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
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="no-data-message">
                        Loading assets...
                      </td>
                    </tr>
                  ) : paginatedAssets.length > 0 ? (
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
                      <td colSpan={10} className="no-data-message">
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
