import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import '../styles/Audits.css';

const Audits = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('due');
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const auditItems = [
    {
      dueDate: 'December 31, 2025',
      overdueBy: '31 days',
      assetId: '100019',
      assetName: 'Macbook Pro 16"',
      status: 'Deployed',
      assignedTo: 'Mary Grace Piattos',
      notes: '-'
    }
  ];

  return (
    <div className="audits-container">
      <NavBar />
      <main className="audits-content">
        <div className="audits-header">
          <h1>Asset Audit</h1>
          <div className="header-buttons">
            <button className="primary-button">Schedule Audits</button>
            <button className="primary-button">Perform Audits</button>
          </div>
        </div>
        
        <div className="audits-tabs">
          <a 
            href="/audits"
            className={`tab-link ${activeTab === 'due' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              navigate('/audits');
              setActiveTab('due');
            }}
          >
            Due to be Audited (3)
          </a>
          <a 
            href="/audits/overdue"
            className={`tab-link ${activeTab === 'overdue' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              navigate('/audits/overdue');
              setActiveTab('overdue');
            }}
          >
            Overdue for an Audits (3)
          </a>
          <a 
            href="/audits/scheduled"
            className={`tab-link ${activeTab === 'scheduled' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              navigate('/audits/scheduled');
              setActiveTab('scheduled');
            }}
          >
            Scheduled Audits (3)
          </a>
          <a 
            href="/audits/completed"
            className={`tab-link ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              navigate('/audits/completed');
              setActiveTab('completed');
            }}
          >
            Completed Audits (3)
          </a>
        </div>

        <div className="audits-table-section">
          <div className="table-header">
            <h2>{activeTab === 'overdue' ? 'Overdue for an Audits' : 'Due to be Audited'}</h2>
            <div className="table-actions">
              <input type="text" placeholder="Search..." className="search-input" />
              <button className="export-button">Export</button>
            </div>
          </div>

          <table className="audits-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>DUE DATE</th>
                <th>OVERDUE BY</th>
                <th>ASSET</th>
                <th>STATUS</th>
                <th>NOTES</th>
                <th>EDIT</th>
                <th>DELETE</th>
                <th>VIEW</th>
              </tr>
            </thead>
            <tbody>
              {auditItems.map((item, index) => (
                <tr key={index}>
                  <td><input type="checkbox" /></td>
                  <td>{item.dueDate}</td>
                  <td>{item.overdueBy}</td>
                  <td>
                    <div className="asset-info">
                      {item.assetId} - {item.assetName}
                    </div>
                  </td>
                  <td>
                    <div className="status-badge">
                      <span className="status-dot"></span>
                      Deployed to {item.assignedTo}
                    </div>
                  </td>
                  <td>{item.notes}</td>
                  <td>
                    <button className="icon-button edit">✎</button>
                  </td>
                  <td>
                    <button className="icon-button delete">🗑</button>
                  </td>
                  <td>
                    <button className="icon-button view">👁</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default Audits; 
