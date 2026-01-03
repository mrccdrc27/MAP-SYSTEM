import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/config';
import { useToast } from '../../components/Toast';
import styles from './InviteAgent.module.css';

const defaultAvatar = 'https://i.pinimg.com/736x/01/c2/09/01c209e18fd7a17c9c5dcc7a4e03db0e.jpg';

const InviteAgent = () => {
  const navigate = useNavigate();
  const { ToastContainer, success, error } = useToast();

  const [availableUsers, setAvailableUsers] = useState([]);
  const [systems, setSystems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    system_id: '',
    role_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, availableUsers]);

  useEffect(() => {
    if (formData.system_id) {
      const selectedSystem = systems.find(s => s.id.toString() === formData.system_id);
      if (selectedSystem) {
        setRoles(selectedSystem.roles || []);
      }
    } else {
      setRoles([]);
    }
    setFormData(prev => ({ ...prev, role_id: '' }));
  }, [formData.system_id, systems]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get available users and systems from the invite endpoint
      const response = await apiRequest('/api/v1/users/invite-agent/', {
        method: 'GET',
        includeAuth: true,
      });

      if (response.ok) {
        const data = response.data;
        setAvailableUsers(data.available_users || []);
        setSystems(data.systems || []);
      } else {
        error('Error', 'Failed to load data');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      error('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(availableUsers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = availableUsers.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      const phone = (user.phone_number || '').toLowerCase();
      
      return fullName.includes(query) || 
             email.includes(query) || 
             phone.includes(query);
    });
    
    setFilteredUsers(filtered);
  };

  const handleInviteClick = (user) => {
    setSelectedUser(user);
    setFormData({ system_id: '', role_id: '' });
    setInviteModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !formData.system_id || !formData.role_id) {
      error('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest('/api/v1/users/invite-agent/', {
        method: 'POST',
        includeAuth: true,
        body: JSON.stringify({
          user_id: selectedUser.id,
          system_id: parseInt(formData.system_id),
          role_id: parseInt(formData.role_id),
        }),
      });

      if (response.ok) {
        const result = response.data;
        success('Success', result.message || 'User invited successfully!');
        setInviteModalOpen(false);
        loadData(); // Refresh the list
      } else {
        const errorMessage = response.data?.error || response.data?.message || 'Failed to invite user';
        error('Error', errorMessage);
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      error('Error', 'Failed to invite user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <ToastContainer />
      
      <div className={styles.container}>
        <div className={styles.header}>
          <Link to="/agents" className={styles.backLink}>
            <i className="fa-solid fa-arrow-left"></i>
            Back to Agents
          </Link>
          <h2>Invite Agent to System</h2>
          <p className={styles.subtitle}>
            Grant system access to existing users by assigning roles
          </p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.search}>
            <input
              type="search"
              placeholder="Search users by name, email, or phone..."
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
                <th>Phone</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyRow}>
                    {searchQuery ? 'No users found matching your search.' : 'No users available to invite.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <img 
                        src={user.profile_picture || defaultAvatar} 
                        alt={user.first_name}
                        className={styles.avatar}
                        onError={(e) => { e.target.src = defaultAvatar; }}
                      />
                    </td>
                    <td>
                      <div className={styles.nameCell}>
                        <strong>{user.first_name} {user.last_name}</strong>
                        <span className={styles.username}>@{user.username}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phone_number || '-'}</td>
                    <td>{user.department || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${user.is_active ? styles.active : styles.inactive}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className={styles.inviteBtn}
                        onClick={() => handleInviteClick(user)}
                      >
                        <i className="fa-solid fa-user-plus"></i>
                        Invite
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className={styles.modal} onClick={() => setInviteModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Invite User to System</h3>
              <button className={styles.modalClose} onClick={() => setInviteModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>User</label>
                  <p className={styles.selectedUser}>
                    {selectedUser?.first_name} {selectedUser?.last_name}
                  </p>
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="system_id">System <span className={styles.required}>*</span></label>
                  <select
                    id="system_id"
                    name="system_id"
                    value={formData.system_id}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select a system...</option>
                    {systems.map(system => (
                      <option key={system.id} value={system.id}>
                        {system.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="role_id">Role <span className={styles.required}>*</span></label>
                  <select
                    id="role_id"
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleFormChange}
                    disabled={!formData.system_id || roles.length === 0}
                    required
                  >
                    <option value="">
                      {!formData.system_id 
                        ? 'Select a system first' 
                        : roles.length === 0 
                          ? 'No roles available' 
                          : 'Select a role...'}
                    </option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {formData.system_id && roles.length === 0 && (
                    <small>Roles will be populated based on selected system</small>
                  )}
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <button 
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setInviteModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.inviteSubmitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Inviting...' : 'Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default InviteAgent;
