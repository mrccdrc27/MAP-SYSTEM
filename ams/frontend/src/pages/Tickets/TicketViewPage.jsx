import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import DetailedViewPage from "../../components/DetailedViewPage/DetailedViewPage";
import DefaultImage from "../../assets/img/default-image.jpg";
import "../../styles/Tickets/TicketViewPage.css";
import ConfirmationModal from "../../components/Modals/DeleteModal";
import MediumButtons from "../../components/buttons/MediumButtons";
import Status from "../../components/Status";
import Alert from "../../components/Alert";
import { fetchAssetById, fetchAssetCheckoutById } from "../../services/assets-service";

function TicketViewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ticket, asset } = location.state || {};

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const assetImage = asset?.image || DefaultImage;

  if (!ticket) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Ticket not found</h2>
      </div>
    );
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
  };

  const confirmDelete = () => {
    console.log("Deleting ticket:", ticket.id);
    closeDeleteModal();
    navigate("/approved-tickets");
  };

  const handleCheckOut = async () => {
    try {
      const asset = await fetchAssetById(ticket.asset);
      navigate(`/assets/check-out/${ticket.asset}`, {
        state: { ticket, asset, employeeName: ticket.employeeName, fromAsset: false },
      });
    } catch (error) {
      console.error("Failed to fetch asset data:", error);
      setErrorMessage("Failed to fetch asset data. Please try again later.");
    }
  };

  const handleCheckIn = async () => {
    try {
      const asset = await fetchAssetById(ticket.asset);
      const checkout = await fetchAssetCheckoutById(ticket.asset_checkout);
      navigate(`/assets/check-in/${ticket.asset}`, {
        state: { ticket, asset, checkout, fromAsset: false },
      });
    } catch (error) {
      console.error("Failed to fetch asset/checkout data:", error);
      setErrorMessage("Failed to fetch asset/checkout data. Please try again later.");
    }
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  // Create action buttons - show only relevant check-in/out button based on ticket type
  const actionButtons = (
    <div className="ticket-vertical-action-buttons">
      {ticket.isCheckInOrOut === "Check-Out" && (
        <button
          type="button"
          className="ticket-action-btn ticket-checkout-btn"
          onClick={handleCheckOut}
        >
          <i className="fas fa-sign-out-alt"></i>
          Check-Out
        </button>
      )}
      {ticket.isCheckInOrOut === "Check-In" && (
        <button
          type="button"
          className="ticket-action-btn ticket-checkin-btn"
          onClick={handleCheckIn}
        >
          <i className="fas fa-sign-in-alt"></i>
          Check-In
        </button>
      )}
      <MediumButtons
        type="delete"
        onClick={handleDeleteClick}
      />
    </div>
  );

  // Tabs configuration
  const tabs = [
    { label: "About" }
  ];

  // Custom About tab content for Ticket Details
  const ticketDetailsContent = (
    <div className="ticket-about-section">
      <div className="ticket-details-section">
        <h3 className="ticket-section-header">Ticket Details</h3>
        <div className="ticket-details-grid">
          <div className="ticket-detail-row">
            <label>Ticket Number</label>
            <span>{ticket.ticket_number}</span>
          </div>
          <div className="ticket-detail-row">
            <label>Type</label>
            <span>{ticket.ticket_type === 'checkout' ? 'Check-Out' : 'Check-In'}</span>
          </div>
          <div className="ticket-detail-row">
            <label>Employee</label>
            <span>{ticket.employeeName}</span>
          </div>
          <div className="ticket-detail-row">
            <label>Subject</label>
            <span>{ticket.subject}</span>
          </div>
          <div className="ticket-detail-row">
            <label>Location</label>
            <span>{ticket.location_details?.city || 'N/A'}</span>
          </div>
          <div className="ticket-detail-row">
            <label>Status</label>
            <span>
              <Status
                type={ticket.is_resolved ? 'resolved' : 'pending'}
                name={ticket.is_resolved ? 'Resolved' : 'Pending'}
              />
            </span>
          </div>
          {ticket.ticket_type === 'checkout' && (
            <>
              <div className="ticket-detail-row">
                <label>Checkout Date</label>
                <span>{ticket.checkout_date || 'N/A'}</span>
              </div>
              <div className="ticket-detail-row">
                <label>Return Date</label>
                <span>{ticket.return_date || 'N/A'}</span>
              </div>
            </>
          )}
          {ticket.ticket_type === 'checkin' && (
            <div className="ticket-detail-row">
              <label>Checkin Date</label>
              <span>{ticket.checkin_date || 'N/A'}</span>
            </div>
          )}
          <div className="ticket-detail-row">
            <label>Created</label>
            <span>{ticket.formattedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      <NavBar />
      {isDeleteModalOpen && (
        <ConfirmationModal
          closeModal={closeDeleteModal}
          actionType="delete"
          onConfirm={confirmDelete}
        />
      )}
      <DetailedViewPage
        breadcrumbRoot="Tickets"
        breadcrumbCurrent="Show Ticket"
        breadcrumbRootPath="/approved-tickets"
        title={ticket.ticket_number}
        subtitle={ticket.subject}
        assetImage={assetImage || DefaultImage}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actionButtons={actionButtons}
      >
        {ticketDetailsContent}
      </DetailedViewPage>
    </>
  );
}

export default TicketViewPage;
