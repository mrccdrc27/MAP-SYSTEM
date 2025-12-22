import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Test() {
  const { user, setUser, isAdmin, hasTtsAccess, logout } = useAuth();

  const makeUser = (role) => {
    const base = user || { username: 'guest', email: 'guest@example.com' };

    if (role === 'admin') {
      setUser({
        ...base,
        username: 'admin',
        email: 'admin@example.com',
        roles: [{ system: 'tts', name: 'Admin' }],
      });
      return;
    }

    if (role === 'agent') {
      setUser({
        ...base,
        username: 'agent',
        email: 'agent@example.com',
        roles: [{ system: 'tts', name: 'Agent' }],
      });
      return;
    }

    if (role === 'none') {
      setUser({
        ...base,
        username: 'guest',
        email: 'guest@example.com',
        roles: [],
      });
      return;
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Auth Context Test Page</h2>

      <div style={{ marginBottom: 12 }}>
        <strong>Current user:</strong>
        <pre style={{ background: '#f7f7f7', padding: 10 }}>{JSON.stringify(user, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>isAdmin:</strong> {isAdmin() ? 'true' : 'false'} <br />
        <strong>hasTtsAccess:</strong> {hasTtsAccess() ? 'true' : 'false'}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => makeUser('admin')}>Set Admin</button>
        <button onClick={() => makeUser('agent')}>Set Agent</button>
        <button onClick={() => makeUser('none')}>Clear Roles</button>
        <button onClick={logout}>Logout (clear token)</button>
      </div>

      <hr />

      {isAdmin() && <AdminPanel />}

      {!isAdmin() && hasTtsAccess() && <AgentPanel />}

      {!hasTtsAccess() && !isAdmin() && (
        <div style={{ marginTop: 12 }}>No TTS access — nothing to show.</div>
      )}
    </div>
  );
}

const AdminPanel = () => (
  <div style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
    <h3>Admin Panel</h3>
    <p>This content is only visible to users with the Admin role.</p>
  </div>
);

const AgentPanel = () => (
  <div style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
    <h3>Agent Panel</h3>
    <p>This content is visible to users with an Agent (TTS) role.</p>
  </div>
);
