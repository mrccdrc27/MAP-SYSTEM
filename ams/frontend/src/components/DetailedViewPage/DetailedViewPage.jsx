import "../../styles/DetailedViewPage.css";
import Status from "../Status";
import DefaultProfile from "../../assets/img/default-profile.svg";
import DefaultImage from "../../assets/img/default-image.jpg";
import Pagination from "../Pagination";
import ActionButtons from "../ActionButtons";
import TableBtn from "../buttons/TableButtons";
import MediumButtons from "../buttons/MediumButtons";
import UploadButton from "../buttons/UploadButton";
import ConfirmationModal from "../Modals/DeleteModal";
import UploadModal from "../Modals/UploadModal";
import View from "../Modals/View";
import Footer from "../Footer";
import Alert from "../Alert";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mockData from "../../data/mockData/detailedviewpage/asset-view-page.json";

const { historyData, checkoutLogData, componentsData, repairsData, auditsDuplicateData, attachmentsData } = mockData;

export default function DetailedViewPage({
  breadcrumbRoot,
  breadcrumbCurrent,
  breadcrumbRootPath,
  title,
  subtitle,
  assetImage,
  assetTag,
  status,
  statusType = "ready-to-deploy",
  company,
  checkoutDate,
  nextAuditDate,
  manufacturer,
  manufacturerUrl,
  supportUrl,
  supportPhone,
  category,
  model,
  modelNo,
  productName,
  serialNumber,
  assetType,
  supplier,
  depreciationType,
  fullyDepreciatedDate,
  location,
  warrantyDate,
  endOfLife,
  orderNumber,
  purchaseDate,
  purchaseCost,
  // Smartphone specific
  imeiNumber,
  connectivity,
  // Laptop specific
  ssdEncryptionStatus,
  cpu,
  gpu,
  operatingSystem,
  ram,
  screenSize,
  storageSize,
  notes,
  createdAt,
  updatedAt,
  tabs = [],
  activeTab = 0,
  actionButtons,
  checkedOutTo,
  onTabChange,
  children,
  customTabContent = null,
  showCheckoutLog = false
}) {
  const navigate = useNavigate();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(5);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [activeAuditTab, setActiveAuditTab] = useState('pending');
  const [isAuditDeleteModalOpen, setAuditDeleteModalOpen] = useState(false);
  const [auditDeleteId, setAuditDeleteId] = useState(null);
  const [isAuditViewModalOpen, setAuditViewModalOpen] = useState(false);
  const [selectedAuditItem, setSelectedAuditItem] = useState(null);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [attachments, setAttachments] = useState(attachmentsData || []);
  const [attachmentSuccessMessage, setAttachmentSuccessMessage] = useState("");
  const [repairs, setRepairs] = useState(repairsData || []);
  const [isRepairDeleteModalOpen, setRepairDeleteModalOpen] = useState(false);
  const [repairDeleteIndex, setRepairDeleteIndex] = useState(null);
  const [repairSuccessMessage, setRepairSuccessMessage] = useState("");

  // Generate QR code when component mounts
  useEffect(() => {
    const generateQRCode = () => {
      try {
        // Create structured asset details for QR code
        const qrData = `Asset ID: ${assetTag}
Asset Serial Number: ${serialNumber || 'N/A'}
Asset Model: ${productName || model}
Category: ${category}
Supplier: ${supplier || 'N/A'}
Manufacturer: ${manufacturer}
Depreciation Type: ${depreciationType || 'N/A'}
Warranty: ${warrantyDate || 'N/A'}
End of Life: ${endOfLife || 'N/A'}
Order Number: ${orderNumber || 'N/A'}
Purchase Date: ${purchaseDate || 'N/A'}
Purchase Cost: ${purchaseCost || 'N/A'}${assetType === 'Smartphone' ? `
IMEI Number: ${imeiNumber || 'N/A'}
Connectivity: ${connectivity || 'N/A'}
Operating System: ${operatingSystem || 'N/A'}
Storage Size: ${storageSize || 'N/A'}` : ''}${assetType === 'Laptop' ? `
SSD Encryption Status: ${ssdEncryptionStatus || 'N/A'}
CPU: ${cpu || 'N/A'}
GPU: ${gpu || 'N/A'}
RAM: ${ram || 'N/A'}
Screen Size: ${screenSize || 'N/A'}
Operating System: ${operatingSystem || 'N/A'}
Storage Size: ${storageSize || 'N/A'}` : ''}
Notes: ${notes || 'N/A'}
Created At: ${createdAt || 'N/A'}
Updated At: ${updatedAt || 'N/A'}`;

        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&ecc=L&data=${encodeURIComponent(qrData)}`;

        setQrCodeUrl(qrApiUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, [assetTag, serialNumber, productName, model, category, manufacturer, location]);

  // Handle Print QR functionality
  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    const assetInfo = {
      assetId: assetTag,
      serialNumber: serialNumber || 'N/A',
      productName: productName || model,
      propertyOf: 'MAP Active Philippines'
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Asset QR Code - ${assetTag}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .qr-container {
              border: 2px solid #333;
              padding: 20px;
              display: inline-block;
              margin: 20px;
            }
            .qr-container img {
              width: 200px;
              height: 200px;
              display: block;
            }
            .asset-info {
              margin-top: 15px;
              font-size: 14px;
            }
            .property-text {
              font-style: italic;
              margin-top: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrCodeUrl}" alt="Asset QR Code" onload="window.print();" onerror="window.print();" />
            <div class="asset-info">
              <div><strong>Asset ID:</strong> ${assetInfo.assetId}</div>
              <div><strong>Serial Number:</strong> ${assetInfo.serialNumber}</div>
              <div><strong>Product:</strong> ${assetInfo.productName}</div>
              <div class="property-text">${assetInfo.propertyOf}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  return (
    <>
    <main className="detailed-view-layout">
      {/* Breadcrumb Navigation */}
      <section className="detailed-breadcrumb">
        <ul>
          <li>
            <a href={breadcrumbRootPath}>{breadcrumbRoot}</a>
          </li>
          <li>{breadcrumbCurrent}</li>
        </ul>
      </section>

      {/* Page Title */}
      <section className="detailed-title-section">
        <div className="title-with-image">
          <img
            src={assetImage || DefaultImage}
            alt="Asset"
            className="asset-title-image"
            onError={(e) => { e.target.src = DefaultImage; }}
          />
          <div className="title-text">
            <h1>{title}</h1>
            {subtitle && <span className="detailed-subtitle">{subtitle}</span>}
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="detailed-tabs">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab-button ${index === activeTab ? 'active' : ''}`}
            onClick={() => onTabChange && onTabChange(index)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {/* Main Content Area */}
      <section className={`detailed-content-wrapper ${activeTab === 3 || activeTab === 4 || activeTab === 5 ? 'full-width' : ''}`}>
        {/* Left Content - Asset Details */}
        <section className={`detailed-main-content ${activeTab === 3 || activeTab === 4 || activeTab === 5 ? 'hidden' : ''}`}>
          {/* About Asset Section - Only render default if no children provided */}
          {activeTab === 0 && !children && (
            <div className="about-section">
              {/* QR Section */}
              <div className="qr-section">
                <div className="qr-code-container">
                  <div className="qr-code-placeholder">
                    <div className="qr-code">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="Asset QR Code"
                          className="qr-code-image"
                        />
                      ) : (
                        <div className="qr-placeholder">Generating QR Code...</div>
                      )}
                    </div>
                  </div>
                  <div className="qr-info">
                    <div className="qr-detail">
                      <strong>Serial Number:</strong> {serialNumber || assetTag}
                    </div>
                    <div className="qr-detail">
                      <strong>Asset ID:</strong> {assetTag}
                    </div>
                    <div className="qr-detail property-text">
                      Property of MAP Active Philippines
                    </div>
                    <button className="print-qr-btn" onClick={handlePrintQR}>
                      <i className="fas fa-print"></i> Print QR
                    </button>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="asset-details-section">
                  <h3 className="section-header">Details</h3>
                  <div className="asset-details-grid">
                    <div className="detail-row">
                      <label>Asset ID</label>
                      <span>{assetTag}</span>
                    </div>

                    <div className="detail-row">
                      <label>Asset Serial Number</label>
                      <span>{serialNumber || 'N/A'}</span>
                    </div>

                    <div className="detail-row">
                      <label>Asset Model / Product Name</label>
                      <span>{productName || model}</span>
                    </div>

                    <div className="detail-row">
                      <label>Category</label>
                      <span>{category}</span>
                    </div>

                    <div className="detail-row">
                      <label>Supplier</label>
                      <span>{supplier || 'N/A'}</span>
                    </div>

                    <div className="detail-row">
                      <label>Manufacturer</label>
                      <div className="manufacturer-links">
                        <div>
                          <span>{manufacturer}</span>
                        </div>
                        {manufacturerUrl && (
                          <div>
                            <a href={manufacturerUrl} target="_blank" rel="noopener noreferrer">
                              <i className="fas fa-external-link-alt"></i> {manufacturerUrl}
                            </a>
                          </div>
                        )}
                        {supportUrl && (
                          <div>
                            <a href={supportUrl} target="_blank" rel="noopener noreferrer">
                              <i className="fas fa-external-link-alt"></i> {supportUrl}
                            </a>
                          </div>
                        )}
                        {supportPhone && (
                          <div>
                            <a href={`tel:${supportPhone}`}>
                              <i className="fas fa-phone"></i> {supportPhone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="detail-row">
                      <label>Depreciation Type</label>
                      <span>{depreciationType || 'N/A'}</span>
                    </div>

                    <div className="detail-row">
                      <label>Fully Depreciated</label>
                      <span>{fullyDepreciatedDate || 'N/A'}</span>
                    </div>

                    <div className="detail-row">
                      <label>Location</label>
                      <span>{location || 'N/A'}</span>
                    </div>

                    <div className="detail-row">
                      <label>Warranty</label>
                      <span>{warrantyDate || 'N/A'}</span>
                    </div>

                    <div className="detail-row">
                      <label>End of Life</label>
                      <span>{endOfLife || 'N/A'}</span>
                    </div>

                    <div className="detail-row">
                      <label>Order Number</label>
                      <span>{orderNumber || 'N/A'}</span>
                    </div>

                    <div className="detail-row">
                      <label>Purchase Date</label>
                      <span>{purchaseDate || 'N/A'}</span>
                    </div>

                    <div className="detail-row">
                      <label>Purchase Cost</label>
                      <span>{purchaseCost || 'N/A'}</span>
                    </div>

                    {/* Smartphone specific fields */}
                    {assetType === 'Smartphone' && (
                      <>
                        <div className="detail-row">
                          <label>IMEI Number</label>
                          <span>{imeiNumber || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                          <label>Connectivity</label>
                          <span>{connectivity || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                          <label>Operating System</label>
                          <span>{operatingSystem || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                          <label>Storage Size</label>
                          <span>{storageSize || 'N/A'}</span>
                        </div>
                      </>
                    )}

                    {/* Laptop specific fields */}
                    {assetType === 'Laptop' && (
                      <>
                        <div className="detail-row">
                          <label>SSD Encryption Status</label>
                          <span>{ssdEncryptionStatus || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                          <label>CPU</label>
                          <span>{cpu || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                          <label>GPU</label>
                          <span>{gpu || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                          <label>Operating System</label>
                          <span>{operatingSystem || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                          <label>RAM</label>
                          <span>{ram || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                          <label>Screen Size</label>
                          <span>{screenSize || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                          <label>Storage Size</label>
                          <span>{storageSize || 'N/A'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

            </div>
          )}
          {/* Custom Children Content */}
          {children}

          {/* Additional Fields Section (always shown on About tab) */}
          {activeTab === 0 && (
            <div className="additional-fields-section">
              <h3 className="section-header">Additional Fields</h3>
              <div className="asset-details-grid">
                <div className="detail-row">
                  <label>Notes</label>
                  <span>{notes || 'N/A'}</span>
                </div>

                <div className="detail-row">
                  <label>Created At</label>
                  <span>{createdAt || 'N/A'}</span>
                </div>

                <div className="detail-row">
                  <label>Updated At</label>
                  <span>{updatedAt || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Other tab content will go here */}
          {activeTab !== 0 && activeTab !== 1 && activeTab !== 2 && activeTab !== 3 && activeTab !== 4 && activeTab !== 5 && activeTab !== 6 && (
            <div className="tab-content">
              <p>No data available.</p>
            </div>
          )}
        </section>

        {/* Checkout Log Tab - Outside of detailed-main-content */}
        {activeTab === 1 && showCheckoutLog && (() => {
          const normalizedCheckoutLog = checkoutLogData || [];

          if (!normalizedCheckoutLog.length) {
            return (
              <section className="additional-fields-section checkout-log-section">
                <h3 className="section-header">Checkout Log</h3>
                <div className="checkout-log-list">
                  <div className="no-data-message">No Checkout Log Found.</div>
                </div>
              </section>
            );
          }

          return (
            <section className="additional-fields-section checkout-log-section">
              <h3 className="section-header">Checkout Log</h3>
              <div className="checkout-log-list">
                {normalizedCheckoutLog.map((entry, index) => (
                  <div className="checkout-log-item" key={index}>
                    <div className="checkout-log-marker-column">
                      <div className="checkout-log-marker" />
                      {index !== normalizedCheckoutLog.length - 1 && (
                        <div className="checkout-log-line" />
                      )}
                    </div>
                    <div className="checkout-log-content">
                      <div className="checkout-log-title">
                        <span className="checkout-log-action">{entry.actionLabel}</span>{" "}
                        <span className="checkout-log-target">{entry.target}</span>
                      </div>
                      <div className="checkout-log-details">
                        {entry.checkoutDate && (
                          <div className="checkout-log-detail-row">
                            <span className="label">Checkout Date:</span>
                            <span>{entry.checkoutDate}</span>
                          </div>
                        )}
                        {entry.checkinDate && (
                          <div className="checkout-log-detail-row">
                            <span className="label">Checkin Date:</span>
                            <span>{entry.checkinDate}</span>
                          </div>
                        )}
                        {entry.expectedReturnDate && (
                          <div className="checkout-log-detail-row">
                            <span className="label">Expected Return Date:</span>
                            <span>{entry.expectedReturnDate}</span>
                          </div>
                        )}
                        {entry.status && (
                          <div className="checkout-log-detail-row">
                            <span className="label">Status:</span>
                            <span>{entry.status}</span>
                          </div>
                        )}
                        {entry.condition && (
                          <div className="checkout-log-detail-row">
                            <span className="label">Condition:</span>
                            <span>{entry.condition}</span>
                          </div>
                        )}
                        <div className="checkout-log-detail-row">
                          <span className="label">Photos:</span>
                          <span>{entry.photos || "-"}</span>
                        </div>
                        <div className="checkout-log-detail-row">
                          <span className="label">Notes:</span>
                          <span>{entry.notes || "-"}</span>
                        </div>
                        <div className="checkout-log-detail-row">
                          <span className="label">User:</span>
                          <span>{entry.user || "-"}</span>
                        </div>
                        {entry.confirmationEmailSent && (
                          <div className="checkout-log-detail-row">
                            <span className="label">Confirmation Email Sent:</span>
                            <span>{entry.confirmationEmailSent}</span>
                          </div>
                        )}
                        {entry.confirmationEmailNote && (
                          <div className="checkout-log-detail-row">
                            <span className="label">Confirmation Email Note:</span>
                            <span>{entry.confirmationEmailNote}</span>
                          </div>
                        )}
                        {entry.digitalSignatureEnabled && (
                          <div className="checkout-log-detail-row">
                            <span className="label">Digital Signature Enabled:</span>
                            <span>{entry.digitalSignatureEnabled}</span>
                          </div>
                        )}
                        {entry.digitalSignatureCompleted && (
                          <div className="checkout-log-detail-row">
                            <span className="label">Digital Signature Completed:</span>
                            <span>{entry.digitalSignatureCompleted}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* History Tab - Outside of detailed-main-content */}
        {activeTab === 2 && !customTabContent && (() => {

          const normalizedHistoryData = historyData || [];
          const filteredHistoryData = normalizedHistoryData.filter((item) => {
            if (!historySearchTerm) return true;
            const term = historySearchTerm.toLowerCase();
            return (
              (item.date && item.date.toLowerCase().includes(term)) ||
              (item.user && item.user.toLowerCase().includes(term)) ||
              (item.actionDetails && item.actionDetails.toLowerCase().includes(term))
            );
          });

          const startIndex = (historyCurrentPage - 1) * historyPageSize;
          const endIndex = startIndex + historyPageSize;
          const paginatedData = filteredHistoryData.slice(startIndex, endIndex);

          return (
            <div className="history-tab-wrapper">
              <div className="history-tab-header">
                <h3>History</h3>
                <div className="history-header-controls">
                  <input
                    type="search"
                    placeholder="Search history..."
                    value={historySearchTerm}
                    onChange={(e) => {
                      setHistorySearchTerm(e.target.value);
                      setHistoryCurrentPage(1);
                    }}
                    className="history-search-input"
                  />
                </div>
              </div>
              <section className="history-table-section">
                <table>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>USER</th>
                      <th>ACTION DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((item, index) => (
                        <tr key={index}>
                          <td>{item.date}</td>
                          <td>{item.user}</td>
                          <td>{item.actionDetails}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="no-data-message">
                          No History Found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
              <section className="history-pagination-section">
                <Pagination
                  currentPage={historyCurrentPage}
                  pageSize={historyPageSize}
                  totalItems={filteredHistoryData.length}
                  onPageChange={setHistoryCurrentPage}
                  onPageSizeChange={setHistoryPageSize}
                />
              </section>
            </div>
          );
        })()}

        {/* Custom Tab Content - Parent controls which tab uses this via the value passed */}
        {customTabContent && customTabContent}

        {/* Components Tab - Outside of detailed-main-content */}
        {activeTab === 3 && (() => {

          const normalizedComponents = componentsData || [];

          return (
            <div className="components-tab-wrapper">
              <div className="components-tab-header">
                <h3>Components</h3>
              </div>
              <section className="components-detail-table-section">
                <table>
                  <thead>
                    <tr>
                      <th>COMPONENT</th>
                      <th>CHECKOUT DATE</th>
                      <th>USER</th>
                      <th>NOTES</th>
                      <th>CHECKIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedComponents.length > 0 ? (
                      normalizedComponents.map((item, index) => (
                        <tr key={index}>
                          <td>{item.component}</td>
                          <td>{item.checkoutDate}</td>
                          <td>{item.user}</td>
                          <td>{item.notes}</td>
                          <td>
                            <ActionButtons
                              showCheckin
                              onCheckinClick={() => {
                                // Navigate to component check-in page
                                navigate(`/components/check-in/${item.id}`, {
                                  state: {
                                    item,
                                    componentName: item.componentName || item.component
                                  }
                                });
                              }}
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="no-data-message">
                          No Components Found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            </div>
          );
        })()}

        {/* Repairs Tab - Outside of detailed-main-content */}
        {activeTab === 4 && (() => {

          const normalizedRepairs = repairs || [];

          const openRepairDeleteModal = (index) => {
            setRepairDeleteIndex(index);
            setRepairDeleteModalOpen(true);
          };

          const closeRepairDeleteModal = () => {
            setRepairDeleteModalOpen(false);
            setRepairDeleteIndex(null);
          };

          const confirmRepairDelete = () => {
            if (repairDeleteIndex !== null) {
              setRepairs((prevRepairs) =>
                prevRepairs.filter((_, i) => i !== repairDeleteIndex)
              );
              setRepairSuccessMessage("Repair deleted successfully.");
              setTimeout(() => setRepairSuccessMessage(""), 5000);
            }
            closeRepairDeleteModal();
          };


          return (
            <>
              {isRepairDeleteModalOpen && (
                <ConfirmationModal
                  closeModal={closeRepairDeleteModal}
                  actionType="delete"
                  onConfirm={confirmRepairDelete}
                />
              )}


              <div className="repairs-tab-wrapper">
                <div className="repairs-tab-header">
                  <h3>Repairs</h3>
                  <div className="repairs-header-controls">
                    <MediumButtons
                      type="new"
                      navigatePage="/repairs/registration"
                      previousPage="/asset-view"
                    />
                  </div>
                </div>
                {repairSuccessMessage && (
                  <Alert message={repairSuccessMessage} type="success" />
                )}
                <section className="repairs-detail-table-section">
                  <table>
                    <thead>
                      <tr>
                        <th>ASSET</th>
                        <th>TYPE</th>
                        <th>NAME</th>
                        <th>START DATE</th>
                        <th>END DATE</th>
                        <th>COST</th>
                        <th>STATUS</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedRepairs.length > 0 ? (
                        normalizedRepairs.map((item, index) => {
                          const repairForEdit = {
                            asset: item.asset,
                            supplier: "",
                            type: item.type,
                            name: item.name,
                            start_date: item.startDate,
                            end_date: item.endDate,
                            cost: item.cost,
                            notes: item.notes || "",
                          };

                          return (
                            <tr key={index}>
                              <td>{item.asset}</td>
                              <td>{item.type}</td>
                              <td>{item.name}</td>
                              <td>{item.startDate}</td>
                              <td>{item.endDate || 'Ongoing'}</td>
                              <td>{item.cost}</td>
                              <td>
                                <Status
                                  value={index}
                                  type={item.status === 'Completed' ? 'ready-to-deploy' : 'in-progress'}
                                  name={item.status}
                                />
                              </td>
                              <td>
                                <ActionButtons
                                  showEdit
                                  showDelete
                                  editPath={`/repairs/edit/${index + 1}`}
                                  editState={{ repair: repairForEdit }}
                                  onDeleteClick={() => openRepairDeleteModal(index)}
                                />
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="no-data-message">
                            No Repairs Found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>
              </div>
            </>
          );
        })()}

        {/* Attachments Tab - Outside of detailed-main-content */}
        {activeTab === 6 && (() => {
          const handleUploadClick = () => {
            setUploadModalOpen(true);
          };

          const closeUploadModal = () => {
            setUploadModalOpen(false);
          };

          const handleUpload = async (formData) => {
            // Handle file upload logic here
            console.log("Uploading file:", formData);
            // You can send this to your backend API
          };

          const normalizedAttachments = attachments || [];

          const handleAttachmentDelete = (index) => {
            setAttachments((prevAttachments) =>
              prevAttachments.filter((_, i) => i !== index)
            );
            setAttachmentSuccessMessage("Attachment deleted successfully.");
            setTimeout(() => setAttachmentSuccessMessage(""), 5000);
          };

          return (
            <>
              {isUploadModalOpen && (
                <UploadModal
                  isOpen={isUploadModalOpen}
                  onClose={closeUploadModal}
                  onUpload={handleUpload}
                  title="Upload Attachment"
                />
              )}
              <div className="attachments-tab-wrapper">
                <div className="attachments-tab-header">
                  <h3>Attachments</h3>
                  <div className="attachments-header-controls">
                    <UploadButton
                      onClick={handleUploadClick}
                      label="Upload"
                    />
                  </div>
                </div>
                {attachmentSuccessMessage && (
                  <Alert message={attachmentSuccessMessage} type="success" />
                )}
                <section className="attachments-table-section">
                  <table>
                    <thead>
                      <tr>
                        <th>UPLOADED</th>
                        <th>FILE</th>
                        <th>NOTES</th>
                        <th>DELETE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedAttachments.length > 0 ? (
                        normalizedAttachments.map((item, index) => (
                          <tr key={index}>
                            <td>{item.uploaded}</td>
                            <td>{item.file}</td>
                            <td>{item.notes}</td>
                            <td>
                              <ActionButtons
                                showDelete
                                onDeleteClick={() => handleAttachmentDelete(index)}
                              />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="no-data-message">
                            No Attachments Found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>
              </div>
            </>
          );
        })()}

        {/* Audits Tab (Position 5) - Duplicated Audits Table with Navigation */}
        {activeTab === 5 && (() => {

          const currentAuditData = auditsDuplicateData[activeAuditTab] || [];

          const openAuditDeleteModal = (id) => {
            setAuditDeleteId(id);
            setAuditDeleteModalOpen(true);
          };

          const closeAuditDeleteModal = () => {
            setAuditDeleteModalOpen(false);
            setAuditDeleteId(null);
          };

          const confirmAuditDelete = () => {
            console.log("Deleting audit ID:", auditDeleteId);
            closeAuditDeleteModal();
          };

          const handleAuditViewClick = (item) => {
            setSelectedAuditItem(item);
            setAuditViewModalOpen(true);
          };

          const closeAuditViewModal = () => {
            setAuditViewModalOpen(false);
            setSelectedAuditItem(null);
          };

          return (
            <>
              {isAuditDeleteModalOpen && (
                <ConfirmationModal
                  closeModal={closeAuditDeleteModal}
                  actionType="delete"
                  onConfirm={confirmAuditDelete}
                />
              )}

              {isAuditViewModalOpen && selectedAuditItem && (
                <View
                  title={`${selectedAuditItem.asset.name} : ${selectedAuditItem.date}`}
                  data={[
                    { label: "Due Date", value: selectedAuditItem.date },
                    { label: "Asset", value: `${selectedAuditItem.asset.displayed_id} - ${selectedAuditItem.asset.name}` },
                    { label: "Created At", value: selectedAuditItem.created_at },
                    { label: "Notes", value: selectedAuditItem.notes },
                  ]}
                  closeModal={closeAuditViewModal}
                />
              )}

              <div className="audits-duplicate-tab-wrapper">
                <div className="audits-duplicate-tab-header">
                  <h3>Audits</h3>
                  <div className="audits-duplicate-header-controls">
                    <div className="audit-duplicate-tabs">
                      <button
                        className={`audit-duplicate-tab-btn ${activeAuditTab === 'pending' ? 'active' : ''}`}
                        onClick={() => { setActiveAuditTab('pending'); setAuditsCurrentPage(1); }}
                      >
                        Due to be Audited (0)
                      </button>
                      <button
                        className={`audit-duplicate-tab-btn ${activeAuditTab === 'overdue' ? 'active' : ''}`}
                        onClick={() => { setActiveAuditTab('overdue'); setAuditsCurrentPage(1); }}
                      >
                        Overdue for Audit (0)
                      </button>
                      <button
                        className={`audit-duplicate-tab-btn ${activeAuditTab === 'scheduled' ? 'active' : ''}`}
                        onClick={() => { setActiveAuditTab('scheduled'); setAuditsCurrentPage(1); }}
                      >
                        Scheduled Audit (0)
                      </button>
                      <button
                        className={`audit-duplicate-tab-btn ${activeAuditTab === 'completed' ? 'active' : ''}`}
                        onClick={() => { setActiveAuditTab('completed'); setAuditsCurrentPage(1); }}
                      >
                        Completed Audit (0)
                      </button>
                    </div>
                    <div className="audit-duplicate-action-buttons">
                      <MediumButtons
                        type="schedule-audits"
                        navigatePage="/audits/schedule"
                        previousPage="/asset-view"
                      />
                      <MediumButtons
                        type="perform-audits"
                        navigatePage="/audits/new"
                        previousPage="/asset-view"
                      />
                    </div>
                  </div>
                </div>
                <section className="audits-duplicate-table-section">
                  <table>
                    <thead>
                      <tr>
                        <th>DUE DATE</th>
                        <th>ASSET</th>
                        <th>CREATED</th>
                        <th>AUDIT</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAuditData.length > 0 ? (
                        currentAuditData.map((item) => (
                          <tr key={item.id}>
                            <td>{item.date}</td>
                            <td>{item.asset.displayed_id} - {item.asset.name}</td>
                            <td>{new Date(item.created_at).toLocaleDateString()}</td>
                            <td>
                              <TableBtn
                                type="audit"
                                navigatePage="/audits/new"
                                data={item}
                                previousPage="/asset-view"
                              />
                            </td>
                            <td>
                              <ActionButtons
                                showEdit
                                showDelete
                                showView
                                editPath={`edit/${item.id}`}
                                editState={{ item, previousPage: "/asset-view" }}
                                onDeleteClick={() => openAuditDeleteModal(item.id)}
                                onViewClick={() => handleAuditViewClick(item)}
                              />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="no-data-message">No audits found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>
              </div>
            </>
          );
        })()}

        {/* Right Sidebar - Action Buttons */}
        {(actionButtons || checkedOutTo) && (
          <aside className="detailed-sidebar">
            {/* Action Buttons Section */}
            {actionButtons && (
              <div className="action-buttons-section">
                {actionButtons}
              </div>
            )}

            {/* Checked Out To Section */}
            {checkedOutTo && (
              <div className="checked-out-section">
                <h3>Checked Out To</h3>
                <div className="checked-out-info">
                  <div className="user-avatar">
                    <img
                      src={DefaultProfile}
                      alt="User Profile"
                      className="profile-icon"
                    />
                  </div>
                  <div className="user-details">
                    <div className="user-name">{checkedOutTo.name}</div>
                    <div className="user-email">{checkedOutTo.email}</div>
                    <div className="checkout-date">Checkout Date: {checkedOutTo.checkoutDate}</div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </section>
    </main>
    <Footer />
    </>
  );
}
