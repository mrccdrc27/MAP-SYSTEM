import { useState, useEffect } from 'react';
import { getAllSystems, getSystemRoles, createRole, updateRole, deleteRole } from '../../../services/adminService';
import { useToast, Button, Input, Modal } from '../../../components/common';
import styles from './ManageRoles.module.css';

const ManageRoles = () => {
  const { ToastContainer, success, error } = useToast();

  const [systems, setSystems] = useState([]);
  const [selectedSystem, setSelectedSystem] = useState('');
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [activeTab, setActiveTab] = useState('view'); // view, create

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    level: 1,
    permissions: [],
  });
  const [createErrors, setCreateErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Default permissions list
  const availablePermissions = [
    { id: 'view_tickets', name: 'View Tickets', description: 'Can view tickets' },
    { id: 'create_tickets', name: 'Create Tickets', description: 'Can create new tickets' },
    { id: 'edit_tickets', name: 'Edit Tickets', description: 'Can edit existing tickets' },
    { id: 'delete_tickets', name: 'Delete Tickets', description: 'Can delete tickets' },
    { id: 'assign_tickets', name: 'Assign Tickets', description: 'Can assign tickets to agents' },
    { id: 'manage_users', name: 'Manage Users', description: 'Can manage system users' },
    { id: 'manage_roles', name: 'Manage Roles', description: 'Can manage roles and permissions' },
    { id: 'view_reports', name: 'View Reports', description: 'Can view system reports' },
    { id: 'system_settings', name: 'System Settings', description: 'Can modify system settings' },
  ];

  useEffect(() => {
    loadSystems();
  }, []);

  useEffect(() => {
    if (selectedSystem) {
      loadRoles(selectedSystem);
    } else {
      setRoles([]);
    }
  }, [selectedSystem]);

  const loadSystems = async () => {
    setIsLoading(true);
    try {
      const response = await getAllSystems();
      if (response.ok) {
        const systemsList = response.data || [];
        setSystems(systemsList);
        if (systemsList.length > 0) {
          setSelectedSystem(systemsList[0].slug);
        }
      } else {
        error('Error', 'Failed to load systems');
      }
    } catch (err) {
      console.error('Error loading systems:', err);
      error('Error', 'Failed to load systems');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoles = async (systemSlug) => {
    setIsLoadingRoles(true);
    try {
      const response = await getSystemRoles(systemSlug);
      if (response.ok) {
        setRoles(response.data || []);
      } else {
        setRoles([]);
      }
    } catch (err) {
      console.error('Error loading roles:', err);
      setRoles([]);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  // Create form handlers
  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value }));
    if (createErrors[name]) {
      setCreateErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePermissionToggle = (permId, isCreate = true) => {
    if (isCreate) {
      setCreateForm(prev => ({
        ...prev,
        permissions: prev.permissions.includes(permId)
          ? prev.permissions.filter(p => p !== permId)
          : [...prev.permissions, permId]
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        permissions: (prev.permissions || []).includes(permId)
          ? prev.permissions.filter(p => p !== permId)
          : [...(prev.permissions || []), permId]
      }));
    }
  };

  const validateCreateForm = () => {
    const errors = {};
    if (!createForm.name.trim()) {
      errors.name = 'Role name is required';
    }
    if (!selectedSystem) {
      errors.system = 'Please select a system';
    }
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setIsCreating(true);
    try {
      const response = await createRole({
        name: createForm.name,
        description: createForm.description,
        level: parseInt(createForm.level) || 1,
        permissions: createForm.permissions,
        system_slug: selectedSystem,
      });

      if (response.ok) {
        success('Success', 'Role created successfully');
        setCreateForm({ name: '', description: '', level: 1, permissions: [] });
        setActiveTab('view');
        loadRoles(selectedSystem);
      } else {
        error('Error', response.data?.message || 'Failed to create role');
      }
    } catch (err) {
      console.error('Error creating role:', err);
      error('Error', 'Failed to create role');
    } finally {
      setIsCreating(false);
    }
  };

  // Edit handlers
  const handleEditClick = (role) => {
    setEditingRole(role);
    setEditForm({
      name: role.name || '',
      description: role.description || '',
      level: role.level || 1,
      permissions: role.permissions || [],
    });
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async () => {
    if (!editingRole) return;

    setIsEditing(true);
    try {
      const response = await updateRole(editingRole.id, {
        name: editForm.name,
        description: editForm.description,
        level: parseInt(editForm.level) || 1,
        permissions: editForm.permissions,
      });

      if (response.ok) {
        success('Success', 'Role updated successfully');
        setEditModalOpen(false);
        loadRoles(selectedSystem);
      } else {
        error('Error', response.data?.message || 'Failed to update role');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      error('Error', 'Failed to update role');
    } finally {
      setIsEditing(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (role) => {
    setDeletingRole(role);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRole) return;

    setIsDeleting(true);
    try {
      const response = await deleteRole(deletingRole.id);
      if (response.ok) {
        success('Success', 'Role deleted successfully');
        setDeleteModalOpen(false);
        loadRoles(selectedSystem);
      } else {
        error('Error', response.data?.message || 'Failed to delete role');
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      error('Error', 'Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <ToastContainer />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Role Management</h2>
          <p className={styles.subtitle}>Create and manage roles for your systems</p>
        </div>

        <div className={styles.systemSelector}>
          <label>Select System:</label>
          <select 
            value={selectedSystem} 
            onChange={(e) => setSelectedSystem(e.target.value)}
          >
            {systems.map(system => (
              <option key={system.id || system.slug} value={system.slug}>
                {system.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.tabs}>
          <Button 
            variant={activeTab === 'view' ? 'primary' : 'outline'}
            className={`${styles.tab}`}
            onClick={() => setActiveTab('view')}
            icon={<i className="fa-solid fa-list"></i>}
          >
            View Roles
          </Button>
          <Button 
            variant={activeTab === 'create' ? 'primary' : 'outline'}
            className={`${styles.tab}`}
            onClick={() => setActiveTab('create')}
            icon={<i className="fa-solid fa-plus"></i>}
          >
            Create Role
          </Button>
        </div>

        <div className={styles.content}>
          {activeTab === 'view' && (
            <div className={styles.rolesView}>
              {isLoadingRoles ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner}></div>
                </div>
              ) : roles.length === 0 ? (
                <div className={styles.emptyState}>
                  <i className="fa-solid fa-user-tag"></i>
                  <h3>No Roles Found</h3>
                  <p>No roles have been created for this system yet.</p>
                  <Button 
                    onClick={() => setActiveTab('create')}
                  >
                    Create First Role
                  </Button>
                </div>
              ) : (
                <div className={styles.rolesList}>
                  {roles.map(role => (
                    <div key={role.id} className={styles.roleCard}>
                      <div className={styles.roleHeader}>
                        <div className={styles.roleInfo}>
                          <h4>{role.name}</h4>
                          {role.level && (
                            <span className={styles.levelBadge}>Level {role.level}</span>
                          )}
                        </div>
                        <div className={styles.roleActions}>
                          <button 
                            className={styles.actionBtn}
                            onClick={() => handleEditClick(role)}
                            title="Edit"
                          >
                            <i className="fa-solid fa-edit"></i>
                          </button>
                          <button 
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => handleDeleteClick(role)}
                            title="Delete"
                            disabled={role.is_system}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      {role.description && (
                        <p className={styles.roleDescription}>{role.description}</p>
                      )}
                      {role.permissions?.length > 0 && (
                        <div className={styles.permissionsList}>
                          {role.permissions.map(perm => (
                            <span key={perm} className={styles.permBadge}>
                              {perm.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                      {role.is_system && (
                        <p className={styles.systemRoleNote}>
                          <i className="fa-solid fa-lock"></i>
                          System role - cannot be deleted
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <form className={styles.createForm} onSubmit={handleCreateSubmit}>
              <Input
                label="Role Name"
                name="name"
                value={createForm.name}
                onChange={handleCreateChange}
                placeholder="e.g., Senior Agent"
                required
                error={createErrors.name}
              />

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateChange}
                  placeholder="Describe the role's responsibilities..."
                  rows="3"
                  className={styles.textarea}
                />
              </div>

              <Input
                label="Role Level"
                type="number"
                name="level"
                value={createForm.level}
                onChange={handleCreateChange}
                min="1"
                max="10"
                hint="Higher levels have more authority (1-10)"
              />

              <div className={styles.formGroup}>
                <label className={styles.label}>Permissions</label>
                <div className={styles.permissionsGrid}>
                  {availablePermissions.map(perm => (
                    <label key={perm.id} className={styles.permissionItem}>
                      <input
                        type="checkbox"
                        checked={createForm.permissions.includes(perm.id)}
                        onChange={() => handlePermissionToggle(perm.id, true)}
                      />
                      <span className={styles.permissionLabel}>
                        <strong>{perm.name}</strong>
                        <small>{perm.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formActions}>
                <Button 
                  variant="secondary"
                  onClick={() => {
                    setActiveTab('view');
                    setCreateForm({ name: '', description: '', level: 1, permissions: [] });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  isLoading={isCreating}
                >
                  Create Role
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Role"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} isLoading={isEditing}>
              Save Changes
            </Button>
          </>
        }
      >
        <Input
          label="Role Name"
          type="text"
          name="name"
          value={editForm.name}
          onChange={handleEditChange}
        />
        <div className={styles.formGroup}>
          <label className={styles.label}>Description</label>
          <textarea
            name="description"
            value={editForm.description}
            onChange={handleEditChange}
            rows="3"
            className={styles.textarea}
          />
        </div>
        <Input
          label="Level"
          type="number"
          name="level"
          value={editForm.level}
          onChange={handleEditChange}
          min="1"
          max="10"
        />
        <div className={styles.formGroup}>
          <label className={styles.label}>Permissions</label>
          <div className={styles.permissionsGrid}>
            {availablePermissions.map(perm => (
              <label key={perm.id} className={styles.permissionItem}>
                <input
                  type="checkbox"
                  checked={(editForm.permissions || []).includes(perm.id)}
                  onChange={() => handlePermissionToggle(perm.id, false)}
                />
                <span className={styles.permissionLabel}>
                  <strong>{perm.name}</strong>
                </span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Role"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} isLoading={isDeleting}>
              Delete Role
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete the role <strong>{deletingRole?.name}</strong>?
        </p>
        <p className={styles.warningText}>
          This action cannot be undone. Users with this role will lose their permissions.
        </p>
      </Modal>
    </main>
  );
};

export default ManageRoles;
