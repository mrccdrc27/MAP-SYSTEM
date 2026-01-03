import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../services/api';
import { useToast } from '../../../components/Toast';
import styles from './ManageAssignments.module.css';

const defaultAvatar = 'https://i.pinimg.com/736x/01/c2/09/01c209e18fd7a17c9c5dcc7a4e03db0e.jpg';

const ManageAssignments = () => {
  const { user } = useAuth();
  const { ToastContainer, success, error } = useToast();

  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editForm, setEditForm] = useState({
    is_active: false,
    is_deployed: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    filterAssignments();
  }, [searchQuery, assignments]);

  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/v1/tts/manage-assignments-api/', {
        method: 'GET',
        includeAuth: true,
      });

      if (response.ok) {
        setAssignments(response.data || []);
      } else {
        error('Error', 'Failed to load assignments');
      }
    } catch (err) {
      console.error('Error loading assignments:', err);
      error('Error', 'Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAssignments = () => {
    if (!searchQuery.trim()) {
      setFilteredAssignments(assignments);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = assignments.filter(assignment => {
      const fullName = `${assignment.first_name || ''} ${assignment.last_name || ''}`.toLowerCase();
      const email = (assignment.email || '').toLowerCase();
      const role = (assignment.role || '').toLowerCase();
      
      return fullName.includes(query) || 
             email.includes(query) || 
             role.includes(query);
    });
    
    setFilteredAssignments(filtered);
  };

  const handleEdit = (assignment) => {
    setSelectedAssignment(assignment);
    setEditForm({
      is_active: assignment.is_active !== false,
      is_deployed: assignment.settings?.is_deployed || false,
    });
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSaveEdit = async () => {
    if (!selectedAssignment) return;
    
    setIsSaving(true);
    try {
      // Note: The update endpoint expects the UserSystemRole ID, not user ID
      // We need to find the assignment ID from the backend or store it
      const response = await apiRequest(`/api/v1/tts/update-assignment/${selectedAssignment.assignment_id || selectedAssignment.id}/`, {
        method: 'PUT',
        includeAuth: true,
        body: JSON.stringify({
          is_active: editForm.is_active,
          settings: { is_deployed: editForm.is_deployed }
        }),
      });

      if (response.ok) {
        success('Success', 'Assignment updated successfully');
        setEditModalOpen(false);
        loadAssignments();
      } else {
        error('Error', response.data?.message || 'Failed to update assignment');
      }
    } catch (err) {
      console.error('Error updating assignment:', err);
      error('Error', 'Failed to update assignment');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading assignments...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <ToastContainer />
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Manage TTS Assignments</h2>
          <p className={styles.subtitle}>
            Manage role assignments and deployment status for TTS agents
          </p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.search}>
            <input
              type="search"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className={styles.clearBtn}
                onClick={() => setSearchQuery('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Assigned At</th>
                <th>Deployed</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan="8" className={styles.emptyRow}>
                    {searchQuery ? 'No assignments found matching your search.' : 'No assignments found.'}
                  </td>
                </tr>
              ) : (
                filteredAssignments.map(assignment => (
                  <tr key={assignment.id}>
                    <td>
                      <img 
                        src={assignment.profile_picture || defaultAvatar} 
                        alt={assignment.first_name}
                        className={styles.avatar}
                        onError={(e) => { e.target.src = defaultAvatar; }}
                      />
                    </td>
                    <td>
                      <div className={styles.nameCell}>
                        <strong>{assignment.first_name} {assignment.last_name}</strong>
                        <span className={styles.username}>@{assignment.username}</span>
                      </div>
                    </td>
                    <td>{assignment.email}</td>
                    <td>
                      <span className={styles.roleBadge}>
                        {assignment.role}
                      </span>
                    </td>
                    <td>{formatDate(assignment.assigned_at)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${assignment.settings?.is_deployed ? styles.deployed : styles.notDeployed}`}>
                        {assignment.settings?.is_deployed ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${assignment.is_active ? styles.active : styles.inactive}`}>
                        {assignment.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleEdit(assignment)}
                          title="Edit Assignment"
                        >
                          <i className="fa-solid fa-edit"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <div className={styles.modal} onClick={() => setEditModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit Assignment</h3>
              <button className={styles.modalClose} onClick={() => setEditModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.infoGroup}>
                <label>Agent</label>
                <p className={styles.infoText}>
                  {selectedAssignment?.first_name} {selectedAssignment?.last_name} ({selectedAssignment?.role})
                </p>
              </div>

              <div className={styles.formGroupCheckbox}>
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={editForm.is_active}
                  onChange={handleEditChange}
                />
                <label htmlFor="is_active">Active</label>
              </div>

              <div className={styles.formGroupCheckbox}>
                <input
                  type="checkbox"
                  id="is_deployed"
                  name="is_deployed"
                  checked={editForm.is_deployed}
                  onChange={handleEditChange}
                />
                <label htmlFor="is_deployed">Deployed</label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.saveBtn}
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ManageAssignments;
