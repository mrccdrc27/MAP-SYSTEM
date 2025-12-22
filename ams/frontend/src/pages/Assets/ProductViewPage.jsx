import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import DetailedViewPage from "../../components/DetailedViewPage/DetailedViewPage";
import DefaultImage from "../../assets/img/default-image.jpg";
import "../../styles/Products/ProductViewPage.css";
import "../../styles/Assets/AssetViewPage.css";
import "../../styles/Assets/Assets.css";
import MediumButtons from "../../components/buttons/MediumButtons";
import ConfirmationModal from "../../components/Modals/DeleteModal";
import Alert from "../../components/Alert";
import SystemLoading from "../../components/Loading/SystemLoading";

import { getProductDetails, getProductTabs } from "../../data/mockData/products/productDetailsData";
import Status from "../../components/Status";
import ActionButtons from "../../components/ActionButtons";
import Pagination from "../../components/Pagination";
import { exportToExcel } from "../../utils/exportToExcel";
import { useAuth } from "../../context/AuthContext";
import AssetFilterModal from "../../components/Modals/AssetFilterModal";
import { fetchProductById, fetchAssetsByProduct } from "../../services/assets-service";

function ProductViewPage() {
  const { isAdmin } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [manufacturer, setManufacturer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Assets table state
  const [productAssets, setProductAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Filter modal state for Assets tab
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});

  // Alert state for actions
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isAssetDeleteModalOpen, setAssetDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);

  useEffect(() => {
    const loadProductData = async () => {
      setIsLoading(true);
      try {
        // Get product from API
        const apiProduct = await fetchProductById(id);

        if (apiProduct) {
          setProduct(apiProduct);
          setManufacturer(apiProduct.manufacturer_details);

          // Use assets directly from apiProduct response
          const assets = apiProduct.assets || [];
          setProductAssets(assets);
          setFilteredAssets(assets);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductData();
  }, [id, location.state]);

  if (isLoading) {
    return <SystemLoading />;
  }

  if (!product) {
    return (
      <>
        <NavBar />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>Product not found</h2>
        </div>
      </>
    );
  }

  const imageSrc = product.image || DefaultImage;

  const tabs = getProductTabs();

  // Apply filters from AssetFilterModal to this product's assets
  const applyAssetFilters = (data, filters) => {
    let filtered = [...data];

    // Filter by Asset ID
    if (filters.assetId && filters.assetId.trim() !== "") {
      filtered = filtered.filter((asset) =>
        asset.displayed_id?.toLowerCase().includes(filters.assetId.toLowerCase())
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
      filtered = filtered.filter((asset) =>
        asset.status?.toLowerCase() === filters.status.value.toLowerCase()
      );
    }

    // Filter by Supplier
    if (filters.supplier) {
      filtered = filtered.filter((asset) =>
        asset.supplier?.toLowerCase().includes(filters.supplier.label.toLowerCase())
      );
    }

    // Filter by Location
    if (filters.location) {
      filtered = filtered.filter((asset) =>
        asset.location?.toLowerCase().includes(filters.location.label.toLowerCase())
      );
    }

    // Filter by Asset Name
    if (filters.assetName && filters.assetName.trim() !== "") {
      filtered = filtered.filter((asset) =>
        asset.name?.toLowerCase().includes(filters.assetName.toLowerCase())
      );
    }

    // Filter by Serial Number
    if (filters.serialNumber && filters.serialNumber.trim() !== "") {
      filtered = filtered.filter((asset) =>
        asset.serial_number?.toLowerCase().includes(filters.serialNumber.toLowerCase())
      );
    }

    // Filter by Warranty Expiration
    if (filters.warrantyExpiration && filters.warrantyExpiration.trim() !== "") {
      filtered = filtered.filter((asset) =>
        asset.warranty_expiration_date === filters.warrantyExpiration
      );
    }

    // Filter by Order Number
    if (filters.orderNumber && filters.orderNumber.trim() !== "") {
      filtered = filtered.filter((asset) =>
        asset.order_number?.toLowerCase().includes(filters.orderNumber.toLowerCase())
      );
    }

    // Filter by Purchase Date
    if (filters.purchaseDate && filters.purchaseDate.trim() !== "") {
      filtered = filtered.filter((asset) => asset.purchase_date === filters.purchaseDate);
    }

    // Filter by Purchase Cost
    if (filters.purchaseCost && filters.purchaseCost.trim() !== "") {
      const cost = parseFloat(filters.purchaseCost);
      filtered = filtered.filter((asset) => asset.purchase_cost === cost);
    }

    return filtered;
  };

  // Combine modal filters and search term
  const filterAndSearchAssets = (assets, filters, term) => {
    let filtered = applyAssetFilters(assets, filters || {});

    if (term && term.trim() !== "") {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter((asset) =>
        (asset.name && asset.name.toLowerCase().includes(lowerTerm)) ||
        (asset.displayed_id && asset.displayed_id.toLowerCase().includes(lowerTerm)) ||
        (asset.category && asset.category.toLowerCase().includes(lowerTerm))
      );
    }

    return filtered;
  };

  // Handle filter apply from modal
  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
    const filtered = filterAndSearchAssets(productAssets, filters, searchTerm);
    setFilteredAssets(filtered);
    setCurrentPage(1);
  };

  // Handle search
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setCurrentPage(1);
    const filtered = filterAndSearchAssets(productAssets, appliedFilters, term);
    setFilteredAssets(filtered);
  };

  // Handle export
  const handleExport = () => {
    const dataToExport = filteredAssets.length > 0 ? filteredAssets : [];
    exportToExcel(dataToExport, "Product_Assets.xlsx");
  };

  // Handle check-in/check-out
  const handleCheckInOut = (asset, action) => {
    const baseImage = asset.image
      ? `https://assets-service-production.up.railway.app${asset.image}`
      : DefaultImage;

    const checkout = asset.checkoutRecord;
    const isCheckIn = action === 'checkin' || asset.isCheckInOrOut === "Check-In";

    if (isCheckIn) {
      navigate(`/assets/check-in/${asset.id}`, {
        state: {
          id: asset.id,
          assetId: asset.displayed_id,
          product: asset.product,
          image: baseImage,
          employee: checkout?.requestor || "Not assigned",
          empLocation: checkout?.requestor_location || "Unknown",
          checkOutDate: checkout?.checkout_date || "Unknown",
          returnDate: checkout?.return_date || "Unknown",
          checkoutId: checkout?.checkout_ref_id || "Unknown",
          checkinDate: checkout?.checkin_date || "Unknown",
          condition: checkout?.condition || "Unknown",
          ticketId: checkout?.ticket_id,
          fromAsset: true,
        },
      });
    } else {
      navigate(`/assets/check-out/${asset.id}`, {
        state: {
          id: asset.id,
          assetId: asset.displayed_id,
          product: asset.product,
          image: baseImage,
          ticketId: checkout?.ticket_id,
          empId: checkout?.requestor_id,
          employee: checkout?.requestor || "Not assigned",
          empLocation: checkout?.requestor_location || "Unknown",
          checkoutDate: checkout?.checkout_date || "Unknown",
          returnDate: checkout?.return_date || "Unknown",
          fromAsset: true,
        },
      });
    }
  };

  // Handle view asset
  const handleViewAsset = (asset) => {
    navigate(`/assets/view/${asset.id}`);
  };

  // Handle delete asset - open confirmation modal and track which asset to delete
  const handleDeleteAsset = (assetId) => {
    setAssetToDelete(assetId);
    setAssetDeleteModalOpen(true);
  };

  const closeAssetDeleteModal = () => {
    setAssetDeleteModalOpen(false);
    setAssetToDelete(null);
  };

  const handleAssetDeleteSuccess = (deletedId) => {
    setProductAssets((prev) => prev.filter((asset) => asset.id !== deletedId));
    setFilteredAssets((prev) => prev.filter((asset) => asset.id !== deletedId));
    setSuccessMessage("Asset deleted successfully!");
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  const handleAssetDeleteError = (error) => {
    setErrorMessage(error.response?.data?.detail || "Failed to delete asset.");
    setTimeout(() => setErrorMessage(""), 5000);
  };

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

    showCheckout:
      status === "pending" || status === "deployable",

    checkoutDisabled:
      (status === "pending" || status === "deployable") && !hasTicket,
  };
}

  // Pagination logic
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

  // Create custom Assets tab content
  const assetsTabContent = (
    <div className="product-assets-tab-wrapper">
      {/* Table Header with Title and Actions */}
      <section className="product-assets-header">
        <h2 className="product-assets-title">Assets ({filteredAssets.length})</h2>
        <section className="product-assets-actions">
          <input
            type="search"
            placeholder="Search..."
            className="product-assets-search"
            value={searchTerm}
            onChange={handleSearch}
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
          {isAdmin() && (
            <MediumButtons
              type="new"
              navigatePage="/assets/registration"
            />
          )}
        </section>
      </section>

      {/* Table Section */}
      <section className="assets-table-section">
        <table>
          <thead>
            <tr>
              <th>IMAGE</th>
              <th>ID</th>
              <th>NAME</th>
              <th>SERIAL</th>
              <th>STATUS</th>
              <th>CHECK-IN / CHECK-OUT</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssets.length > 0 ? (
              paginatedAssets.map((asset) => {
                const baseImage = asset.image || DefaultImage;
                
                const actions = getActionState(asset);

                return (
                  <tr key={asset.id}>
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
                    <td>{asset.name || 'N/A'}</td>
                    <td>{asset.serial_number || 'N/A'}</td>
                    <td>
                      <Status type={asset.status_details?.type?.toLowerCase() || 'unknown'} name={asset.status_details?.name || 'Unknown'} />
                    </td>
                    <td>
                      <ActionButtons
                        showCheckout={actions.showCheckout}
                        showCheckin={actions.showCheckin}
                        onCheckoutClick={() => handleCheckInOut(asset, 'checkout')}
                        onCheckinClick={() => handleCheckInOut(asset, 'checkin')}
                      />
                    </td>
                    <td>
                      <ActionButtons
                        showEdit
                        showDelete
                        showView
                        editPath={`/assets/edit/${asset.id}`}
                        editState={{ asset }}
                        onDeleteClick={() => handleDeleteAsset(asset.id)}
                        onViewClick={() => handleViewAsset(asset)}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="no-data-message">
                  No Assets Found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Pagination */}
      <section className="product-assets-pagination">
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredAssets.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </section>
    </div>
  );

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
  };

  const handleProductDeleteSuccess = () => {
    navigate("/products", {
      state: { successMessage: "Product deleted successfully!" }
    });
  };

  const handleProductDeleteError = (error) => {
    setErrorMessage(error.response?.data?.detail || "Failed to delete product.");
    setTimeout(() => setErrorMessage(""), 5000);
  };

  // Button action handlers
  const handleCloneClick = () => {
    if (product) {
      navigate(`/products/edit/${product.id}`, {
        state: { product, isClone: true }
      });
    }
  };

  const handleEditClick = () => {
    navigate(`/products/edit/${product.id}`, {
      state: { product }
    });
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  // Create action buttons with vertical layout - Clone, Edit, Delete
  const actionButtons = (
    <div className="vertical-action-buttons">
      <button
        type="button"
        className="action-btn clone-btn"
        onClick={handleCloneClick}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="white"
          style={{ marginRight: '8px' }}
        >
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
        </svg>
        Clone
      </button>
      <button
        type="button"
        className="action-btn edit-btn"
        onClick={handleEditClick}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="white"
          style={{ marginRight: '8px' }}
        >
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
        Edit
      </button>
      <MediumButtons
        type="delete"
        onClick={handleDeleteClick}
      />
    </div>
  );

  return (
    <>
      <NavBar />
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      {isDeleteModalOpen && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          closeModal={closeDeleteModal}
          actionType="delete"
          entityType="product"
          targetId={product?.id}
          onSuccess={handleProductDeleteSuccess}
          onError={handleProductDeleteError}
        />
      )}

      {isAssetDeleteModalOpen && (
        <ConfirmationModal
          isOpen={isAssetDeleteModalOpen}
          closeModal={closeAssetDeleteModal}
          actionType="delete"
          entityType="asset"
          targetId={assetToDelete}
          onSuccess={handleAssetDeleteSuccess}
          onError={handleAssetDeleteError}
        />
      )}

      <AssetFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApplyFilter={handleApplyFilter}
        initialFilters={appliedFilters}
      />
      <DetailedViewPage
        {...getProductDetails(product)}
        assetImage={imageSrc}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actionButtons={actionButtons}
        customTabContent={activeTab === 1 ? assetsTabContent : null}
      >
        {/* Tab Content */}
        {activeTab === 0 && (
          // About Tab - No QR, Only Details Section
          <div className="about-section">
            <div className="asset-details-section">
              <h3 className="section-header">Asset Model Details</h3>
              <div className="asset-details-grid">
                <div className="detail-row">
                  <label>Product Name</label>
                  <span>{product.name || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>Model Number</label>
                  <span>{product.model_number || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>Category</label>
                  <span>{product.category_details?.name || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>Manufacturer</label>
                  <span>{product.manufacturer_details?.name || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>Depreciation</label>
                  <span>{product.depreciation_details?.name || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>End of Life</label>
                  <span>{product.end_of_life || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>Default Purchase Cost</label>
                  <span>{product.default_purchase_cost ? `₱${Number(product.default_purchase_cost).toLocaleString()}` : "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>Default Supplier</label>
                  <span>{product.default_supplier_details?.name || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>Minimum Quantity</label>
                  <span>{product.minimum_quantity || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>CPU</label>
                  <span>{product.cpu || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>GPU</label>
                  <span>{product.gpu || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>Operating System</label>
                  <span>{product.os || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>RAM</label>
                  <span>{product.ram || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>Screen Size</label>
                  <span>{product.size || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <label>Storage Size</label>
                  <span>{product.storage || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailedViewPage>
    </>
  );
}

export default ProductViewPage;