import "../../styles/ExportModal.css";
import CloseIcon from "../../assets/icons/close.svg";

export default function ExportModal({ closeModal, download }) {
  return (
    <main className="export-modal">
      <div className="overlay" onClick={closeModal}></div>
      <div className="content">
        <button className="close-button" onClick={closeModal}>
          <img src={CloseIcon} alt="" />
        </button>
        <p>Your file has been generated.</p>
        <button onClick={closeModal}>Download</button>
      </div>
    </main>
  );
}
