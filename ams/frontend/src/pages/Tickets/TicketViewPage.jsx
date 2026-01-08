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
    // console.log("Deleting ticket:", ticket.id);
    closeDeleteModal();
    navigate("/approved-tickets");
  };

  const handleRegister = () => {
      // Navigate to asset registration page with pre-filled data
      // navigate('/assets/registration', { state: { ticket } });
      alert("Navigate to Registration Page");
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  // Dynamic Fields Rendering
  const renderTicketFields = () => {
      const commonFields = [
          { label: "Ticket Number", value: ticket.ticket_number },
          { label: "Category", value: ticket.category },
          { label: "Sub-Category", value: ticket.sub_category },
          { label: "Subject", value: ticket.subject },
          { label: "Employee", value: ticket.employeeName || ticket.requestor_details?.name },
          { label: "Status", value: <Status type={ticket.is_resolved ? 'resolved' : 'pending'} name={ticket.is_resolved ? 'Resolved' : 'Approved'} /> }
      ];

      let specificFields = [];

      switch (ticket.ticket_type) {
          case 'asset_request':
              specificFields = [
                  { label: "Asset Model Number", value: ticket.asset_model_number },
                  { label: "Manufacturer", value: ticket.manufacturer },
                  { label: "Supplier", value: ticket.supplier },
                  { label: "Quantity", value: ticket.quantity },
                  { label: "Total Cost", value: ticket.total_cost_request },
                  { label: "Justification", value: ticket.justification },
                  { label: "Specs", value: ticket.specs ? JSON.stringify(ticket.specs) : '-' }
              ];
              break;
          case 'asset_registration':
              specificFields = [
                  { label: "Asset Model Name", value: ticket.asset_model_name },
                  { label: "Serial Number", value: ticket.asset_serial_number },
                  { label: "Order Number", value: ticket.order_number },
                  { label: "Purchase Cost", value: ticket.purchase_cost },
                  { label: "Purchased Date", value: ticket.purchased_date },
                  { label: "Warranty Exp", value: ticket.warranty_exp },
                  { label: "Location", value: ticket.location },
                  { label: "Department", value: ticket.department },
                  { label: "Notes", value: ticket.justification }
              ];
              break;
          case 'asset_checkout':
              specificFields = [
                  { label: "Asset ID", value: ticket.asset_id_number },
                  { label: "Serial Number", value: ticket.asset_serial_number },
                  { label: "Checkout Date", value: ticket.checkout_date },
                  { label: "Return Date", value: ticket.expected_return_date },
                  { label: "Condition", value: ticket.condition },
                  { label: "Location", value: ticket.location },
                  { label: "Notes", value: ticket.notes }
              ];
              break;
          case 'asset_checkin':
              specificFields = [
                  { label: "Asset ID", value: ticket.asset_id_number },
                  { label: "Serial Number", value: ticket.asset_serial_number },
                  { label: "Checkin Date", value: ticket.checkin_date },
                  { label: "Ref Ticket", value: ticket.checkout_ticket_reference },
                  { label: "Condition", value: ticket.condition },
                  { label: "Notes", value: ticket.notes }
              ];
              break;
          case 'asset_repair':
              specificFields = [
                  { label: "Repair Name", value: ticket.repair_name },
                  { label: "Repair Type", value: ticket.repair_type },
                  { label: "Asset ID", value: ticket.asset_id_number },
                  { label: "Start Date", value: ticket.start_date },
                  { label: "End Date", value: ticket.end_date },
                  { label: "Cost", value: ticket.cost },
                  { label: "Supplier", value: ticket.supplier },
                  { label: "Notes", value: ticket.notes }
              ];
              break;
          case 'asset_incident':
              specificFields = [
                  { label: "Asset ID", value: ticket.asset_id_number },
                  { label: "Incident Date", value: ticket.incident_date },
                  { label: "Last Location", value: ticket.last_location },
                  { label: "Schedule Audit", value: ticket.schedule_audit },
                  { label: "Damage Desc", value: ticket.damage_description },
                  { label: "Notes", value: ticket.notes }
              ];
              break;
          case 'asset_disposal':
              specificFields = [
                  { label: "Command Note", value: ticket.command_note },
                  { label: "Notes", value: ticket.notes }
              ];
              break;
          default:
              break;
      }

      return [...commonFields, ...specificFields];
  };

  // Create action buttons
  const actionButtons = (
    <div className="ticket-vertical-action-buttons">
      {ticket.ticket_type === 'asset_registration' && !ticket.is_resolved && (
          <button
            type="button"
            className="ticket-action-btn ticket-checkin-btn" // Reusing style
            onClick={handleRegister}
          >
            <i className="fas fa-plus"></i>
            Register Asset
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
    { label: "About" },
    { label: "Attachments" } // Added placeholder for file attachments
  ];

  // Custom About tab content for Ticket Details
  const ticketDetailsContent = (
    <div className="ticket-about-section">
      <div className="ticket-details-section">
        <h3 className="ticket-section-header">Ticket Details ({ticket.ticket_type?.replace('asset_', '').toUpperCase()})</h3>
        <div className="ticket-details-grid">
            {renderTicketFields().map((field, index) => (
                <div className="ticket-detail-row" key={index}>
                    <label>{field.label}</label>
                    <span>{field.value || '-'}</span>
                </div>
            ))}
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
        {activeTab === 0 ? ticketDetailsContent : <div className="p-4">No attachments</div>}
      </DetailedViewPage>
    </>
  );
}

export default TicketViewPage;
