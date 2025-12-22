import "../../styles/AssetViewModal.css";
import "../../styles/StandardizedButtons.css";
import CloseIcon from "../../assets/icons/close.svg";
import DefaultImage from "../../assets/img/default-image.jpg";
import { useNavigate } from "react-router-dom";
import AssetsMockupData from "../../data/mockData/assets/assets-mockup-data.json";

export default function AssetViewModal({ asset, closeModal }) {
  const navigate = useNavigate();

  const imageSrc = asset.image
  ? `https://assets-service-production.up.railway.app${asset.image}`
  : DefaultImage;
  const assetId = asset.displayed_id;
  const productName = asset.product_info?.name || "-";
  const serialNumber = asset.serialNumber || asset.serial_number || "-";
  const purchaseDate = asset.purchaseDate || asset.purchase_date || "-";
  const warrantyExpiration = asset.warrantyExpiration || asset.warranty_expiration || "-";
  const orderNumber = asset.orderNumber || asset.order_number || "-";
  const purchaseCost = asset.purchaseCost || asset.purchase_cost
    ? `PHP ${asset.purchaseCost || asset.purchase_cost}`
    : "-";
  const location = asset.location || "-";
  const notes = asset.notes || "-";
  const status = asset.status_info?.name || "-";
  const supplier = asset.supplier || "-";
  
  return (
    <main className="asset-view-modal">
      <div className="overlay" onClick={closeModal}></div>
      <div className="content">
        <button onClick={closeModal} className="close-button">
          <img src={CloseIcon} alt="Close" />
        </button>

        <fieldset className="header-fieldset">
          <img src={imageSrc} alt="Asset" onError={(e) => { e.target.src = DefaultImage; }} />
          <h2>{productName}</h2>
        </fieldset>

        <div className="details-container">
          <section className="left-content">
            <fieldset className="detail-item">
              <label>Asset ID</label>
              <p>{assetId}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Product</label>
              <p>{productName}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Serial Number</label>
              <p>{serialNumber}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Status</label>
              <p>{status}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Location</label>
              <p>{location}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Purchase Date</label>
              <p>{purchaseDate}</p>
            </fieldset>
          </section>

          <section className="right-content">
            <fieldset className="detail-item">
              <label>Supplier</label>
              <p>{supplier}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Warranty Expiration</label>
              <p>{warrantyExpiration}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Order Number</label>
              <p>{orderNumber}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Purchase Cost</label>
              <p>{purchaseCost}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Notes</label>
              <p>{notes}</p>
            </fieldset>
          </section>
        </div>

        {/* Related Assets Section */}
        <div className="related-assets-section">
          <h3>Related Assets</h3>
          <div className="related-assets-list">
            {AssetsMockupData.filter(a => a.name === asset.name && a.id !== asset.id).length > 0 ? (
              <ul>
                {AssetsMockupData.filter(a => a.name === asset.name && a.id !== asset.id).map((relatedAsset) => (
                  <li key={relatedAsset.id}>
                    <span className="asset-id">{relatedAsset.displayed_id}</span>
                    <span className="asset-name">{relatedAsset.name}</span>
                    <span className="asset-status">{relatedAsset.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-related-assets">No related assets found.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}