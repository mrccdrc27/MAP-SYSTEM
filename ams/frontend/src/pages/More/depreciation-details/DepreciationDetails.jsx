import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../../components/NavBar";
import DetailedViewPage from "../../../components/DetailedViewPage/DetailedViewPage";
import MediumButtons from "../../../components/buttons/MediumButtons";
import { getDepreciationDetails, getDepreciationTabs } from "../../../data/mockData/more/depreciationDetailsData";
import "../../../styles/more/depreciation/DepreciationDetails.css";
import ConfirmationModal from "../../../components/Modals/DeleteModal";

function DepreciationDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Retrieve the "depreciation" data value passed from the navigation state.
  const depreciationDetails = location.state?.depreciation;

  if (!depreciationDetails) {
    return (
      <>
        <NavBar />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>Depreciation not found</h2>
        </div>
      </>
    );
  }

  // Get tabs configuration from data
  const tabs = getDepreciationTabs();

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
  };

  const confirmDelete = () => {
    // Handle depreciation deletion logic here
    console.log("Deleting depreciation:", depreciationDetails.id);
    closeDeleteModal();
    navigate("/More/Depreciations");
  };

  // Button action handlers
  const handleEditClick = () => {
    navigate(`/More/Depreciations/Edit/${depreciationDetails.id}`, {
      state: { depreciation: depreciationDetails }
    });
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  // Create action buttons with vertical layout
  const actionButtons = (
    <div className="vertical-action-buttons">
      <button
        type="button"
        className="action-btn edit-btn"
        onClick={handleEditClick}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="white"
          style={{ marginRight: '8px' }}
        >
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
        Edit
      </button>
      <MediumButtons
        type="delete"
        onClick={handleDeleteClick}
      />
    </div>
  );

  // Render custom About section for depreciations
  const aboutContent = (
    <div className="about-section">
      {/* Details Section */}
      <div className="asset-details-section">
        <h3 className="section-header">Details</h3>
        <div className="asset-details-grid">
          <div className="detail-row">
            <label>Depreciation Name</label>
            <span>{depreciationDetails.name || 'N/A'}</span>
          </div>

          <div className="detail-row">
            <label>Duration</label>
            <span>{depreciationDetails.duration || 'N/A'}</span>
          </div>

          <div className="detail-row">
            <label>Minimum Value</label>
            <span>{depreciationDetails.minimum_value || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <NavBar />
      {isDeleteModalOpen && (
        <ConfirmationModal
          closeModal={closeDeleteModal}
          actionType="delete"
          onConfirm={confirmDelete}
        />
      )}
      <DetailedViewPage
        {...getDepreciationDetails(depreciationDetails)}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actionButtons={actionButtons}
      >
        {activeTab === 0 && aboutContent}
      </DetailedViewPage>
    </>
  );
}

export default DepreciationDetails;

