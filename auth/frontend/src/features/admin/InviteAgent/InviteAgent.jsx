import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInviteData, submitInvite } from '../../../services/adminService';
import { useToast, Button, Modal, Table, Badge, Card, Input } from '../../../components/common';
import styles from './InviteAgent.module.css';

const defaultAvatar = 'https://i.pinimg.com/1200x/a9/a8/c8/a9a8c8258957c8c7d6fcd320e9973203.jpg';

const InviteAgent = () => {
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
  const [formData, setFormData] = useState({ system_id: '', role_id: '' });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { filterUsers(); }, [searchQuery, availableUsers]);

  useEffect(() => {
    if (formData.system_id) {
      const selectedSystem = systems.find(s => s.id.toString() === formData.system_id);
      setRoles(selectedSystem ? selectedSystem.roles : []);
    } else setRoles([]);
    setFormData(prev => ({ ...prev, role_id: '' }));
  }, [formData.system_id, systems]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await getInviteData();
      if (response.ok) {
        setAvailableUsers(response.data.available_users || []);
        setSystems(response.data.systems || []);
      }
    } finally { setIsLoading(false); }
  };

  const filterUsers = () => {
    const query = searchQuery.toLowerCase();
    setFilteredUsers(availableUsers.filter(u => 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(query) || 
      u.email.toLowerCase().includes(query)
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await submitInvite({ 
        user_id: selectedUser.id, 
        system_id: parseInt(formData.system_id), 
        role_id: parseInt(formData.role_id) 
      });
      if (response.ok) {
        success('Success', 'User invited');
        setInviteModalOpen(false);
        loadData();
      }
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="page-wrapper">
      <ToastContainer />
      
      <header className="page-header">
        <div className="page-title-section">
          <h1>Invite Agent</h1>
          <p className="page-subtitle">Assign system roles to existing user accounts.</p>
        </div>
        <div className="page-actions">
          <Link to="/agents">
            <Button variant="outline" icon={<i className="fa-solid fa-arrow-left"></i>}>Back to Agents</Button>
          </Link>
        </div>
      </header>

      <div className="page-content">
        <Card className={styles.toolbar} flat>
          <Input 
            placeholder="Search by name or email..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<i className="fa-solid fa-search"></i>}
          />
        </Card>

        <Table headers={['User', 'Contact', 'Department', 'Status', 'Actions']} loading={isLoading}>
          {filteredUsers.map(user => (
            <tr key={user.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img src={user.profile_picture || defaultAvatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{user.first_name} {user.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-text-color)' }}>@{user.username}</div>
                  </div>
                </div>
              </td>
              <td>
                <div style={{ fontSize: '0.875rem' }}>{user.email}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-text-color)' }}>{user.phone_number || '-'}</div>
              </td>
              <td>{user.department || 'N/A'}</td>
              <td><Badge variant={user.is_active ? 'success' : 'secondary'}>{user.is_active ? 'Active' : 'Inactive'}</Badge></td>
              <td><Button size="small" onClick={() => { setSelectedUser(user); setInviteModalOpen(true); }}>Invite</Button></td>
            </tr>
          ))}
        </Table>
      </div>

      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite User" footer={<><Button variant="secondary" onClick={() => setInviteModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit} isLoading={isSubmitting}>Confirm Invite</Button></>}>
        <div className={styles.infoBox}><i className="fa-solid fa-info-circle"></i><p>Select a system and role for <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>.</p></div>
        <div className={styles.selectGroup} style={{marginBottom:'1rem'}}><label>Target System</label><select value={formData.system_id} onChange={e => setFormData({...formData, system_id: e.target.value})}><option value="">Select system...</option>{systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className={styles.selectGroup}><label>Assigned Role</label><select value={formData.role_id} onChange={e => setFormData({...formData, role_id: e.target.value})} disabled={!formData.system_id}><option value="">Select role...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
      </Modal>
    </div>
  );
};

export default InviteAgent;
