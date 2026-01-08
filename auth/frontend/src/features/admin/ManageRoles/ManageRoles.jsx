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

  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      if ((await createRole({ ...createForm, system_slug: selectedSystem })).ok) {
        success('Success', 'Role created');
        setCreateForm({ name: '', description: '' });
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
              <Card key={role.id} title={role.name} footer={
                <div className={styles.cardActions}>
                  <Button size="small" variant="outline" onClick={() => { setEditingRole(role); setEditForm({ name: role.name, description: role.description }); setEditModalOpen(true); }} icon={<i className="fa-solid fa-edit"></i>}>Edit</Button>
                  {!role.is_system && <Button size="small" variant="danger" onClick={() => { setDeletingRole(role); setDeleteModalOpen(true); }} icon={<i className="fa-solid fa-trash"></i>}>Delete</Button>}
                </div>
              } flat>
                <p className={styles.roleDesc}>{role.description || 'No description provided.'}</p>
                {role.is_system && <div className={styles.systemNote}><i className="fa-solid fa-lock"></i> Default System Role</div>}
              </Card>
            ))}
          </div>
        ) : (
          <Card className={styles.createCard} flat>
            <form onSubmit={handleCreateSubmit}>
              <div className={styles.formGroup} style={{marginBottom: '1rem'}}>
                <Input label="Role Name" name="name" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="e.g. Lead Agent" required />
              </div>
              <div className={styles.formGroup} style={{marginBottom: '1.5rem'}}>
                <label className={styles.label}>Description</label>
                <textarea className={styles.textarea} value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="Describe role responsibilities..." rows="3" />
              </div>
              <div className={styles.formActions}>
                <Button type="submit" isLoading={isCreating}>Save Role</Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Role" footer={<><Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button><Button onClick={async () => { setIsEditing(true); if ((await updateRole(editingRole.id, editForm)).ok) { success('Success', 'Updated'); setEditModalOpen(false); loadRoles(selectedSystem); } setIsEditing(false); }} isLoading={isEditing}>Save Changes</Button></>}>
        <div className={styles.formGroup} style={{marginBottom: '1rem'}}>
          <Input label="Role Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Description</label>
          <textarea className={styles.textarea} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Describe role responsibilities..." rows="3" />
        </div>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Role" footer={<><Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={async () => { setIsDeleting(true); if ((await deleteRole(deletingRole.id)).ok) { success('Success', 'Deleted'); setDeleteModalOpen(false); loadRoles(selectedSystem); } setIsDeleting(false); }} isLoading={isDeleting}>Delete</Button></>}>
        <p>Delete role <strong>{deletingRole?.name}</strong>? Users with this role will lose their assigned permissions.</p>
      </Modal>
    </div>
  );
};

export default ManageRoles;
