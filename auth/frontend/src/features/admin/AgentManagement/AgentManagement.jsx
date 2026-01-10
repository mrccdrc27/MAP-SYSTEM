import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserSystemRoles, deleteUserSystemRole, updateUserByAdmin } from '../../../services/adminService';
import { useToast, Button, Input, Modal, Table, Badge, Card } from '../../../components/common';
import styles from './AgentManagement.module.css';

const defaultAvatar = 'https://i.pinimg.com/1200x/a9/a8/c8/a9a8c8258957c8c7d6fcd320e9973203.jpg';

const AgentManagement = () => {
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

  useEffect(() => { loadAgents(); }, []);
  useEffect(() => { filterAgents(); }, [searchQuery, agents]);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const response = await getUserSystemRoles();
      if (response.ok) {
        const usersMap = new Map();
        const rolesData = response.data || [];
        rolesData.forEach(item => {
          if (!item.id) return;
          if (!usersMap.has(item.id)) {
            usersMap.set(item.id, { ...item, system_roles: [] });
          }
          usersMap.get(item.id).system_roles.push({
            id: `${item.id}-${item.system_slug}-${item.role}`,
            system_name: item.system_slug?.toUpperCase() || 'Unknown',
            role_name: item.role || 'Unknown'
          });
        });
        setAgents(Array.from(usersMap.values()));
      }
    } finally { setIsLoading(false); }
  };

  const filterAgents = () => {
    if (!searchQuery.trim()) return setFilteredAgents(agents);
    const query = searchQuery.toLowerCase();
    setFilteredAgents(agents.filter(a => 
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(query) || 
      a.email.toLowerCase().includes(query) || 
      a.system_roles?.some(r => r.role_name.toLowerCase().includes(query))
    ));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      if ((await updateUserByAdmin(selectedAgent.id, editForm)).ok) {
        success('Success', 'Agent updated');
        setEditModalOpen(false);
        loadAgents();
      }
    } finally { setIsSaving(false); }
  };

  const handleDeleteConfirm = async () => {
    setIsSaving(true);
    try {
      for (const sr of selectedAgent.system_roles) await deleteUserSystemRole(sr.id);
      success('Success', 'Access revoked');
      setDeleteModalOpen(false);
      loadAgents();
    } finally { setIsSaving(false); }
  };

  return (
    <div className="page-wrapper">
      <ToastContainer />
      
      <header className="page-header">
        <div className="page-title-section">
          <h1>Agent Management</h1>
          <p className="page-subtitle">Manage system access and roles for all service agents.</p>
        </div>
        <div className="page-actions">
          <Link to="/invite-agent">
            <Button icon={<i className="fa-solid fa-user-plus"></i>}>Invite Agent</Button>
          </Link>
        </div>
      </header>

      <div className="page-content">
        <Card className={styles.toolbar} flat>
          <div className={styles.searchContainer}>
            <i className={`fa-solid fa-search ${styles.searchIcon}`}></i>
            <input className={styles.searchInput} type="search" placeholder="Search by name, email, or role..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </Card>

        <Table headers={['Agent', 'Roles', 'Systems', 'Contact', 'Status', 'Last Login', 'Actions']} loading={isLoading}>
          {filteredAgents.map(agent => (
            <tr key={agent.id}>
              <td>
                <div className={styles.agentCell}>
                  <img src={agent.profile_picture || defaultAvatar} alt="" className={styles.avatar} onError={(e) => { e.target.src = defaultAvatar; }} />
                  <div>
                    <div className={styles.name}>{agent.first_name} {agent.last_name}</div>
                    <div className={styles.username}>@{agent.username}</div>
                  </div>
                </div>
              </td>
              <td><div className={styles.badgeList}>{agent.system_roles?.map((sr, i) => <Badge key={i} variant="info">{sr.role_name}</Badge>)}</div></td>
              <td><div className={styles.badgeList}>{agent.system_roles?.map((sr, i) => <Badge key={i} variant="secondary">{sr.system_name}</Badge>)}</div></td>
              <td>
                <div className={styles.contactCell}>
                  <div className={styles.email}>{agent.email}</div>
                  <div className={styles.phone}>{agent.phone_number || '-'}</div>
                </div>
              </td>
              <td><Badge variant={agent.is_active !== false ? 'success' : 'danger'}>{agent.is_active !== false ? 'Active' : 'Inactive'}</Badge></td>
              <td className={styles.dateCell}>{agent.last_logged_on ? new Date(agent.last_logged_on).toLocaleDateString() : '-'}</td>
              <td>
                <div className={styles.actions}>
                  <button className={styles.actionBtn} onClick={() => { setSelectedAgent(agent); setEditForm(agent); setEditModalOpen(true); }}><i className="fa-solid fa-pen"></i></button>
                  <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => { setSelectedAgent(agent); setDeleteModalOpen(true); }}><i className="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Agent" footer={<><Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button><Button onClick={handleSaveEdit} isLoading={isSaving}>Save</Button></>}>
        <div className={styles.modalGrid}>
          <Input label="First Name" name="first_name" value={editForm.first_name || ''} onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
          <Input label="Last Name" name="last_name" value={editForm.last_name || ''} onChange={e => setEditForm({...editForm, last_name: e.target.value})} />
          <div className={styles.checkboxContainer}>
            <input type="checkbox" id="is_active" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} />
            <label htmlFor="is_active">Active Account</label>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Revoke Access" footer={<><Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDeleteConfirm} isLoading={isSaving}>Revoke</Button></>}>
        <p>Revoke access for <strong>{selectedAgent?.first_name} {selectedAgent?.last_name}</strong> from all systems?</p>
      </Modal>
    </div>
  );
};

export default AgentManagement;
