import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getUserSystemRoles, deleteUserSystemRole, updateUserByAdmin } from '../../../services/adminService';
import { useToast } from '../../../components/Toast';
import styles from './AgentManagement.module.css';

const defaultAvatar = 'https://i.pinimg.com/736x/01/c2/09/01c209e18fd7a17c9c5dcc7a4e03db0e.jpg';

const AgentManagement = () => {
  const { user } = useAuth();
  const { ToastContainer, success, error } = useToast();

  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    filterAgents();
  }, [searchQuery, agents]);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const response = await getUserSystemRoles();
      if (response.ok) {
        // Transform the data to show unique users with their roles
        const usersMap = new Map();
        const rolesData = response.data || [];
        
        rolesData.forEach(item => {
          const userId = item.id;
          if (!userId) return; // Skip if no user ID found
          
          if (!usersMap.has(userId)) {
            usersMap.set(userId, {
              id: userId,
              email: item.email,
              username: item.username,
              first_name: item.first_name,
              last_name: item.last_name,
              is_active: item.is_active,
              is_staff: item.is_staff,
              date_joined: item.date_joined,
              last_login: item.last_logged_on,
              profile_picture: item.profile_picture,
              system_roles: [],
              role_assignments: []
            });
          }
          
          const userEntry = usersMap.get(userId);
          userEntry.system_roles.push({
            id: `${userId}-${item.system_slug}-${item.role}`,
            system: item.system_slug,
            role: item.role,
            system_name: item.system_slug?.toUpperCase() || 'Unknown',
            role_name: item.role || 'Unknown'
          });
          userEntry.role_assignments.push(`${userId}-${item.system_slug}-${item.role}`);
        });
        
        setAgents(Array.from(usersMap.values()));
      } else {
        error('Error', 'Failed to load agents');
      }
    } catch (err) {
      console.error('Error loading agents:', err);
      error('Error', 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAgents = () => {
    if (!searchQuery.trim()) {
      setFilteredAgents(agents);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = agents.filter(agent => {
      const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.toLowerCase();
      const email = (agent.email || '').toLowerCase();
      const phone = (agent.phone_number || '').toLowerCase();
      const roles = agent.system_roles?.map(r => r.role_name || '').join(' ').toLowerCase();
      
      return fullName.includes(query) || 
             email.includes(query) || 
             phone.includes(query) ||
             roles.includes(query);
    });
    
    setFilteredAgents(filtered);
  };

  const handleEdit = (agent) => {
    setSelectedAgent(agent);
    setEditForm({
      first_name: agent.first_name || '',
      middle_name: agent.middle_name || '',
      last_name: agent.last_name || '',
      suffix: agent.suffix || '',
      username: agent.username || '',
      phone_number: agent.phone_number || '',
      email: agent.email || '',
      company_id: agent.company_id || '',
      department: agent.department || '',
      is_active: agent.is_active !== false,
    });
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveEdit = async () => {
    if (!selectedAgent) return;
    
    setIsSaving(true);
    try {
      const response = await updateUserByAdmin(selectedAgent.id, editForm);
      if (response.ok) {
        success('Success', 'Agent updated successfully');
        setEditModalOpen(false);
        loadAgents();
      } else {
        error('Error', response.data?.message || 'Failed to update agent');
      }
    } catch (err) {
      console.error('Error updating agent:', err);
      error('Error', 'Failed to update agent');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (agent) => {
    setSelectedAgent(agent);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAgent || !selectedAgent.role_assignments?.length) return;

    setIsSaving(true);
    try {
      // Delete all role assignments for this user
      for (const roleId of selectedAgent.role_assignments) {
        await deleteUserSystemRole(roleId);
      }
      success('Success', 'Agent removed from all systems');
      setDeleteModalOpen(false);
      loadAgents();
    } catch (err) {
      console.error('Error deleting agent:', err);
      error('Error', 'Failed to remove agent');
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
          <p>Loading agents...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <ToastContainer />
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Agent Management</h2>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.search}>
            <input
              type="search"
              placeholder="Search agents by name, email, phone, or role..."
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
          <Link to="/invite-agent" className={styles.inviteBtn}>
            <i className="fa-solid fa-user-plus"></i>
            Invite Agent
          </Link>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Name</th>
                <th>Role(s)</th>
                <th>System(s)</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles.emptyRow}>
                    {searchQuery ? 'No agents found matching your search.' : 'No agents found.'}
                  </td>
                </tr>
              ) : (
                filteredAgents.map(agent => (
                  <tr key={agent.id}>
                    <td>
                      <img 
                        src={agent.profile_picture || defaultAvatar} 
                        alt={agent.first_name}
                        className={styles.avatar}
                        onError={(e) => { e.target.src = defaultAvatar; }}
                      />
                    </td>
                    <td>
                      <div className={styles.nameCell}>
                        <strong>{agent.first_name} {agent.last_name}</strong>
                        <span className={styles.username}>@{agent.username}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.rolesList}>
                        {agent.system_roles?.map((sr) => (
                          <span key={sr.id} className={styles.roleBadge}>
                            {sr.role_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className={styles.systemsList}>
                        {agent.system_roles?.map((sr) => (
                          <span key={sr.id} className={styles.systemBadge}>
                            {sr.system_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{agent.email}</td>
                    <td>{agent.phone_number || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${agent.is_active !== false ? styles.active : styles.inactive}`}>
                        {agent.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(agent.last_login)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleEdit(agent)}
                          title="Edit"
                        >
                          <i className="fa-solid fa-edit"></i>
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.danger}`}
                          onClick={() => handleDeleteClick(agent)}
                          title="Remove"
                        >
                          <i className="fa-solid fa-trash"></i>
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
              <h3>Edit Agent</h3>
              <button className={styles.modalClose} onClick={() => setEditModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={editForm.first_name}
                    onChange={handleEditChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={editForm.last_name}
                    onChange={handleEditChange}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    value={editForm.middle_name}
                    onChange={handleEditChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Suffix</label>
                  <select name="suffix" value={editForm.suffix} onChange={handleEditChange}>
                    <option value="">---------</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={editForm.username}
                  onChange={handleEditChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={editForm.phone_number}
                  onChange={handleEditChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Department</label>
                <select name="department" value={editForm.department} onChange={handleEditChange}>
                  <option value="">---------</option>
                  <option value="IT Department">IT Department</option>
                  <option value="Asset Department">Asset Department</option>
                  <option value="Budget Department">Budget Department</option>
                </select>
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className={styles.modal} onClick={() => setDeleteModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Remove Agent</h3>
              <button className={styles.modalClose} onClick={() => setDeleteModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to remove <strong>{selectedAgent?.first_name} {selectedAgent?.last_name}</strong> from all systems?
              </p>
              <p className={styles.warningText}>
                This will revoke their access but will not delete their account.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.deleteBtn}
                onClick={handleConfirmDelete}
                disabled={isSaving}
              >
                {isSaving ? 'Removing...' : 'Remove Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AgentManagement;
