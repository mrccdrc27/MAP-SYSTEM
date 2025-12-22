import "../../styles/TicketViewModal.css";
import "../../styles/StandardizedButtons.css";
import CloseIcon from "../../assets/icons/close.svg";
import { useNavigate } from "react-router-dom";

export default function TicketViewModal({ ticket, closeModal }) {
  const navigate = useNavigate();

  // Always use this image for the modal
  const ticketImage = "/src/assets/img/dvi.jpeg";

  // Format booleans and dates nicely
  const formatDate = (date) => date ? new Date(date).toLocaleString() : "-";
  const formatBool = (val) => val ? "Yes" : "No";

  return (
    <main className="ticket-view-modal">
      <div className="overlay" onClick={closeModal}></div>
      <div className="content">
        <button onClick={closeModal} className="close-button">
          <img src={CloseIcon} alt="Close" />
        </button>

        <fieldset className="header-fieldset">
          <img src={ticketImage} alt="Ticket" />
          <h2>{ticket.subject}</h2>
        </fieldset>

        <div className="details-container">
          <section className="left-content">
            <fieldset className="detail-item">
              <label>Ticket Number</label>
              <p>{ticket.id}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Asset Name</label>
              <p>{ticket.assetName || "-"}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Subject</label>
              <p>{ticket.subject || "-"}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Description</label>
              <p>{ticket.description || "-"}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Requestor</label>
              <p>{ticket.requestor || "-"}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Requestor Location</label>
              <p>{ticket.requestorLocation || "-"}</p>
            </fieldset>
          </section>

          <section className="right-content">
            <fieldset className="detail-item">
              <label>Checkout Date</label>
              <p>{formatDate(ticket.checkoutDate)}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Return Date</label>
              <p>{formatDate(ticket.returnDate)}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Created At</label>
              <p>{formatDate(ticket.createdAt)}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Updated At</label>
              <p>{formatDate(ticket.updatedAt)}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Is Resolved</label>
              <p>{formatBool(ticket.isResolved)}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Condition</label>
              <p>{ticket.condition || "-"}</p>
            </fieldset>
          </section>
        </div>

        <div className="action-buttons">
          <button
            className="checkout-btn"
            onClick={() => {
              closeModal();
              navigate(`/assets/check-out/${ticket.assetId}`, {
                state: {
                  id: ticket.assetId,
                  assetId: ticket.assetId,
                  product: ticket.assetName || "Generic Asset",
                  image: ticketImage,
                  ticketId: ticket.id,
                  empId: ticket.requestorId,
                  employee: ticket.requestor || "Not assigned",
                  empLocation: ticket.requestorLocation || "Unknown",
                  checkoutDate: ticket.checkoutDate || "Unknown",
                  returnDate: ticket.returnDate || "Unknown",
                  fromAsset: true,
                },
              });
            }}
          >
            Check-Out
          </button>
        </div>
      </div>
    </main>
  );
}
