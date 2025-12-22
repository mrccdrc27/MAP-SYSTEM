import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import '../../styles/custom-colors.css';
import '../../styles/PageTable.css';
import '../../styles/GlobalTableStyles.css';
import '../../styles/ViewManufacturer.css';
import '../../styles/TableButtons.css';
import TopSecFormPage from '../../components/TopSecFormPage';
import MediumButtons from "../../components/buttons/MediumButtons";
import TableBtn from "../../components/buttons/TableButtons";

const StatusDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Sample data for different status IDs
  const statusData = {
    1: { 
      name: 'Deployable', 
      type: 'Asset', 
      notes: 'Ready to be deployed to users', 
      count: 15,
      color: '#28a745',
      assets: [
        { id: 1, name: 'MacBook Pro 13"', tag: 'ASSET-001', model: 'MacBook Pro', category: 'Laptop' },
        { id: 2, name: 'Dell Monitor 24"', tag: 'ASSET-002', model: 'U2419H', category: 'Monitor' },
        { id: 3, name: 'iPhone 13', tag: 'ASSET-003', model: 'iPhone 13', category: 'Mobile Device' },
        { id: 4, name: 'Wireless Mouse', tag: 'ASSET-004', model: 'MX Master 3', category: 'Accessory' },
        { id: 5, name: 'USB-C Hub', tag: 'ASSET-005', model: 'HyperDrive', category: 'Accessory' }
      ]
    },
    2: { 
      name: 'Deployed', 
      type: 'Asset', 
      notes: 'Currently in use by a user', 
      count: 8,
      color: '#007bff',
      assets: [
        { id: 6, name: 'MacBook Air M1', tag: 'ASSET-006', model: 'MacBook Air', category: 'Laptop' },
        { id: 7, name: 'iPad Pro', tag: 'ASSET-007', model: 'iPad Pro 11"', category: 'Tablet' },
        { id: 8, name: 'Desk Phone', tag: 'ASSET-008', model: 'Cisco 7841', category: 'Phone' }
      ]
    },
    3: { 
      name: 'Pending', 
      type: 'Asset', 
      notes: 'Awaiting approval or processing', 
      count: 3,
      color: '#ffc107',
      assets: [
        { id: 9, name: 'Surface Pro', tag: 'ASSET-009', model: 'Surface Pro 8', category: 'Tablet' },
        { id: 10, name: 'Webcam HD', tag: 'ASSET-010', model: 'Logitech C920', category: 'Accessory' }
      ]
    },
    4: { 
      name: 'Archived', 
      type: 'Asset', 
      notes: 'No longer in active use', 
      count: 2,
      color: '#6c757d',
      assets: [
        { id: 11, name: 'Old Laptop', tag: 'ASSET-011', model: 'ThinkPad T450', category: 'Laptop' }
      ]
    },
    5: { 
      name: 'Undeployable', 
      type: 'Asset', 
      notes: 'Cannot be deployed due to issues', 
      count: 1,
      color: '#dc3545',
      assets: [
        { id: 12, name: 'Broken Monitor', tag: 'ASSET-012', model: 'Dell U2415', category: 'Monitor' }
      ]
    }
  };

  const currentStatus = statusData[id] || statusData[1];
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter assets based on search query
  const filteredAssets = currentStatus.assets.filter(asset =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <nav>
        <NavBar />
      </nav>
      <main className="page">
        <div className="container">
          <section className="top">
            <TopSecFormPage
              root="Statuses"
              currentPage={`${currentStatus.name} Status`}
              rootNavigatePage="/More/ViewStatus"
              title={`${currentStatus.name} Status Details`}
            />
          </section>
          
          <section className="status-info" style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #dee2e6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <div style={{ 
                display: 'inline-block', 
                width: '20px', 
                height: '20px', 
                backgroundColor: currentStatus.color, 
                borderRadius: '50%'
              }}></div>
              <h2 style={{ margin: '0', color: '#545f71', fontSize: '1.5rem' }}>{currentStatus.name}</h2>
            </div>
            <p style={{ margin: '0 0 8px 0', color: '#6c757d' }}>
              <strong>Type:</strong> {currentStatus.type}
            </p>
            <p style={{ margin: '0 0 8px 0', color: '#6c757d' }}>
              <strong>Description:</strong> {currentStatus.notes}
            </p>
            <p style={{ margin: '0', color: '#6c757d' }}>
              <strong>Total Assets:</strong> {currentStatus.count}
            </p>
          </section>

          <section className="assets-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: '0', color: '#545f71', fontSize: '1.25rem' }}>
                Assets with {currentStatus.name} Status ({filteredAssets.length})
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <form action="" method="post" style={{ marginRight: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="search-input"
                  />
                </form>
                <MediumButtons type="export" />
              </div>
            </div>

            <table className="assets-table" style={{ borderRadius: '0', overflow: 'hidden' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" />
                  </th>
                  <th style={{ width: '25%' }}>ASSET NAME</th>
                  <th style={{ width: '20%' }}>ASSET TAG</th>
                  <th style={{ width: '20%' }}>MODEL</th>
                  <th style={{ width: '20%' }}>CATEGORY</th>
                  <th style={{ width: '40px', textAlign: 'center', paddingLeft: '12px', paddingRight: '12px' }}>VIEW</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td style={{ width: '40px' }}>
                      <input type="checkbox" />
                    </td>
                    <td style={{ width: '25%', color: '#545f71' }}>{asset.name}</td>
                    <td style={{ width: '20%', color: '#545f71' }}>{asset.tag}</td>
                    <td style={{ width: '20%', color: '#545f71' }}>{asset.model}</td>
                    <td style={{ width: '20%', color: '#545f71' }}>{asset.category}</td>
                    <td style={{ width: '40px', textAlign: 'center', paddingLeft: '12px', paddingRight: '12px' }}>
                      <TableBtn
                        type="view"
                        navigatePage={`/assets/${asset.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bottom" style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '16px 34px', 
            borderTop: '1px solid #d3d3d3',
            marginTop: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#545f71' }}>
              <span style={{ color: '#545f71' }}>Show</span>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} style={{ color: '#545f71' }}>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span style={{ color: '#545f71' }}>items per page</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="prev-btn" disabled={currentPage === 1} style={{ 
                color: '#545f71', 
                border: '1px solid #dee2e6', 
                background: 'white', 
                padding: '4px 8px', 
                borderRadius: '4px' 
              }}>Prev</button>
              <span className="page-number" style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '30px', 
                height: '30px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                borderRadius: '4px', 
                fontSize: '14px' 
              }}>{currentPage}</span>
              <button className="next-btn" disabled={filteredAssets.length <= itemsPerPage} style={{ 
                color: '#545f71', 
                border: '1px solid #dee2e6', 
                background: 'white', 
                padding: '4px 8px', 
                borderRadius: '4px' 
              }}>Next</button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default StatusDetails;
