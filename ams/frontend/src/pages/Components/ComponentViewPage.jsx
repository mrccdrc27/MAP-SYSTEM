import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import DetailedViewPage from "../../components/DetailedViewPage/DetailedViewPage";
import MediumButtons from "../../components/buttons/MediumButtons";
import ActionButtons from "../../components/ActionButtons";
import MockupData from "../../data/mockData/components/component-mockup-data.json";
import ActiveCheckoutData from "../../data/mockData/components/active-checkout-mockup-data.json";
import CheckinData from "../../data/mockData/components/checkin-mockup-data.json";
import { getComponentDetails, getComponentTabs } from "../../data/mockData/components/componentDetailsData";
import ConfirmationModal from "../../components/Modals/DeleteModal";

function ComponentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    // Get component from location state or find from mockup data
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
    return null; // Don't render anything while loading
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

  // Get active checkouts for this component
  const activeCheckouts = ActiveCheckoutData.filter(
    (checkout) => checkout.component === component.id
  );

  // Get check-in history for this component
  const componentHistory = CheckinData.filter((checkin) => {
    const checkout = ActiveCheckoutData.find(
      (c) => c.id === checkin.component_checkout && c.component === component.id
    );
    return !!checkout;
  }).map((checkin) => {
    const checkout = ActiveCheckoutData.find(
      (c) => c.id === checkin.component_checkout
    );
    return {
      ...checkin,
      checkout,
    };
  });

  // Custom tab content for Active Checkouts and History
  const customTabContent = activeTab === 1 ? (
    <div className="components-tab-wrapper">
      <div className="components-tab-header">
        <h3>Active Checkouts</h3>
      </div>
      <section className="components-detail-table-section">
        <table>
          <thead>
            <tr>
              <th>CHECKOUT DATE</th>
              <th>USER</th>
              <th>CHECKED OUT TO</th>
              <th>NOTES</th>
              <th>CHECKIN</th>
            </tr>
          </thead>
          <tbody>
            {activeCheckouts.length > 0 ? (
              activeCheckouts.map((checkout, index) => (
                <tr key={index}>
                  <td>{new Date(checkout.checkout_date).toLocaleDateString()}</td>
                  <td>N/A</td>
                  <td>{checkout.to_asset?.displayed_id || 'N/A'}</td>
                  <td>{checkout.notes}</td>
                  <td>
                    <ActionButtons
                      showCheckin
                      onCheckinClick={() => {
                        navigate(`/components/check-in/${component.id}`, {
                          state: {
                            item: {
                              id: component.id,
                              name: component.name,
                              available_quantity: component.available_quantity,
                              remaining_quantity: checkout.remaining_quantity,
                            },
                            componentName: component.name,
                          },
                        });
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="no-data-message">
                  No Active Checkouts Found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  ) : activeTab === 2 ? (
    <div className="components-tab-wrapper">
      <div className="components-tab-header">
        <h3>History</h3>
      </div>
      <section className="components-detail-table-section">
        <table>
          <thead>
            <tr>
              <th>CHECKIN DATE</th>
              <th>USER</th>
              <th>CHECKED OUT TO</th>
              <th>NOTES</th>
            </tr>
          </thead>
          <tbody>
            {componentHistory.length > 0 ? (
              componentHistory.map((history, index) => (
                <tr key={index}>
                  <td>{new Date(history.checkin_date).toLocaleDateString()}</td>
                  <td>{history.handled_by || 'N/A'}</td>
                  <td>{history.checkout?.to_asset?.displayed_id || 'N/A'}</td>
                  <td>{history.notes}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="no-data-message">
                  No History Found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  ) : null;

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
        customTabContent={customTabContent}
      >
        {activeTab === 0 && aboutContent}
      </DetailedViewPage>
    </>
  );
}

export default ComponentView;