import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import DetailedViewPage from "../../components/DetailedViewPage/DetailedViewPage";
import MediumButtons from "../../components/buttons/MediumButtons";
import MockupData from "../../data/mockData/components/component-mockup-data.json";
import { getComponentDetails, getComponentTabs } from "../../data/mockData/components/componentDetailsData";
import ConfirmationModal from "../../components/Modals/DeleteModal";

function ComponentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (location.state?.component) {
      setComponent(location.state.component);
    } else {
      const foundComponent = MockupData.find((c) => c.id === parseInt(id));
      if (foundComponent) {
        setComponent(foundComponent);
      }
    }
    setIsLoading(false);
  }, [id, location.state]);

  if (isLoading) {
    return null;
  }

  if (!component) {
    return (
      <>
        <NavBar />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>Component not found</h2>
        </div>
      </>
    );
  }

  const tabs = getComponentTabs();
  const componentDetails = getComponentDetails(component);

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
  };

  const confirmDelete = () => {
    console.log("Deleting component:", component.id);
    closeDeleteModal();
    navigate("/components");
  };

  const handleEditClick = () => {
    navigate(`/components/edit/${component.id}`, {
      state: { component }
    });
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

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

  const aboutContent = (
    <div className="about-section">
      <div className="component-details-section">
        <h3 className="section-header">Details</h3>
        <div className="component-details-grid">
          <div className="detail-row">
            <label>Component Name</label>
            <span>{component.name}</span>
          </div>

          <div className="detail-row">
            <label>Category</label>
            <span>{component.category}</span>
          </div>

          <div className="detail-row">
            <label>Manufacturer</label>
            <span>{component.manufacturer}</span>
          </div>

          <div className="detail-row">
            <label>Supplier</label>
            <span>{component.supplier}</span>
          </div>

          <div className="detail-row">
            <label>Model Number</label>
            <span>{component.model_number}</span>
          </div>

          <div className="detail-row">
            <label>Order Number</label>
            <span>{component.order_number}</span>
          </div>

          <div className="detail-row">
            <label>Location</label>
            <span>{component.location}</span>
          </div>

          <div className="detail-row">
            <label>Purchase Cost</label>
            <span>${component.purchase_cost?.toFixed(2)}</span>
          </div>

          <div className="detail-row">
            <label>Total Quantity</label>
            <span>{component.quantity}</span>
          </div>

          <div className="detail-row">
            <label>Available Quantity</label>
            <span>{component.available_quantity}</span>
          </div>

          <div className="detail-row">
            <label>Checked Out Quantity</label>
            <span>{component.checked_out_quantity}</span>
          </div>

          <div className="detail-row">
            <label>Minimum Quantity</label>
            <span>{component.minimum_quantity}</span>
          </div>

          <div className="detail-row">
            <label>Purchase Date</label>
            <span>{component.purchase_date}</span>
          </div>

          <div className="detail-row">
            <label>Depreciation</label>
            <span>{component.depreciation}</span>
          </div>

          <div className="detail-row">
            <label>Notes</label>
            <span>{component.notes}</span>
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
        {...componentDetails}
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

export default ComponentDetails;

