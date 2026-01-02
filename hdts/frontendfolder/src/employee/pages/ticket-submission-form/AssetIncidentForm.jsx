import { useState } from 'react';
import { ASSET_INCIDENT_SUB_CATEGORIES } from '../../../shared/constants/ticketCategories';

// Mock assets from AMS - In production, fetch from AMS API
const mockAssets = [
  { id: 'AST-001', name: 'Lenovo ThinkPad X1 Carbon', serialNumber: 'LN-2024-001', assignedTo: 'John Doe' },
  { id: 'AST-002', name: 'Dell XPS 15', serialNumber: 'DL-2024-002', assignedTo: 'Jane Smith' },
  { id: 'AST-003', name: 'HP ProBook 450 G9', serialNumber: 'HP-2024-003', assignedTo: 'Bob Johnson' },
  { id: 'AST-004', name: 'MacBook Pro 14"', serialNumber: 'AP-2024-004', assignedTo: 'Alice Williams' }
];

export default function AssetIncidentForm({ formData, onChange, onBlur, errors, FormField, setFormData }) {
  // Local date string for date inputs
  const localToday = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  const isStolen = formData.subCategory === 'Stolen';
  const isDamage = formData.subCategory === 'Damage';
  const isResign = formData.subCategory === 'Employee Resign';

  const handleAssetChange = (e) => {
    const assetId = e.target.value;
    const asset = mockAssets.find(a => a.id === assetId);
    if (asset) {
      setFormData(prev => ({
        ...prev,
        assetId: assetId,
        assetName: asset.name,
        serialNumber: asset.serialNumber,
        assignedTo: asset.assignedTo
      }));
    }
    onChange('assetId')({ target: { value: assetId } });
  };

  return (
    <>
      {/* Asset Selection */}
      <FormField
        id="assetId"
        label="Asset ID"
        required
        error={errors.assetId}
        render={() => (
          <select
            value={formData.assetId || ''}
            onChange={handleAssetChange}
            onBlur={onBlur('assetId')}
          >
            <option value="">Select Asset</option>
            {mockAssets.map(asset => (
              <option key={asset.id} value={asset.id}>
                {asset.id} - {asset.name} (Assigned to: {asset.assignedTo})
              </option>
            ))}
          </select>
        )}
      />

      {/* Asset Name (Auto-filled) */}
      {formData.assetName && (
        <FormField
          id="assetName"
          label="Asset Name"
          render={() => (
            <input
              type="text"
              value={formData.assetName || ''}
              readOnly
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
          )}
        />
      )}

      {/* Serial Number (Auto-filled) */}
      {formData.serialNumber && (
        <FormField
          id="serialNumber"
          label="Serial Number"
          render={() => (
            <input
              type="text"
              value={formData.serialNumber || ''}
              readOnly
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
          )}
        />
      )}

      {/* Assigned To (Auto-filled) */}
      {formData.assignedTo && (
        <FormField
          id="assignedTo"
          label="Currently Assigned To"
          render={() => (
            <input
              type="text"
              value={formData.assignedTo || ''}
              readOnly
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
          )}
        />
      )}

      {/* Incident Date */}
      <FormField
        id="incidentDate"
        label="Incident Date"
        required
        error={errors.incidentDate}
        render={() => (
          <input
            type="date"
            value={formData.incidentDate || ''}
            onChange={onChange('incidentDate')}
            onBlur={onBlur('incidentDate')}
            max={localToday}
          />
        )}
      />

      {/* Damage Description (for Damage incidents) */}
      {isDamage && (
        <FormField
          id="damageDescription"
          label="Damage Description"
          required
          error={errors.damageDescription}
          render={() => (
            <textarea
              rows={3}
              placeholder="Describe the damage in detail (e.g., cracked screen, broken keyboard, water damage)"
              value={formData.damageDescription || ''}
              onChange={onChange('damageDescription')}
              onBlur={onBlur('damageDescription')}
            />
          )}
        />
      )}

      {/* Police Report Number (for Stolen incidents) */}
      {isStolen && (
        <FormField
          id="policeReportNumber"
          label="Police Report Number"
          render={() => (
            <input
              type="text"
              placeholder="Enter police report number (if available)"
              value={formData.policeReportNumber || ''}
              onChange={onChange('policeReportNumber')}
            />
          )}
        />
      )}

      {/* Last Known Location (for Stolen incidents) */}
      {isStolen && (
        <FormField
          id="lastKnownLocation"
          label="Last Known Location"
          required
          error={errors.lastKnownLocation}
          render={() => (
            <input
              type="text"
              placeholder="Where was the asset last seen?"
              value={formData.lastKnownLocation || ''}
              onChange={onChange('lastKnownLocation')}
              onBlur={onBlur('lastKnownLocation')}
            />
          )}
        />
      )}

      {/* Employee Name (for Resign incidents) */}
      {isResign && (
        <FormField
          id="employeeName"
          label="Employee Name"
          required
          error={errors.employeeName}
          render={() => (
            <input
              type="text"
              placeholder="Name of the resigning/deceased employee"
              value={formData.employeeName || ''}
              onChange={onChange('employeeName')}
              onBlur={onBlur('employeeName')}
            />
          )}
        />
      )}

      {/* Last Working Day (for Resign incidents) */}
      {isResign && (
        <FormField
          id="lastWorkingDay"
          label="Last Working Day / Date of Incident"
          required
          error={errors.lastWorkingDay}
          render={() => (
            <input
              type="date"
              value={formData.lastWorkingDay || ''}
              onChange={onChange('lastWorkingDay')}
              onBlur={onBlur('lastWorkingDay')}
            />
          )}
        />
      )}

      {/* Justification / Notes */}
      <FormField
        id="justification"
        label="Justification / Notes"
        required
        error={errors.justification}
        render={() => (
          <textarea
            rows={4}
            placeholder="Provide detailed information about the incident..."
            value={formData.justification || ''}
            onChange={onChange('justification')}
            onBlur={onBlur('justification')}
          />
        )}
      />

      {/* File Attachment Guidance */}
      <div style={{ 
        backgroundColor: '#f0f7ff', 
        padding: '15px', 
        borderRadius: '8px', 
        marginTop: '10px',
        border: '1px solid #cce5ff'
      }}>
        <strong>📎 Required Attachments:</strong>
        <ul style={{ marginTop: '10px', marginBottom: 0 }}>
          {isStolen && <li>Police report (if available)</li>}
          {isDamage && <li>Photos of the damage</li>}
          {isResign && (
            <>
              <li>Resignation letter or HR documentation</li>
              <li>Death certificate (if applicable)</li>
            </>
          )}
          <li>Any other supporting documents</li>
        </ul>
      </div>
    </>
  );
}
