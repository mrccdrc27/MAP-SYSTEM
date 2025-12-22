import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavBar from "../../components/NavBar";
import DetailedViewPage from "../../components/DetailedViewPage/DetailedViewPage";
import DefaultImage from "../../assets/img/default-image.jpg";
import MediumButtons from "../../components/buttons/MediumButtons";
import SystemLoading from "../../components/Loading/SystemLoading";
import ConfirmationModal from "../../components/Modals/DeleteModal";
import { fetchAssetById, fetchProductById, deleteAsset } from "../../services/assets-service";
import { fetchSupplierById, fetchCategoryById, fetchManufacturerById, fetchDepreciationById } from "../../services/contexts-service";
import { fetchLocationById } from "../../services/integration-help-desk-service";
import "../../styles/Assets/AssetViewPage.css";
import "../../styles/Assets/AssetEditPage.css";

function AssetViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [product, setProduct] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [location, setLocation] = useState(null);
  const [category, setCategory] = useState(null);
  const [manufacturer, setManufacturer] = useState(null);
  const [depreciation, setDepreciation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const loadAssetDetails = async () => {
      try {
        setIsLoading(true);

        // Fetch asset data
        const assetData = await fetchAssetById(id);
        if (!assetData) {
          return;
        }
        setAsset(assetData);

        // Fetch related data in parallel
        const [productData, supplierData, locationData] = await Promise.all([
          assetData.product ? fetchProductById(assetData.product) : null,
          assetData.supplier ? fetchSupplierById(assetData.supplier) : null,
          assetData.location ? fetchLocationById(assetData.location) : null,
        ]);

        setProduct(productData);
        setSupplier(supplierData);
        setLocation(locationData);

        // If product exists, fetch category, manufacturer, and depreciation
        if (productData) {
          const [categoryData, manufacturerData, depreciationData] = await Promise.all([
            productData.category ? fetchCategoryById(productData.category) : null,
            productData.manufacturer ? fetchManufacturerById(productData.manufacturer) : null,
            productData.depreciation ? fetchDepreciationById(productData.depreciation) : null,
          ]);
          setCategory(categoryData);
          setManufacturer(manufacturerData);
          setDepreciation(depreciationData);
        }
      } catch (error) {
        console.error("Error loading asset details:", error);
        setErrorMessage("Failed to load asset details");
      } finally {
        setIsLoading(false);
      }
    };

    loadAssetDetails();
  }, [id]);

  if (isLoading) {
    return <SystemLoading />;
  }

  if (!asset) {
    return (
      <>
        <NavBar />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>Asset not found</h2>
        </div>
      </>
    );
  }

  // Build tabs with counts from API data
  const tabs = [
    { label: "About" },
    { label: "Checkout Log" },
    { label: `History (${asset.history?.length || 0})` },
    { label: `Components (${asset.components?.length || 0})` },
    { label: `Repair (${asset.repairs?.length || 0})` },
    { label: `Audits (${asset.audits?.length || 0})` },
    { label: "Attachments (0)" }
  ];

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    try {
      await deleteAsset(asset.id);
      closeDeleteModal();
      navigate("/assets", {
        state: { successMessage: "Asset deleted successfully!" },
      });
    } catch (error) {
      console.error("Error deleting asset:", error);
      setErrorMessage("Failed to delete asset");
      closeDeleteModal();
    }
  };

  const handleCloneClick = () => {
    navigate(`/assets/edit/${asset.id}`, { state: { isClone: true } });
  };

  const handleEditClick = () => {
    navigate(`/assets/edit/${asset.id}`);
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return null;
    return `₱${parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // Build asset details for DetailedViewPage
  const assetDetails = {
    breadcrumbRoot: "Assets",
    breadcrumbCurrent: "Show Asset",
    breadcrumbRootPath: "/assets",
    title: asset.name || product?.name || "Unnamed Asset",
    subtitle: `Asset ID: ${asset.asset_id}`,
    assetTag: asset.asset_id,
    status: asset.status_details?.name || "Unknown",
    statusType: asset.status_details?.type || "unknown",
    company: "Zip Technology Corp.",
    nextAuditDate: asset.audits?.[0]?.date || null,
    manufacturer: manufacturer?.name || null,
    manufacturerUrl: manufacturer?.url || null,
    supportUrl: manufacturer?.support_url || null,
    supportPhone: manufacturer?.support_phone || null,
    category: category?.name || null,
    model: product?.name || null,
    modelNo: product?.model_number || null,
    productName: asset.name || product?.name || null,
    serialNumber: asset.serial_number || null,
    supplier: supplier?.name || null,
    depreciationType: depreciation?.name || null,
    location: location?.name || null,
    warrantyDate: formatDate(asset.warranty_expiration),
    endOfLife: product?.end_of_life ? formatDate(product.end_of_life) : null,
    orderNumber: asset.order_number || null,
    purchaseDate: formatDate(asset.purchase_date),
    purchaseCost: formatCurrency(asset.purchase_cost),
    cpu: product?.cpu || null,
    gpu: product?.gpu || null,
    operatingSystem: product?.os || null,
    ram: product?.ram || null,
    screenSize: product?.screen_size || null,
    storageSize: product?.storage_size || null,
    notes: asset.notes || null,
    createdAt: asset.created_at ? new Date(asset.created_at).toLocaleString() : null,
    updatedAt: asset.updated_at ? new Date(asset.updated_at).toLocaleString() : null,
  };

  const actionButtons = (
    <div className="vertical-action-buttons">
      <button type="button" className="action-btn clone-btn" onClick={handleCloneClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ marginRight: '8px' }}>
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
        Clone
      </button>
      <button type="button" className="action-btn edit-btn" onClick={handleEditClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ marginRight: '8px' }}>
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
        Edit
      </button>
      <MediumButtons type="delete" onClick={handleDeleteClick} />
    </div>
  );

  // Get image URL
  const imageUrl = asset.image
    ? (asset.image.startsWith('http') ? asset.image : `${import.meta.env.VITE_ASSETS_API_URL}${asset.image}`)
    : DefaultImage;

  return (
    <>
      <NavBar />
      {isDeleteModalOpen && (
        <ConfirmationModal
          closeModal={closeDeleteModal}
          actionType="delete"
          onConfirm={confirmDelete}
        />
      )}
      <DetailedViewPage
        {...assetDetails}
        assetImage={imageUrl}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actionButtons={actionButtons}
        showCheckoutLog
      />
    </>
  );
}

export default AssetViewPage;