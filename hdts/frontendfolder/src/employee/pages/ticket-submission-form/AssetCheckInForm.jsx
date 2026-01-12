import { useState, useEffect } from 'react';

// API URL for fetching locations from HDTS backend
const HDTS_API_URL = import.meta.env.VITE_HDTS_BACKEND_URL || 'http://165.22.247.50:5001';

// AMS API URL for fetching asset checkouts
const AMS_ASSETS_URL = 'https://ams-assets.up.railway.app';

const assetSubCategories = [
  'Laptop',
  'Printer',
  'Projector',
  'Mouse',
  'Keyboard'
];

const assetIssueTypes = [
  'Not Functioning',
  'Missing Accessories (e.g., charger, case)',
  'Physical Damage (e.g., cracked screen, broken keys)',
  'Battery Issue (e.g., not charging, quick drain)',
  'Software Issue (e.g., system crash, unable to boot)',
  'Screen/Display Issue (e.g., flickering, dead pixels)',
  'Other'
];

// Mock assets data - this would come from your AMS in production
const mockAssets = {
  'Laptop': [
    { name: 'Dell Latitude 5420', serialNumber: 'DL-2024-001' },
    { name: 'HP ProBook 450 G9', serialNumber: 'HP-2024-002' },
    { name: 'Lenovo ThinkPad X1', serialNumber: 'LN-2024-003' }
  ],
  'Printer': [
    { name: 'HP LaserJet Pro M404dn', serialNumber: 'PR-2024-001' },
    { name: 'Canon imageCLASS MF445dw', serialNumber: 'PR-2024-002' }
  ],
  'Projector': [
    { name: 'Epson PowerLite 2247U', serialNumber: 'PJ-2024-001' },
    { name: 'BenQ MH535A', serialNumber: 'PJ-2024-002' }
  ],
  'Mouse': [
    { name: 'Logitech MX Master 3', serialNumber: 'MS-2024-001' },
    { name: 'Microsoft Surface Mouse', serialNumber: 'MS-2024-002' }
  ],
  'Keyboard': [
    { name: 'Logitech K380', serialNumber: 'KB-2024-001' },
    { name: 'Microsoft Ergonomic Keyboard', serialNumber: 'KB-2024-002' }
  ]
};

export default function AssetCheckInForm({ formData, onChange, onBlur, errors, FormField, employeeId }) {
  // Locations state - fetched from API
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Asset checkouts state - fetched from AMS API based on employee ID
  const [assetCheckouts, setAssetCheckouts] = useState([]);
  const [loadingAssetCheckouts, setLoadingAssetCheckouts] = useState(false);

  // Fetch asset checkouts from AMS API when employeeId is available
  useEffect(() => {
    const fetchAssetCheckouts = async () => {
      if (!employeeId) {
        setAssetCheckouts([]);
        return;
      }
      
      setLoadingAssetCheckouts(true);
      try {
        const response = await fetch(`${AMS_ASSETS_URL}/asset-checkout/by-employee/${employeeId}/`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setAssetCheckouts(data);
        } else {
          console.error('Invalid asset checkouts response:', data);
          setAssetCheckouts([]);
        }
      } catch (error) {
        console.error('Error fetching asset checkouts:', error);
        setAssetCheckouts([]);
      } finally {
        setLoadingAssetCheckouts(false);
      }
    };

    fetchAssetCheckouts();
  }, [employeeId]);

  // Fetch locations from HDTS API on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      try {
        const response = await fetch(`${HDTS_API_URL}/api/locations/`);
        const data = await response.json();
        if (data.success && Array.isArray(data.locations)) {
          setLocations(data.locations);
        } else {
          console.error('Invalid locations response:', data);
          setLocations([]);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  return (
    <>
      {/* Sub-Category (Type of Product) */}
      <FormField
        id="subCategory"
        label="Sub-Category (Type of Product)"
        required
        error={errors.subCategory}
        render={() => (
          <select
            value={formData.subCategory}
            onChange={onChange('subCategory')}
            onBlur={onBlur('subCategory')}
          >
            <option value="">Select Product Type</option>
            {assetSubCategories.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}
      />

      {/* Asset Checkout - Dropdown to select from employee's checked out assets */}
      <FormField
        id="assetCheckout"
        label="Asset Checkout"
        error={errors.assetCheckout}
        render={() => (
          <select
            value={formData.assetCheckout || ''}
            onChange={onChange('assetCheckout')}
            onBlur={onBlur('assetCheckout')}
            disabled={loadingAssetCheckouts}
          >
            <option value="">
              {loadingAssetCheckouts ? 'Loading checkouts...' : 'Select Asset Checkout'}
            </option>
            {assetCheckouts.map(checkout => (
              <option key={checkout.id} value={checkout.id}>
                {checkout.asset_details?.name || `Asset ID: ${checkout.asset_details?.asset_id}`}
                {checkout.asset_details?.asset_id ? ` (${checkout.asset_details.asset_id})` : ''}
              </option>
            ))}
          </select>
        )}
      />

      {/* Asset Name */}
      <FormField
        id="assetName"
        label="Asset Name"
        required
        error={errors.assetName}
        render={() => (
          <select
            disabled={!formData.subCategory}
            value={formData.assetName}
            onChange={onChange('assetName')}
            onBlur={onBlur('assetName')}
          >
            <option value="">Select Asset</option>
            {formData.subCategory &&
              mockAssets[formData.subCategory]?.map(asset => (
                <option key={asset.name} value={asset.name}>
                  {asset.name}
                </option>
              ))}
          </select>
        )}
      />

      {/* Serial Number (Auto-filled) */}
      <FormField
        id="serialNumber"
        label="Serial Number"
        render={() => (
          <input
            type="text"
            placeholder="Auto-filled when asset is selected"
            readOnly
            value={formData.serialNumber}
            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
          />
        )}
      />

      {/* Location */}
      <FormField
        id="location"
        label="Location"
        required
        error={errors.location}
        render={() => (
          <select
            value={formData.location?.id || formData.location || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              const selectedLocation = locations.find(loc => String(loc.id) === String(selectedId));
              // Store location object with id and city (as name)
              if (selectedLocation) {
                onChange('location')({ target: { value: { id: selectedLocation.id, name: selectedLocation.city } } });
              } else {
                onChange('location')({ target: { value: '' } });
              }
            }}
            onBlur={onBlur('location')}
            disabled={loadingLocations}
          >
            <option value="">
              {loadingLocations ? 'Loading locations...' : 'Select Location'}
            </option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.city}
              </option>
            ))}
          </select>
        )}
      />

      {/* Specify Issue */}
      <FormField
        id="issueType"
        label="Specify Issue"
        required
        error={errors.issueType}
        render={() => (
          <select
            value={formData.issueType}
            onChange={onChange('issueType')}
            onBlur={onBlur('issueType')}
          >
            <option value="">Select Issue Type</option>
            {assetIssueTypes.map(issue => (
              <option key={issue} value={issue}>{issue}</option>
            ))}
          </select>
        )}
      />

      {/* Other Issue - Shown when "Other" is selected */}
      {formData.issueType === 'Other' && (
        <FormField
          id="otherIssue"
          label="Please Specify Other Issue"
          render={() => (
            <textarea
              rows={3}
              placeholder="Please describe the issue..."
              value={formData.otherIssue || ''}
              onChange={onChange('otherIssue')}
            />
          )}
        />
      )}
    </>
  );
}

// Export the mock assets for use in parent component
export { mockAssets };
