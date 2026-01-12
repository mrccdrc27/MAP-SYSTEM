import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast, Button, Modal, Table, Badge, Card, Input } from '../../../components/common';
import styles from './ManageLocations.module.css';

// HDTS API URL for locations
const HDTS_API_URL = import.meta.env.VITE_HDTS_API_URL || 'http://165.22.247.50:8080/helpdesk';

const ManageLocations = () => {
  const { user } = useAuth();
  const { ToastContainer, success, error } = useToast();

  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({ city: '', zip_code: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);

  // Check if user is HDTS Admin
  const isHDTSAdmin = user?.is_superuser || user?.is_staff || 
    user?.system_roles?.some(sr => 
      (sr.system_slug === 'hdts' || sr.system_slug === 'HDTS') && 
      (sr.role_name === 'Admin' || sr.role_name === 'System Admin')
    );

  // Fetch locations
  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${HDTS_API_URL}/api/locations/all/`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (data.success) {
        setLocations(data.locations || []);
      } else {
        // Fallback to public endpoint
        const pubResponse = await fetch(`${HDTS_API_URL}/api/locations/`, {
          credentials: 'include'
        });
        const pubData = await pubResponse.json();
        if (pubData.success) {
          setLocations(pubData.locations || []);
        }
      }
    } catch (err) {
      console.error('Error loading locations:', err);
      error('Error', 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    if (isHDTSAdmin) loadLocations(); 
  }, [isHDTSAdmin, loadLocations]);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredLocations(locations.filter(loc => 
      loc.city.toLowerCase().includes(query) || 
      loc.zip_code.toLowerCase().includes(query) ||
      (loc.display_name && loc.display_name.toLowerCase().includes(query))
    ));
  }, [searchQuery, locations]);

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Zip code: allow digits only and max length 4
  const handleZipChange = (e) => {
    const { name, value } = e.target;
    // strip non-digits and limit to 4 chars
    const digits = (value || '').replace(/\D+/g, '').slice(0, 4);
    setFormData(prev => ({ ...prev, [name]: digits }));
  };

  const openCreateModal = () => {
    setEditingLocation(null);
    setFormData({ city: '', zip_code: '' });
    setShowModal(true);
  };

  const openEditModal = (location) => {
    setEditingLocation(location);
    setFormData({ city: location.city, zip_code: location.zip_code });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLocation(null);
    setFormData({ city: '', zip_code: '' });
  };

  // CRUD Operations
  const handleSave = async () => {
    if (!formData.city.trim() || !formData.zip_code.trim()) {
      error('Validation Error', 'City and Zip Code are required');
      return;
    }

    // client-side zip validation: must be 1-4 digits
    if (!/^\d{1,4}$/.test(formData.zip_code)) {
      error('Validation Error', 'Zip code must be 1 to 4 digits');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingLocation 
        ? `${HDTS_API_URL}/api/locations/${editingLocation.id}/update/`
        : `${HDTS_API_URL}/api/locations/create/`;
      
      const method = editingLocation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        success('Success', editingLocation ? 'Location updated successfully' : 'Location created successfully');
        closeModal();
        loadLocations();
      } else {
        const errMsg = data.error || data.errors?.non_field_errors?.[0] || 'Failed to save location';
        error('Error', errMsg);
      }
    } catch (err) {
      console.error('Error saving location:', err);
      error('Error', 'Failed to save location');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;
    
    try {
      const response = await fetch(`${HDTS_API_URL}/api/locations/${locationToDelete.id}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        success('Success', 'Location deleted successfully');
        setDeleteModalOpen(false);
        setLocationToDelete(null);
        loadLocations();
      } else {
        error('Error', data.error || 'Failed to delete location');
      }
    } catch (err) {
      console.error('Error deleting location:', err);
      error('Error', 'Failed to delete location');
    }
  };

  const handleToggleStatus = async (location) => {
    try {
      const response = await fetch(`${HDTS_API_URL}/api/locations/${location.id}/toggle/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        success('Success', `Location ${data.location.is_active ? 'activated' : 'deactivated'}`);
        loadLocations();
      } else {
        error('Error', data.error || 'Failed to toggle status');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      error('Error', 'Failed to toggle location status');
    }
  };

  // Access check
  if (!isHDTSAdmin) {
    return (
      <div className="page-wrapper">
        <header className="page-header">
          <div className="page-title-section">
            <h1>Access Denied</h1>
            <p className="page-subtitle">You need HDTS Admin access to manage locations.</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <ToastContainer />
      
      <header className="page-header">
        <div className="page-title-section">
          <h1>Manage Locations</h1>
          <p className="page-subtitle">Manage locations for Asset Check-Out ticket forms in HDTS.</p>
        </div>
        <div className="page-actions">
          <Button 
            onClick={openCreateModal} 
            icon={<i className="fa-solid fa-plus"></i>}
          >
            Add Location
          </Button>
        </div>
      </header>

      <div className="page-content">
        <Card flat>
          <div className={styles.filterBar}>
            <Input
              placeholder="Search by city or zip code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<i className="fa fa-search"></i>}
            />
          </div>

          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Loading locations...</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fa fa-map-marker-alt"></i>
              <h3>No Locations Found</h3>
              <p>
                {searchQuery 
                  ? 'No locations match your search criteria.' 
                  : 'No locations have been added yet. Click "Add Location" to create one.'}
              </p>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>City</th>
                  <th>Zip Code</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map(location => (
                  <tr key={location.id}>
                    <td>{location.city}</td>
                    <td>{location.zip_code}</td>
                    <td>
                      <Badge variant={location.is_active ? 'success' : 'secondary'}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      {location.created_at 
                        ? new Date(location.created_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <Button 
                          size="small" 
                          variant="outline" 
                          onClick={() => openEditModal(location)}
                          icon={<i className="fa-solid fa-edit"></i>}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="small" 
                          variant={location.is_active ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(location)}
                          icon={<i className={`fa-solid ${location.is_active ? 'fa-eye-slash' : 'fa-eye'}`}></i>}
                        >
                          {location.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button 
                          size="small" 
                          variant="danger" 
                          onClick={() => { setLocationToDelete(location); setDeleteModalOpen(true); }}
                          icon={<i className="fa-solid fa-trash"></i>}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add/Edit Location Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingLocation ? 'Edit Location' : 'Add New Location'}
      >
        <div className={styles.modalContent}>
          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleFormChange}
            placeholder="Enter city name"
            required
          />
          <Input
            label="Zip Code"
            name="zip_code"
            value={formData.zip_code}
            onChange={handleZipChange}
            inputMode="numeric"
            maxLength={4}
            pattern="\\d*"
            placeholder="Enter zip code"
            required
          />
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              {editingLocation ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setLocationToDelete(null); }}
        title="Confirm Delete"
      >
        <div className={styles.modalContent}>
          <div className={styles.deleteWarning}>
            <i className="fa fa-exclamation-triangle"></i>
            <p>Are you sure you want to delete this location?</p>
          </div>
          {locationToDelete && (
            <p className={styles.deleteDetail}>
              <strong>{locationToDelete.city} - {locationToDelete.zip_code}</strong>
            </p>
          )}
          <p className={styles.deleteNote}>
            This action cannot be undone. Existing tickets using this location will not be affected.
          </p>
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setLocationToDelete(null); }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageLocations;
