import "../../styles/AccessoriesViewModal.css";
import SampleImage from "../../assets/img/dvi.jpeg";
import CloseIcon from "../../assets/icons/close.svg";

export default function AccessoriesViewModal({ id, closeModal }) {
  return (
    <main className="accessories-view-modal">
      <div className="overlay" onClick={closeModal}></div>
      <div className="content">
        <button onClick={closeModal}>
          <img src={CloseIcon} alt="" />
        </button>
        <fieldset>
          <img src={SampleImage} alt="" />
          <h2>{id}</h2>
        </fieldset>
        <div>
          <section className="left-content">
            <fieldset>
              <label htmlFor="available">Avalable</label>
              <span>
                <p>3/5</p>
                <progress value={3} max={5}></progress>
              </span>
            </fieldset>
            <fieldset>
              <label htmlFor="model-number">Model Number</label>
              <p>-</p>
            </fieldset>
            <fieldset>
              <label htmlFor="">Purchase Date</label>
              <p>March 12, 2025</p>
            </fieldset>
            <fieldset>
              <label htmlFor="">Purchase Cost</label>
              <p>PHP 25,000</p>
            </fieldset>
            <fieldset>
              <label htmlFor="">Min Quantity</label>
              <p>2</p>
            </fieldset>
          </section>
          <section className="right-content">
            <fieldset>
              <label htmlFor="">Category</label>
              <p>Cables</p>
            </fieldset>
            <fieldset>
              <label htmlFor="">Supplier</label>
              <p>-</p>
            </fieldset>
            <fieldset>
              <label htmlFor="">Location</label>
              <p>Makati</p>
            </fieldset>
            <fieldset>
              <label htmlFor="">Notes</label>
              <p>-</p>
            </fieldset>
          </section>
        </div>
      </div>
    </main>
  );
}
