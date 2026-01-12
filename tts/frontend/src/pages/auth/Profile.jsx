// style
import styles from "./profile.module.css";

// component
import AgentNav from "../../components/navigation/AgentNav";

// react
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

const HDTS_API_URL = import.meta.env.VITE_HELPDESK_SERVICE_URL || "http://165.22.247.50:8080/helpdesk";

// Helper to check if user is admin
const isAdminRole = (user) => {
  if (!user) return false;
  
  // Check roles array (from JWT structure)
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some(r => {
      const roleName = typeof r === 'string' ? r : (r.role || r.name || '');
      return ['Admin', 'System Admin', 'SystemAdmin'].includes(roleName);
    });
  }
  
  // Check role object
  if (user.role) {
    const roleName = typeof user.role === 'string' ? user.role : (user.role.name || '');
    return ['Admin', 'System Admin', 'SystemAdmin'].includes(roleName);
  }
  
  return false;
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  // Location management state
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({ city: '', zip_code: '' });
  const [locationError, setLocationError] = useState('');
  const [locationSuccess, setLocationSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const isAdmin = isAdminRole(user);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    if (!isAdmin) return;
    
    setLocationsLoading(true);
    try {
      const response = await axios.get(`${HDTS_API_URL}/api/locations/all/`, {
        withCredentials: true
      });
      if (response.data.success) {
        setLocations(response.data.locations || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Fallback to public endpoint
      try {
        const pubResponse = await axios.get(`${HDTS_API_URL}/api/locations/`, {
          withCredentials: true
        });
        if (pubResponse.data.success) {
          setLocations(pubResponse.data.locations || []);
        }
      } catch (e) {
        console.error('Error fetching public locations:', e);
      }
    } finally {
      setLocationsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchLocations();
    }
  }, [isAdmin, fetchLocations]);

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLocationForm(prev => ({ ...prev, [name]: value }));
    setLocationError('');
  };

  // Open modal for creating new location
  const openCreateModal = () => {
    setEditingLocation(null);
    setLocationForm({ city: '', zip_code: '' });
    setLocationError('');
    setLocationSuccess('');
    setShowLocationModal(true);
  };

  // Open modal for editing location
  const openEditModal = (location) => {
    setEditingLocation(location);
    setLocationForm({ city: location.city, zip_code: location.zip_code });
    setLocationError('');
    setLocationSuccess('');
    setShowLocationModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowLocationModal(false);
    setEditingLocation(null);
    setLocationForm({ city: '', zip_code: '' });
    setLocationError('');
  };

  // Create or update location
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    
    if (!locationForm.city.trim() || !locationForm.zip_code.trim()) {
      setLocationError('City and Zip Code are required');
      return;
    }
    
    try {
      let response;
      if (editingLocation) {
        // Update
        response = await axios.put(
          `${HDTS_API_URL}/api/locations/${editingLocation.id}/update/`,
          locationForm,
          { withCredentials: true }
        );
      } else {
        // Create
        response = await axios.post(
          `${HDTS_API_URL}/api/locations/create/`,
          locationForm,
          { withCredentials: true }
        );
      }
      
      if (response.data.success) {
        setLocationSuccess(editingLocation ? 'Location updated successfully!' : 'Location created successfully!');
        await fetchLocations();
        setTimeout(() => {
          closeModal();
          setLocationSuccess('');
        }, 1000);
      } else {
        setLocationError(response.data.error || response.data.errors?.non_field_errors?.[0] || 'Failed to save location');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      const errMsg = error.response?.data?.error || 
                     error.response?.data?.errors?.non_field_errors?.[0] ||
                     'Failed to save location';
      setLocationError(errMsg);
    }
  };

  // Delete location
  const handleDeleteLocation = async (location) => {
    try {
      const response = await axios.delete(
        `${HDTS_API_URL}/api/locations/${location.id}/delete/`,
        { withCredentials: true }
      );
      
      if (response.data.success) {
        await fetchLocations();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location');
    }
  };

  // Toggle location active status
  const handleToggleStatus = async (location) => {
    try {
      const response = await axios.post(
        `${HDTS_API_URL}/api/locations/${location.id}/toggle/`,
        {},
        { withCredentials: true }
      );
      
      if (response.data.success) {
        await fetchLocations();
      }
    } catch (error) {
      console.error('Error toggling location status:', error);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <AgentNav />
      <main className={styles.profilePage}>
        <section className={styles.ppHeader}>
          <div className={styles.ppBack} onClick={() => navigate(-1)}>
            <i className="fa fa-chevron-left"></i>
          </div>
          <h1>Profile Settings</h1>
        </section>

        <section className={styles.ppBody}>
          <div className={styles.ppAccountCont}>
            <h3>Account Details</h3>
          </div>

          <div className={styles.ppInfoWrapper}>
            <div className={styles.ppUserInfoCont}>
              <div className={styles.ppItem}>
                <label htmlFor="firstname">
                  First Name <span>*</span>
                </label>
                <input
                  type="text"
                  id="firstname"
                  placeholder="Enter first name"
                  value={user?.first_name || ""}
                  disabled
                />
              </div>

              <div className={styles.ppItem}>
                <label htmlFor="middlename">Middle Name</label>
                <input
                  type="text"
                  id="middlename"
                  placeholder="Enter middle name"
                  value={user?.middle_name || ""}
                  disabled
                />
              </div>

              <div className={styles.ppItem}>
                <label htmlFor="lastname">
                  Last Name <span>*</span>
                </label>
                <input
                  type="text"
                  id="lastname"
                  placeholder="Enter last name"
                  value={user?.last_name || ""}
                  disabled
                />
              </div>

              <div className={styles.ppItem}>
                <label htmlFor="suffix">Suffix</label>
                <input
                  type="text"
                  id="suffix"
                  placeholder="Enter suffix"
                  value={user?.suffix || ""}
                  disabled
                />
              </div>
            </div>

            <div className={styles.ppEmployeeInfoCont}>
              <div className={styles.ppItem}>
                <label htmlFor="email">
                  Email <span>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter email"
                  value={user?.email || ""}
                  disabled
                />
              </div>

              <div className={styles.ppItem}>
                <label htmlFor="role">
                  Role <span>*</span>
                </label>
                <input
                  type="text"
                  id="role"
                  placeholder="Enter role"
                  value={user?.role?.name || ""}
                  disabled
                />
              </div>

              <div className={styles.ppItem}>
                <label htmlFor="contact">
                  Contact Number <span>*</span>
                </label>
                <input
                  type="text"
                  id="contact"
                  placeholder="Enter contact"
                  value={user?.phone_number || ""}
                  disabled
                />
              </div>
            </div>
          </div>

          <button className={styles.ppButton}>Save Changes</button>
        </section>

        {/* Manage Locations Section - Admin Only */}
        {isAdmin && (
          <section className={styles.ppBody} style={{ marginTop: '30px' }}>
            <div className={styles.ppLocationHeader}>
              <h3>Manage Locations</h3>
              <button 
                className={styles.ppAddButton}
                onClick={openCreateModal}
              >
                <i className="fa fa-plus"></i> Add Location
              </button>
            </div>
            
            <p className={styles.ppLocationDesc}>
              Manage locations for Asset Check-Out ticket forms. These locations will appear in the HDTS ticket submission form.
            </p>

            {locationsLoading ? (
              <div className={styles.ppLoadingContainer}>
                <p>Loading locations...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className={styles.ppEmptyState}>
                <i className="fa fa-map-marker-alt"></i>
                <p>No locations added yet.</p>
                <p>Click "Add Location" to create your first location.</p>
              </div>
            ) : (
              <div className={styles.ppTableContainer}>
                <table className={styles.ppTable}>
                  <thead>
                    <tr>
                      <th>City</th>
                      <th>Zip Code</th>
                      <th>Display Name</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map(location => (
                      <tr key={location.id}>
                        <td>{location.city}</td>
                        <td>{location.zip_code}</td>
                        <td>{location.display_name}</td>
                        <td>
                          <span className={`${styles.ppStatus} ${location.is_active ? styles.ppStatusActive : styles.ppStatusInactive}`}>
                            {location.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.ppActions}>
                            <button 
                              className={styles.ppActionBtn}
                              onClick={() => openEditModal(location)}
                              title="Edit"
                            >
                              <i className="fa fa-edit"></i>
                            </button>
                            <button 
                              className={`${styles.ppActionBtn} ${location.is_active ? styles.ppActionDeactivate : styles.ppActionActivate}`}
                              onClick={() => handleToggleStatus(location)}
                              title={location.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <i className={`fa ${location.is_active ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                            <button 
                              className={`${styles.ppActionBtn} ${styles.ppActionDelete}`}
                              onClick={() => setDeleteConfirm(location)}
                              title="Delete"
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Location Modal */}
      {showLocationModal && (
        <div className={styles.ppModalOverlay} onClick={closeModal}>
          <div className={styles.ppModal} onClick={e => e.stopPropagation()}>
            <div className={styles.ppModalHeader}>
              <h3>{editingLocation ? 'Edit Location' : 'Add New Location'}</h3>
              <button className={styles.ppModalClose} onClick={closeModal}>
                <i className="fa fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleSaveLocation} className={styles.ppModalBody}>
              {locationError && (
                <div className={styles.ppErrorMsg}>
                  <i className="fa fa-exclamation-circle"></i> {locationError}
                </div>
              )}
              {locationSuccess && (
                <div className={styles.ppSuccessMsg}>
                  <i className="fa fa-check-circle"></i> {locationSuccess}
                </div>
              )}
              
              <div className={styles.ppItem}>
                <label htmlFor="city">City <span>*</span></label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  placeholder="Enter city name"
                  value={locationForm.city}
                  onChange={handleFormChange}
                  required
                />
              </div>
              
              <div className={styles.ppItem}>
                <label htmlFor="zip_code">Zip Code <span>*</span></label>
                <input
                  type="text"
                  id="zip_code"
                  name="zip_code"
                  placeholder="Enter zip code"
                  value={locationForm.zip_code}
                  onChange={handleFormChange}
                  required
                />
              </div>
              
              <div className={styles.ppModalActions}>
                <button type="button" className={styles.ppCancelBtn} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.ppSaveBtn}>
                  {editingLocation ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className={styles.ppModalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.ppModal} onClick={e => e.stopPropagation()}>
            <div className={styles.ppModalHeader}>
              <h3>Confirm Delete</h3>
              <button className={styles.ppModalClose} onClick={() => setDeleteConfirm(null)}>
                <i className="fa fa-times"></i>
              </button>
            </div>
            
            <div className={styles.ppModalBody}>
              <p className={styles.ppDeleteWarning}>
                <i className="fa fa-exclamation-triangle"></i>
                Are you sure you want to delete this location?
              </p>
              <p className={styles.ppDeleteDetail}>
                <strong>{deleteConfirm.city} - {deleteConfirm.zip_code}</strong>
              </p>
              <p className={styles.ppDeleteNote}>
                This action cannot be undone. Tickets using this location will not be affected.
              </p>
              
              <div className={styles.ppModalActions}>
                <button 
                  type="button" 
                  className={styles.ppCancelBtn} 
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={styles.ppDeleteBtn}
                  onClick={() => handleDeleteLocation(deleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
