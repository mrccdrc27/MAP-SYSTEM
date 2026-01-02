import { useState, useEffect } from 'react';
import {
  ASSET_REPAIR_SUB_CATEGORIES,
  COMPONENT_CATEGORIES,
  LOCATIONS
} from '../../../shared/constants/ticketCategories';

// Mock assets from AMS - In production, fetch from AMS API
const mockAssets = [
  { id: 'AST-001', name: 'Lenovo ThinkPad X1 Carbon', serialNumber: 'LN-2024-001' },
  { id: 'AST-002', name: 'Dell XPS 15', serialNumber: 'DL-2024-002' },
  { id: 'AST-003', name: 'HP ProBook 450 G9', serialNumber: 'HP-2024-003' },
  { id: 'AST-004', name: 'MacBook Pro 14"', serialNumber: 'AP-2024-004' }
];

// Mock components from AMS inventory
const mockComponentInventory = [
  { id: 'CMP-001', name: '16GB DDR4 RAM', category: 'RAM', quantity: 10 },
  { id: 'CMP-002', name: '512GB NVMe SSD', category: 'Storage', quantity: 5 },
  { id: 'CMP-003', name: 'Laptop Battery (Generic)', category: 'Battery', quantity: 8 },
  { id: 'CMP-004', name: '14" LCD Display Panel', category: 'Display', quantity: 3 }
];

// Mock suppliers from AMS
const mockSuppliers = [
  'Tech Distributors Inc.',
  'Dell Philippines',
  'HP Enterprise',
  'Lenovo Philippines',
  'Office Solutions Corp.'
];

// Mock manufacturers from AMS
const mockManufacturers = [
  'Samsung',
  'Kingston',
  'Crucial',
  'Seagate',
  'Western Digital',
  'LG',
  'Generic'
];

export default function AssetRepairForm({ formData, onChange, onBlur, errors, FormField, setFormData }) {
  const [requiresComponent, setRequiresComponent] = useState(false);
  const [useExistingComponent, setUseExistingComponent] = useState(true);
  const [requiresNewComponent, setRequiresNewComponent] = useState(false);

  // Local date string for date inputs
  const localToday = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  // Determine if sub-category requires cost approval (green sub-categories)
  const requiresCostApproval = ['Upgrade', 'Part Replacement'].includes(formData.subCategory);
  const isWarrantyService = formData.subCategory === 'Warranty Service';
  const isServiceOnly = ['Corrective Repair', 'Preventive Maintenance', 'OS Re-imaging'].includes(formData.subCategory);

  // Update component requirement based on sub-category
  useEffect(() => {
    setRequiresComponent(requiresCostApproval);
    if (!requiresCostApproval) {
      setRequiresNewComponent(false);
    }
  }, [formData.subCategory, requiresCostApproval]);

  const handleAssetChange = (e) => {
    const assetId = e.target.value;
    const asset = mockAssets.find(a => a.id === assetId);
    if (asset) {
      setFormData(prev => ({
        ...prev,
        assetId: assetId,
        assetName: asset.name,
        serialNumber: asset.serialNumber
      }));
    }
    onChange('assetId')({ target: { value: assetId } });
  };

  return (
    <>
      {/* Repair/Service Name */}
      <FormField
        id="repairName"
        label="Repair/Service Name"
        required
        error={errors.repairName}
        render={() => (
          <input
            type="text"
            placeholder="e.g., RAM Upgrade, Battery Replacement, System Cleanup"
            value={formData.repairName || ''}
            onChange={onChange('repairName')}
            onBlur={onBlur('repairName')}
          />
        )}
      />

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
                {asset.id} - {asset.name} ({asset.serialNumber})
              </option>
            ))}
          </select>
        )}
      />

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

      {/* Start Date */}
      <FormField
        id="startDate"
        label="Start Date"
        required
        error={errors.startDate}
        render={() => (
          <input
            type="date"
            value={formData.startDate || ''}
            onChange={onChange('startDate')}
            onBlur={onBlur('startDate')}
            max={localToday}
          />
        )}
      />

      {/* End Date */}
      <FormField
        id="endDate"
        label="End Date"
        error={errors.endDate}
        render={() => (
          <input
            type="date"
            value={formData.endDate || ''}
            onChange={onChange('endDate')}
            onBlur={onBlur('endDate')}
            min={formData.startDate || localToday}
          />
        )}
      />

      {/* Service Cost (for external repairs or warranty service) */}
      {(isServiceOnly || isWarrantyService) && (
        <FormField
          id="serviceCost"
          label="Service Cost (PHP) - Leave empty if internal repair"
          error={errors.serviceCost}
          render={() => (
            <input
              type="number"
              placeholder="Enter service cost (if applicable)"
              value={formData.serviceCost || ''}
              onChange={onChange('serviceCost')}
              min="0"
            />
          )}
        />
      )}

      {/* Order Number (required if there's a cost) */}
      {(formData.serviceCost > 0 || requiresCostApproval) && (
        <FormField
          id="orderNumber"
          label="Order Number (from BMS)"
          error={errors.orderNumber}
          render={() => (
            <input
              type="text"
              placeholder="Enter order number from finance approval"
              value={formData.orderNumber || ''}
              onChange={onChange('orderNumber')}
            />
          )}
        />
      )}

      {/* Component Section for Upgrade/Part Replacement */}
      {requiresCostApproval && (
        <fieldset style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
          <legend style={{ fontWeight: 'bold', padding: '0 10px' }}>Component Information</legend>
          
          {/* Toggle between existing and new component */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ marginRight: '20px' }}>
              <input
                type="radio"
                name="componentSource"
                checked={useExistingComponent}
                onChange={() => {
                  setUseExistingComponent(true);
                  setRequiresNewComponent(false);
                }}
              />
              {' '}Use Existing Component from Inventory
            </label>
            <label>
              <input
                type="radio"
                name="componentSource"
                checked={requiresNewComponent}
                onChange={() => {
                  setUseExistingComponent(false);
                  setRequiresNewComponent(true);
                }}
              />
              {' '}Require New Component (Purchase)
            </label>
          </div>

          {/* Existing Component Selection */}
          {useExistingComponent && (
            <>
              <FormField
                id="componentName"
                label="Component Name"
                error={errors.componentName}
                render={() => (
                  <select
                    value={formData.componentId || ''}
                    onChange={(e) => {
                      const comp = mockComponentInventory.find(c => c.id === e.target.value);
                      if (comp) {
                        setFormData(prev => ({
                          ...prev,
                          componentId: comp.id,
                          componentName: comp.name,
                          componentCategory: comp.category
                        }));
                      }
                    }}
                  >
                    <option value="">Select Component from Inventory</option>
                    {mockComponentInventory.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} - {comp.category} (Qty: {comp.quantity})
                      </option>
                    ))}
                  </select>
                )}
              />

              <FormField
                id="componentCategory"
                label="Category"
                render={() => (
                  <input
                    type="text"
                    value={formData.componentCategory || ''}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    placeholder="Auto-filled when component selected"
                  />
                )}
              />

              <FormField
                id="componentQuantity"
                label="Quantity"
                render={() => (
                  <input
                    type="number"
                    min="1"
                    value={formData.componentQuantity || 1}
                    onChange={onChange('componentQuantity')}
                  />
                )}
              />

              <FormField
                id="componentCost"
                label="Purchase Cost (PHP)"
                render={() => (
                  <input
                    type="number"
                    placeholder="Enter cost if applicable"
                    value={formData.componentCost || ''}
                    onChange={onChange('componentCost')}
                    min="0"
                  />
                )}
              />
            </>
          )}

          {/* New Component Purchase */}
          {requiresNewComponent && (
            <>
              <FormField
                id="newComponentName"
                label="Component Name"
                required
                error={errors.newComponentName}
                render={() => (
                  <input
                    type="text"
                    placeholder="Enter new component name"
                    value={formData.newComponentName || ''}
                    onChange={onChange('newComponentName')}
                    onBlur={onBlur('newComponentName')}
                  />
                )}
              />

              <FormField
                id="newComponentCategory"
                label="Category"
                required
                error={errors.newComponentCategory}
                render={() => (
                  <select
                    value={formData.newComponentCategory || ''}
                    onChange={onChange('newComponentCategory')}
                    onBlur={onBlur('newComponentCategory')}
                  >
                    <option value="">Select Category</option>
                    {COMPONENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              />

              <FormField
                id="newComponentSupplier"
                label="Supplier"
                render={() => (
                  <select
                    value={formData.newComponentSupplier || ''}
                    onChange={onChange('newComponentSupplier')}
                  >
                    <option value="">Select Supplier</option>
                    {mockSuppliers.map(sup => (
                      <option key={sup} value={sup}>{sup}</option>
                    ))}
                  </select>
                )}
              />

              <FormField
                id="newComponentManufacturer"
                label="Manufacturer"
                render={() => (
                  <select
                    value={formData.newComponentManufacturer || ''}
                    onChange={onChange('newComponentManufacturer')}
                  >
                    <option value="">Select Manufacturer</option>
                    {mockManufacturers.map(mfr => (
                      <option key={mfr} value={mfr}>{mfr}</option>
                    ))}
                  </select>
                )}
              />

              <FormField
                id="newComponentLocation"
                label="Location"
                render={() => (
                  <select
                    value={formData.newComponentLocation || ''}
                    onChange={onChange('newComponentLocation')}
                  >
                    <option value="">Select Location</option>
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}
              />

              <FormField
                id="newComponentModelNumber"
                label="Model Number"
                render={() => (
                  <input
                    type="text"
                    placeholder="Enter model number"
                    value={formData.newComponentModelNumber || ''}
                    onChange={onChange('newComponentModelNumber')}
                  />
                )}
              />

              <FormField
                id="newComponentPurchaseDate"
                label="Purchase Date"
                render={() => (
                  <input
                    type="date"
                    value={formData.newComponentPurchaseDate || ''}
                    onChange={onChange('newComponentPurchaseDate')}
                    max={localToday}
                  />
                )}
              />

              <FormField
                id="newComponentQuantity"
                label="Quantity"
                required
                render={() => (
                  <input
                    type="number"
                    min="1"
                    value={formData.newComponentQuantity || 1}
                    onChange={onChange('newComponentQuantity')}
                  />
                )}
              />

              <FormField
                id="newComponentCost"
                label="Purchase Cost (PHP)"
                required
                error={errors.newComponentCost}
                render={() => (
                  <input
                    type="number"
                    placeholder="Enter purchase cost"
                    value={formData.newComponentCost || ''}
                    onChange={onChange('newComponentCost')}
                    onBlur={onBlur('newComponentCost')}
                    min="0"
                  />
                )}
              />
            </>
          )}
        </fieldset>
      )}

      {/* Notes */}
      <FormField
        id="repairNotes"
        label="Notes"
        render={() => (
          <textarea
            rows={3}
            placeholder="Enter any additional notes about the repair (optional)"
            value={formData.repairNotes || ''}
            onChange={onChange('repairNotes')}
          />
        )}
      />
    </>
  );
}
