const assetSubCategories = [
  'Laptop',
  'Printer',
  'Projector',
  'Mouse',
  'Keyboard'
];

const locations = [
  'Main Office - 1st Floor',
  'Main Office - 2nd Floor',
  'Main Office - 3rd Floor',
  'Branch Office - North',
  'Branch Office - South',
  'Warehouse',
  'Remote/Home Office'
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

export default function AssetCheckOutForm({ formData, onChange, onBlur, errors, FormField }) {
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
            value={formData.location}
            onChange={onChange('location')}
            onBlur={onBlur('location')}
          >
            <option value="">Select Location</option>
            {locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        )}
      />

      {/* Expected Return Date */}
      <FormField
        id="expectedReturnDate"
        label="Expected Return Date"
        required
        error={errors.expectedReturnDate}
        render={() => (
          <input
            type="date"
            value={formData.expectedReturnDate}
            onChange={onChange('expectedReturnDate')}
            onBlur={onBlur('expectedReturnDate')}
            min={new Date().toISOString().split('T')[0]}
          />
        )}
      />
    </>
  );
}

// Export the mock assets for use in parent component
export { mockAssets };
