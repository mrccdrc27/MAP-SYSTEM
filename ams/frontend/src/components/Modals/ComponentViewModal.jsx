import "../../styles/ComponentViewModal.css";
import CloseIcon from "../../assets/icons/close.svg";
import DefaultImage from "../../assets/img/default-image.jpg";

export default function ComponentViewModal({ component, closeModal }) {
  const imageSrc = component.image || DefaultImage;
  const componentName = component.componentName || "-";
  const category = component.category || "-";
  const manufacturer = component.manufacturer || "-";
  const supplier = component.supplier || "-";
  const location = component.location || "-";
  const modelNumber = component.modelNumber || "-";
  const orderNumber = component.orderNumber || "-";
  const purchaseDate = component.purchaseDate || "-";
  const purchaseCost = component.purchaseCost 
    ? `PHP ${component.purchaseCost}`
    : "-";
  const quantity = component.quantity || "-";
  const minimumQuantity = component.minimumQuantity || "-";
  const notes = component.notes || "-";
  
  return (
    <main className="component-view-modal">
      <div className="overlay" onClick={closeModal}></div>
      <div className="content">
        <button onClick={closeModal} className="close-button">
          <img src={CloseIcon} alt="Close" />
        </button>

        <fieldset className="header-fieldset">
          <img src={imageSrc} alt="Component" onError={(e) => { e.target.src = DefaultImage; }} />
          <h2>{componentName}</h2>
        </fieldset>

        <div className="details-container">
          <section className="left-content">
            <fieldset className="detail-item">
              <label>Component Name</label>
              <p>{componentName}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Category</label>
              <p>{category}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Manufacturer</label>
              <p>{manufacturer}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Supplier</label>
              <p>{supplier}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Location</label>
              <p>{location}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Model Number</label>
              <p>{modelNumber}</p>
            </fieldset>
          </section>

          <section className="right-content">
            <fieldset className="detail-item">
              <label>Order Number</label>
              <p>{orderNumber}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Purchase Date</label>
              <p>{purchaseDate}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Purchase Cost</label>
              <p>{purchaseCost}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Quantity</label>
              <p>{quantity}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Minimum Quantity</label>
              <p>{minimumQuantity}</p>
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
