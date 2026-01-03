import { useState, useEffect } from 'react';
import { getAllSystems, getSystemRoles, createRole, updateRole, deleteRole } from '../../../services/adminService';
import { useToast, Button, Input, Modal, Badge, Card } from '../../../components/common';
import styles from './ManageRoles.module.css';

const ManageRoles = () => {
  const { ToastContainer, success, error } = useToast();

  const [systems, setSystems] = useState([]);
  const [selectedSystem, setSelectedSystem] = useState('');
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [activeTab, setActiveTab] = useState('view');

  const [createForm, setCreateForm] = useState({ name: '', description: '', level: 1, permissions: [] });
  const [isCreating, setIsCreating] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const availablePermissions = [
    { id: 'view_tickets', name: 'View Tickets' },
    { id: 'create_tickets', name: 'Create Tickets' },
    { id: 'edit_tickets', name: 'Edit Tickets' },
    { id: 'delete_tickets', name: 'Delete Tickets' },
    { id: 'assign_tickets', name: 'Assign Tickets' },
    { id: 'manage_users', name: 'Manage Users' },
    { id: 'manage_roles', name: 'Manage Roles' },
    { id: 'view_reports', name: 'View Reports' },
    { id: 'system_settings', name: 'System Settings' },
  ];

  useEffect(() => { loadSystems(); }, []);
  useEffect(() => { if (selectedSystem) loadRoles(selectedSystem); }, [selectedSystem]);

  const loadSystems = async () => {
    setIsLoading(true);
    try {
      const response = await getAllSystems();
      if (response.ok && response.data?.length > 0) {
        setSystems(response.data);
        setSelectedSystem(response.data[0].slug);
      }
    } finally { setIsLoading(false); }
  };

  const loadRoles = async (slug) => {
    setIsLoadingRoles(true);
    try {
      const response = await getSystemRoles(slug);
      setRoles(response.ok ? response.data || [] : []);
    } finally { setIsLoadingRoles(false); }
  };

  const handlePermissionToggle = (id, isCreate = true) => {
    const target = isCreate ? createForm : editForm;
    const setTarget = isCreate ? setCreateForm : setEditForm;
    const permissions = target.permissions.includes(id) 
      ? target.permissions.filter(p => p !== id) 
      : [...target.permissions, id];
    setTarget({ ...target, permissions });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      if ((await createRole({ ...createForm, system_slug: selectedSystem })).ok) {
        success('Success', 'Role created');
        setCreateForm({ name: '', description: '', level: 1, permissions: [] });
        setActiveTab('view');
        loadRoles(selectedSystem);
      }
    } finally { setIsCreating(false); }
  };

  if (isLoading) return <div className={styles.loadingOverlay}><div className={styles.loadingSpinner}></div></div>;

  return (
    <div className="page-wrapper">
      <ToastContainer />
      
      <header className="page-header">
        <div className="page-title-section">
          <h1>Role Management</h1>
          <p className="page-subtitle">Configure access levels and permissions for {systems.find(s => s.slug === selectedSystem)?.name || 'systems'}.</p>
        </div>
        <div className="page-actions">
          <div className={styles.systemSelect}>
            <label>System:</label>
            <select value={selectedSystem} onChange={(e) => setSelectedSystem(e.target.value)}>
              {systems.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="page-content">
        <div className={styles.tabContainer}>
          <button className={`${styles.tab} ${activeTab === 'view' ? styles.active : ''}`} onClick={() => setActiveTab('view')}>All Roles</button>
          <button className={`${styles.tab} ${activeTab === 'create' ? styles.active : ''}`} onClick={() => setActiveTab('create')}>New Role</button>
        </div>

        {activeTab === 'view' ? (
          <div className={styles.rolesGrid}>
            {roles.map(role => (
              <Card key={role.id} title={role.name} extra={<Badge variant="info">Lvl {role.level}</Badge>} footer={
                <div className={styles.cardActions}>
                  <Button size="small" variant="outline" onClick={() => { setEditingRole(role); setEditForm(role); setEditModalOpen(true); }} icon={<i className="fa-solid fa-edit"></i>}>Edit</Button>
                  {!role.is_system && <Button size="small" variant="danger" onClick={() => { setDeletingRole(role); setDeleteModalOpen(true); }} icon={<i className="fa-solid fa-trash"></i>}>Delete</Button>}
                </div>
              } flat>
                <p className={styles.roleDesc}>{role.description || 'No description provided.'}</p>
                <div className={styles.permList}>
                  {role.permissions?.map(p => <Badge key={p} variant="secondary" className={styles.permBadge}>{p.replace(/_/g, ' ')}</Badge>)}
                </div>
                {role.is_system && <div className={styles.systemNote}><i className="fa-solid fa-lock"></i> Default System Role</div>}
              </Card>
            ))}
          </div>
        ) : (
          <Card className={styles.createCard} flat>
            <form onSubmit={handleCreateSubmit}>
              <div className={styles.formRow}>
                <Input label="Role Name" name="name" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="e.g. Lead Agent" required />
                <Input label="Level (1-10)" type="number" name="level" value={createForm.level} onChange={e => setCreateForm({...createForm, level: e.target.value})} min="1" max="10" />
              </div>
              <div className={styles.formGroup} style={{marginBottom: '1rem'}}>
                <label className={styles.label}>Description</label>
                <textarea className={styles.textarea} value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="Describe role responsibilities..." rows="3" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Permissions</label>
                <div className={styles.permGrid}>
                  {availablePermissions.map(p => (
                    <label key={p.id} className={styles.permItem}>
                      <input type="checkbox" checked={createForm.permissions.includes(p.id)} onChange={() => handlePermissionToggle(p.id, true)} />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.formActions}>
                <Button type="submit" isLoading={isCreating}>Save Role</Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Role" footer={<><Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button><Button onClick={async () => { setIsEditing(true); if ((await updateRole(editingRole.id, editForm)).ok) { success('Success', 'Updated'); setEditModalOpen(false); loadRoles(selectedSystem); } setIsEditing(false); }} isLoading={isEditing}>Save</Button></>}>
        <Input label="Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
        <div className={styles.permGrid}>
          {availablePermissions.map(p => (
            <label key={p.id} className={styles.permItem}>
              <input type="checkbox" checked={editForm.permissions?.includes(p.id)} onChange={() => handlePermissionToggle(p.id, false)} />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Role" footer={<><Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={async () => { setIsDeleting(true); if ((await deleteRole(deletingRole.id)).ok) { success('Success', 'Deleted'); setDeleteModalOpen(false); loadRoles(selectedSystem); } setIsDeleting(false); }} isLoading={isDeleting}>Delete</Button></>}>
        <p>Delete role <strong>{deletingRole?.name}</strong>? Users with this role will lose their assigned permissions.</p>
      </Modal>
    </div>
  );
};

export default ManageRoles;
