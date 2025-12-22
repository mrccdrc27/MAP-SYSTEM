import "../../styles/AssetViewModal.css";
import CloseIcon from "../../assets/icons/close.svg";
import DefaultImage from "../../assets/img/default-image.jpg";

export default function ProductViewModal({ product, closeModal }) {
  const imageSrc = product.image
    ? `https://assets-service-production.up.railway.app${product.image}`
    : DefaultImage;

  const name = product.name || "-";
  const modelNumber = product.model_number || "-";
  const category = product.category || "-";
  const depreciation = product.depreciation || "-";
  const endOfLife = product.end_of_life || "-";
  const manufacturer = product.manufacturer || "-";
  const supplier = product.supplier || "-";
  const purchaseCost = product.default_purchase_cost
    ? `PHP ${product.default_purchase_cost}`
    : "-";
  const minQty = product.minimum_quantity || "-";
  const os = product.operating_system || "-";
  const notes = product.notes || "-";

  return (
    <main className="asset-view-modal">
      <div className="overlay" onClick={closeModal}></div>
      <div className="content">
        <button onClick={closeModal} className="close-button">
          <img src={CloseIcon} alt="Close" />
        </button>

        <fieldset className="header-fieldset">
          <img
            src={imageSrc}
            alt="Product"
            onError={(e) => {
              e.target.src = DefaultImage;
            }}
          />
          <h2>{name}</h2>
        </fieldset>

        <div className="details-container">
          <section className="left-content">
            <fieldset className="detail-item">
              <label>Model Number</label>
              <p>{modelNumber}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Category</label>
              <p>{category}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Depreciation</label>
              <p>{depreciation}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>End of Life</label>
              <p>{endOfLife}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Minimum Quantity</label>
              <p>{minQty}</p>
            </fieldset>
          </section>

          <section className="right-content">
            <fieldset className="detail-item">
              <label>Manufacturer</label>
              <p>{manufacturer}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Default Supplier</label>
              <p>{supplier}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Purchase Cost</label>
              <p>{purchaseCost}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Operating System</label>
              <p>{os}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Notes</label>
              <p>{notes}</p>
            </fieldset>
          </section>
        </div>
      </div>
    </main>
  );
}
