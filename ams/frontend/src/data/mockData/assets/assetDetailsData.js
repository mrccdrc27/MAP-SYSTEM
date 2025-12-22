// Asset Details Data - Contains all hardcoded asset information for DetailedViewPage
// This file maps asset data to detailed view properties

/**
 * Get detailed asset information for the DetailedViewPage
 * @param {Object} asset - The base asset object from MockupData
 * @returns {Object} - Complete asset details object
 */
export const getAssetDetails = (asset) => {
  if (!asset) return null;

  return {
    // Breadcrumb and Title
    breadcrumbRoot: "Assets",
    breadcrumbCurrent: "Show Asset",
    breadcrumbRootPath: "/assets",
    title: asset.name,
    subtitle: `Asset ID: ${asset.displayed_id}`,
    
    // Image and Status
    assetImage: asset.image,
    assetTag: asset.displayed_id,
    status: asset.status || "Ready to Deploy",
    statusType: asset.statusType || "ready-to-deploy",
    
    // Company and Dates
    company: asset.company || "Zip Technology Corp.",
    checkoutDate: asset.checkoutDate || "2025-08-15 12:00 AM",
    nextAuditDate: asset.nextAuditDate || "2025-08-19",
    
    // Manufacturer Information
    manufacturer: asset.manufacturer || "Apple",
    manufacturerUrl: asset.manufacturerUrl || "https://www.apple.com",
    supportUrl: asset.supportUrl || "https://support.apple.com",
    supportPhone: asset.supportPhone || "+1 800 136 900",
    
    // Category and Model
    category: asset.category || "Mobile Phones",
    model: asset.name || "iPhone 16 Pro Max",
    modelNo: asset.modelNo || "2129GH3221",
    
    // About Section - Basic Details
    productName: asset.name || "iPhone 16 Pro Max",
    serialNumber: asset.serialNumber || "SN123456789",
    assetType: asset.assetType || "Smartphone",
    supplier: asset.supplier || "Apple Authorized Reseller",
    
    // Depreciation Information
    depreciationType: asset.depreciationType || "Straight Line",
    fullyDepreciatedDate: asset.fullyDepreciatedDate || "2029-01-15 (4 years, 2 months, 2 weeks remaining)",
    
    // Location and Warranty
    location: asset.location || "Manila Office - IT Department",
    warrantyDate: asset.warrantyDate || "2026-01-15 (1 year, 2 months, 2 weeks remaining)",
    endOfLife: asset.endOfLife || "2029-12-31 (5 years, 1 month, 4 weeks remaining)",
    
    // Purchase Information
    orderNumber: asset.orderNumber || "PO-2024-001234",
    purchaseDate: asset.purchaseDate || "2024-01-15",
    purchaseCost: asset.purchaseCost || "₱65,990.00",
    
    // Smartphone Specific
    imeiNumber: asset.imeiNumber || "123456789012345",
    connectivity: asset.connectivity || "5G, Wi-Fi 6E, Bluetooth 5.3",
    
    // Laptop Specific
    ssdEncryptionStatus: asset.ssdEncryptionStatus || "N/A",
    cpu: asset.cpu || "A18 Pro chip",
    gpu: asset.gpu || "6-core GPU",
    operatingSystem: asset.operatingSystem || "iOS 18",
    ram: asset.ram || "8GB",
    screenSize: asset.screenSize || "6.9 inches",
    storageSize: asset.storageSize || "256GB",
    
    // Additional Information
    notes: asset.notes || "Latest flagship model with advanced camera system and titanium design. Assigned to senior developer for mobile app testing.",
    createdAt: asset.createdAt || "2024-01-15 10:30:00",
    updatedAt: asset.updatedAt || "2024-11-01 14:45:00",
  };
};

/**
 * Get checked out to information
 * @param {Object} asset - The asset object
 * @returns {Object|null} - Checked out to information or null
 */
export const getCheckedOutToInfo = (asset) => {
  if (!asset || !asset.checkoutRecord) {
    return null;
  }

  return {
    name: asset.checkedOutName || "Elias Gamboa",
    email: asset.checkedOutEmail || "garciamariaeliasgarcia@gmail.com",
    checkoutDate: asset.checkoutDate || "2025-08-15"
  };
};

/**
 * Get tabs configuration for DetailedViewPage
 * @returns {Array} - Array of tab objects
 */
export const getTabs = () => {
  return [
    { label: "About" },
    { label: "Checkout Log" },
    { label: "History" },
    { label: "Components ()" },
    { label: "Repair ()" },
    { label: "Audits ()" },
    { label: "Attachments ()" }
  ];
};

