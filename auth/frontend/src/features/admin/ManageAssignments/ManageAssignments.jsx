import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getTTSAssignments, updateTTSAssignment } from '../../../services/adminService';
import { useToast, Button, Modal, Table, Badge, Card, Input } from '../../../components/common';
import styles from './ManageAssignments.module.css';

const defaultAvatar = 'https://i.pinimg.com/736x/01/c2/09/01c209e18fd7a17c9c5dcc7a4e03db0e.jpg';

const ManageAssignments = () => {
  const { ToastContainer, success, error } = useToast();

  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editForm, setEditForm] = useState({ is_deployed: false });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadAssignments(); }, []);
  useEffect(() => { filterAssignments(); }, [searchQuery, assignments]);

  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const response = await getTTSAssignments();
      if (response.ok) setAssignments(response.data || []);
    } finally { setIsLoading(false); }
  };

  const filterAssignments = () => {
    const query = searchQuery.toLowerCase();
    setFilteredAssignments(assignments.filter(a => 
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(query) || 
      a.email.toLowerCase().includes(query) || 
      a.role.toLowerCase().includes(query)
    ));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const id = selectedAssignment.assignment_id || selectedAssignment.id;
      const response = await updateTTSAssignment(id, {
        settings: { is_deployed: editForm.is_deployed }
      });
      if (response.ok) {
        success('Success', 'Updated');
        setEditModalOpen(false);
        loadAssignments();
      }
    } finally { setIsSaving(false); }
  };

  return (
    <div className="page-wrapper">
      <ToastContainer />
      
      <header className="page-header">
        <div className="page-title-section">
          <h1>TTS Assignments</h1>
          <p className="page-subtitle">Manage agent availability and deployment for the Ticket Tracking System.</p>
        </div>
      </header>

      <div className="page-content">
        <Card className={styles.toolbar} flat>
          <Input 
            placeholder="Filter agents by name, email, or role..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<i className="fa-solid fa-search"></i>}
          />
        </Card>

        <Table headers={['Agent', 'Role', 'Assigned At', 'Deployed', 'Actions']} loading={isLoading}>
          {filteredAssignments.map(a => (
            <tr key={a.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src={a.profile_picture || defaultAvatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.first_name} {a.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-text-color)' }}>{a.email}</div>
                  </div>
                </div>
              </td>
              <td><Badge variant="info">{a.role}</Badge></td>
              <td style={{ fontSize: '0.875rem' }}>{a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '-'}</td>
              <td><Badge variant={a.settings?.is_deployed ? 'success' : 'secondary'}>{a.settings?.is_deployed ? 'Yes' : 'No'}</Badge></td>
              <td>
                <Button size="small" variant="outline" onClick={() => { setSelectedAssignment(a); setEditForm({ is_deployed: a.settings?.is_deployed || false }); setEditModalOpen(true); }} icon={<i className="fa-solid fa-edit"></i>}>Edit</Button>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Assignment" footer={<><Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button><Button onClick={handleSaveEdit} isLoading={isSaving}>Save Changes</Button></>}>
        <p style={{marginBottom: '1.5rem'}}>Updating <strong>{selectedAssignment?.first_name} {selectedAssignment?.last_name}</strong>.</p>
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
            <input type="checkbox" checked={editForm.is_deployed} onChange={e => setEditForm({...editForm, is_deployed: e.target.checked})} />
            <span>Mark as Deployed</span>
          </label>

          {!editForm.is_deployed && (
            <div style={{ 
              padding: '0.75rem', 
              backgroundColor: 'rgba(255, 193, 7, 0.1)', 
              color: '#856404', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid rgba(255, 193, 7, 0.2)', 
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>This agent would not be assigned any tickets. Continue?</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ManageAssignments;
