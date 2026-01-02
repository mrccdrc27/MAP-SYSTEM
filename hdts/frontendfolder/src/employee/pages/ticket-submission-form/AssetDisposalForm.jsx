import { useState, useEffect } from 'react';

// Mock assets eligible for disposal from AMS
// In production, AMS will provide endpoints for fetching computed/derived values
const mockDisposalCandidates = [
  {
    id: 'AST-OLD-001',
    name: 'Dell Latitude E5450',
    serialNumber: 'DL-2018-001',
    category: 'Laptops',
    age: '6 Years 3 Months',
    eolStatus: 'Beyond EOL',
    utilizationAvg3Month: 15, // percentage
    repairCount12Months: 4,
    totalRepairCost: 35000,
    lastAuditResult: 'Failed',
    disposalRecommendation: true
  },
  {
    id: 'AST-OLD-002',
    name: 'HP ProBook 440 G3',
    serialNumber: 'HP-2017-002',
    category: 'Laptops',
    age: '7 Years 1 Month',
    eolStatus: 'Beyond EOL',
    utilizationAvg3Month: 22,
    repairCount12Months: 5,
    totalRepairCost: 42000,
    lastAuditResult: 'Failed',
    disposalRecommendation: true
  },
  {
    id: 'AST-OLD-003',
    name: 'Epson L360 Printer',
    serialNumber: 'EP-2019-003',
    category: 'Printers',
    age: '5 Years 6 Months',
    eolStatus: 'At EOL',
    utilizationAvg3Month: 28,
    repairCount12Months: 3,
    totalRepairCost: 18000,
    lastAuditResult: 'Passed',
    disposalRecommendation: false
  }
];

// Disposal criteria for reference
const DISPOSAL_CRITERIA = {
  ageVsEol: 'At / Beyond EOL',
  utilizationThreshold: 30, // ≤ 30%
  repairCountThreshold: 3, // ≥ 3
  repairCostPercentThreshold: 60, // ≥ 60%
  auditResult: 'Failed'
};

export default function AssetDisposalForm({ formData, onChange, onBlur, errors, FormField, setFormData }) {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [meetsDisposalCriteria, setMeetsDisposalCriteria] = useState(false);

  // When asset is selected, auto-fill all computed fields
  useEffect(() => {
    if (selectedAsset) {
      setFormData(prev => ({
        ...prev,
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        serialNumber: selectedAsset.serialNumber,
        assetCategory: selectedAsset.category,
        assetAge: selectedAsset.age,
        eolStatus: selectedAsset.eolStatus,
        utilizationAvg: selectedAsset.utilizationAvg3Month,
        repairCount: selectedAsset.repairCount12Months,
        totalRepairCost: selectedAsset.totalRepairCost,
        lastAuditResult: selectedAsset.lastAuditResult
      }));
      setMeetsDisposalCriteria(selectedAsset.disposalRecommendation);
    }
  }, [selectedAsset, setFormData]);

  const handleAssetChange = (e) => {
    const assetId = e.target.value;
    const asset = mockDisposalCandidates.find(a => a.id === assetId);
    setSelectedAsset(asset);
    onChange('assetId')({ target: { value: assetId } });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(Number(amount || 0));
  };

  const getCriteriaStatus = (value, threshold, comparison) => {
    if (comparison === '<=') {
      return value <= threshold;
    } else if (comparison === '>=') {
      return value >= threshold;
    }
    return value === threshold;
  };

  return (
    <>

      {/* Disposal Criteria Reference */}
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '15px',
        border: '1px solid #ffc107'
      }}>
        <strong>📋 Disposal Criteria:</strong>
        <table style={{ width: '100%', marginTop: '10px', fontSize: '14px' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>Metric</th>
              <th>Dispose If</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Asset Age vs EOL</td>
              <td>At / Beyond EOL</td>
            </tr>
            <tr>
              <td>Utilization (3-month avg)</td>
              <td>≤ 30%</td>
            </tr>
            <tr>
              <td>Repair Count (12 months)</td>
              <td>≥ 3</td>
            </tr>
            <tr>
              <td>Repair Cost %</td>
              <td>≥ 60%</td>
            </tr>
            <tr>
              <td>Last Audit Result</td>
              <td>Failed</td>
            </tr>
          </tbody>
        </table>
      </div>

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
            <option value="">Select Asset for Disposal Review</option>
            {mockDisposalCandidates.map(asset => (
              <option key={asset.id} value={asset.id}>
                {asset.id} - {asset.name} {asset.disposalRecommendation ? '⚠️ Recommended' : ''}
              </option>
            ))}
          </select>
        )}
      />

      {/* Asset Details (Auto-filled) */}
      {selectedAsset && (
        <>
          {/* Asset Name */}
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

          {/* Serial Number */}
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

          {/* Category */}
          <FormField
            id="assetCategory"
            label="Category"
            render={() => (
              <input
                type="text"
                value={formData.assetCategory || ''}
                readOnly
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            )}
          />

          {/* Lifecycle Metrics Section */}
          <fieldset style={{ 
            border: '1px solid #ddd', 
            padding: '15px', 
            borderRadius: '8px', 
            marginTop: '10px' 
          }}>
            <legend style={{ fontWeight: 'bold', padding: '0 10px' }}>
              Lifecycle Metrics (from AMS)
            </legend>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {/* Age */}
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Age</label>
                <input
                  type="text"
                  value={formData.assetAge || ''}
                  readOnly
                  style={{ 
                    backgroundColor: '#f5f5f5', 
                    cursor: 'not-allowed',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>

              {/* EOL Status */}
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                  EOL Status
                  {(formData.eolStatus === 'At EOL' || formData.eolStatus === 'Beyond EOL') && (
                    <span style={{ color: 'red', marginLeft: '5px' }}>⚠️</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.eolStatus || ''}
                  readOnly
                  style={{ 
                    backgroundColor: formData.eolStatus?.includes('EOL') ? '#ffebee' : '#f5f5f5',
                    cursor: 'not-allowed',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>

              {/* Utilization */}
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                  Total Utilization (3-month avg)
                  {formData.utilizationAvg <= 30 && (
                    <span style={{ color: 'red', marginLeft: '5px' }}>⚠️</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.utilizationAvg ? `${formData.utilizationAvg}%` : ''}
                  readOnly
                  style={{ 
                    backgroundColor: formData.utilizationAvg <= 30 ? '#ffebee' : '#f5f5f5',
                    cursor: 'not-allowed',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>

              {/* Repair Count */}
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                  Repair Count (12 months)
                  {formData.repairCount >= 3 && (
                    <span style={{ color: 'red', marginLeft: '5px' }}>⚠️</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.repairCount || ''}
                  readOnly
                  style={{ 
                    backgroundColor: formData.repairCount >= 3 ? '#ffebee' : '#f5f5f5',
                    cursor: 'not-allowed',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>

              {/* Total Repair Cost */}
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                  Total Repair Cost
                </label>
                <input
                  type="text"
                  value={formData.totalRepairCost ? formatCurrency(formData.totalRepairCost) : ''}
                  readOnly
                  style={{ 
                    backgroundColor: '#f5f5f5',
                    cursor: 'not-allowed',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>

              {/* Last Audit Result */}
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                  Last Audit Result
                  {formData.lastAuditResult === 'Failed' && (
                    <span style={{ color: 'red', marginLeft: '5px' }}>⚠️</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.lastAuditResult || ''}
                  readOnly
                  style={{ 
                    backgroundColor: formData.lastAuditResult === 'Failed' ? '#ffebee' : '#e8f5e9',
                    cursor: 'not-allowed',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    color: formData.lastAuditResult === 'Failed' ? '#c62828' : '#2e7d32'
                  }}
                />
              </div>
            </div>
          </fieldset>

          {/* Recommendation Banner */}
          <div style={{ 
            backgroundColor: meetsDisposalCriteria ? '#ffebee' : '#e8f5e9',
            padding: '15px', 
            borderRadius: '8px', 
            marginTop: '15px',
            border: `1px solid ${meetsDisposalCriteria ? '#ef9a9a' : '#a5d6a7'}`,
            textAlign: 'center'
          }}>
            {meetsDisposalCriteria ? (
              <>
                <strong style={{ color: '#c62828', fontSize: '16px' }}>
                  ⚠️ DISPOSAL RECOMMENDED
                </strong>
                <p style={{ margin: '10px 0 0 0', color: '#c62828' }}>
                  This asset meets multiple disposal criteria and should be considered for disposal.
                </p>
              </>
            ) : (
              <>
                <strong style={{ color: '#2e7d32', fontSize: '16px' }}>
                  ✓ DISPOSAL NOT RECOMMENDED
                </strong>
                <p style={{ margin: '10px 0 0 0', color: '#2e7d32' }}>
                  This asset does not meet enough disposal criteria. Consider continued use or repair.
                </p>
              </>
            )}
          </div>
        </>
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
            placeholder="Provide justification for the disposal request..."
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
        <strong>📎 Recommended Attachments:</strong>
        <ul style={{ marginTop: '10px', marginBottom: 0 }}>
          <li>Asset condition report</li>
          <li>Repair history summary</li>
          <li>Audit reports</li>
          <li>Photos of asset condition</li>
        </ul>
      </div>
    </>
  );
}
