import { useState, useEffect } from 'react';
import {
  ASSET_CATEGORIES,
  LOCATIONS,
  DEPARTMENTS
} from '../../../shared/constants/ticketCategories';

// Mock approved asset request tickets - In production, fetch from HDTS API
const mockApprovedRequests = [
  {
    id: 'AR-2025-0031',
    productName: 'Lenovo ThinkPad X1 Carbon',
    modelNumber: '20U9005MUS',
    category: 'Laptops',
    orderNumber: 'PO-2025-0142'
  },
  {
    id: 'AR-2025-0028',
    productName: 'Dell XPS 15',
    modelNumber: 'XPS-15-9520',
    category: 'Laptops',
    orderNumber: 'PO-2025-0139'
  },
  {
    id: 'AR-2025-0025',
    productName: 'HP LaserJet Pro M404dn',
    modelNumber: 'W1A53A',
    category: 'Printers',
    orderNumber: 'PO-2025-0135'
  }
];

export default function AssetRegistrationForm({ formData, onChange, onBlur, errors, FormField, setFormData }) {
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Local date string for min date
  const localToday = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  // Calculate warranty expiry min date (purchase date)
  const warrantyMinDate = formData.purchaseDate || localToday;

  // When request reference is selected, auto-fill fields
  useEffect(() => {
    if (selectedRequest) {
      setFormData(prev => ({
        ...prev,
        productName: selectedRequest.productName,
        modelNumber: selectedRequest.modelNumber,
        assetCategory: selectedRequest.category,
        orderNumber: selectedRequest.orderNumber
      }));
    }
  }, [selectedRequest, setFormData]);

  const handleRequestChange = (e) => {
    const requestId = e.target.value;
    const request = mockApprovedRequests.find(r => r.id === requestId);
    setSelectedRequest(request);
    onChange('requestReference')({ target: { value: requestId } });
  };

  return (
    <>

      {/* Request Reference */}
      <FormField
        id="requestReference"
        label="Request Reference (Approved Asset Request Ticket)"
        error={errors.requestReference}
        render={() => (
          <select
            value={formData.requestReference || ''}
            onChange={handleRequestChange}
            onBlur={onBlur('requestReference')}
          >
            <option value="">Select Approved Request or Enter Manually</option>
            {mockApprovedRequests.map(request => (
              <option key={request.id} value={request.id}>
                {request.id} - {request.productName}
              </option>
            ))}
          </select>
        )}
      />

      {/* Asset Model (Auto-filled or input) */}
      <FormField
        id="productName"
        label="Asset Model"
        required
        error={errors.productName}
        render={() => (
          <input
            type="text"
            placeholder={selectedRequest ? "Auto-filled from request" : "Enter asset model"}
            value={formData.productName || ''}
            onChange={onChange('productName')}
            onBlur={onBlur('productName')}
            readOnly={!!selectedRequest}
            style={selectedRequest ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
          />
        )}
      />

      {/* Model Number */}
      <FormField
        id="modelNumber"
        label="Model Number"
        render={() => (
          <input
            type="text"
            placeholder={selectedRequest ? "Auto-filled from request" : "Enter model number"}
            value={formData.modelNumber || ''}
            onChange={onChange('modelNumber')}
            readOnly={!!selectedRequest}
            style={selectedRequest ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
          />
        )}
      />

      {/* Category */}
      <FormField
        id="assetCategory"
        label="Category"
        required
        error={errors.assetCategory}
        render={() => (
          selectedRequest ? (
            <input
              type="text"
              value={formData.assetCategory || ''}
              readOnly
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
          ) : (
            <select
              value={formData.assetCategory || ''}
              onChange={onChange('assetCategory')}
              onBlur={onBlur('assetCategory')}
            >
              <option value="">Select Category</option>
              {ASSET_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )
        )}
      />

      {/* Order Number */}
      <FormField
        id="orderNumber"
        label="Order Number (from BMS)"
        error={errors.orderNumber}
        render={() => (
          <input
            type="text"
            placeholder={selectedRequest ? "Auto-filled from approved request" : "Enter order number (e.g., PO-2025-XXXX)"}
            value={formData.orderNumber || ''}
            onChange={onChange('orderNumber')}
            readOnly={!!selectedRequest}
            style={selectedRequest ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
          />
        )}
      />

      {/* Serial Number */}
      <FormField
        id="serialNumber"
        label="Serial Number"
        required
        error={errors.serialNumber}
        render={() => (
          <input
            type="text"
            placeholder="Enter serial number from the device"
            value={formData.serialNumber || ''}
            onChange={onChange('serialNumber')}
            onBlur={onBlur('serialNumber')}
          />
        )}
      />

      {/* Purchase Cost */}
      <FormField
        id="purchaseCost"
        label="Purchase Cost (PHP)"
        required
        error={errors.purchaseCost}
        render={() => (
          <input
            type="number"
            placeholder="Enter purchase cost"
            value={formData.purchaseCost || ''}
            onChange={onChange('purchaseCost')}
            onBlur={onBlur('purchaseCost')}
            min="0"
          />
        )}
      />

      {/* Purchase Date */}
      <FormField
        id="purchaseDate"
        label="Purchase Date"
        required
        error={errors.purchaseDate}
        render={() => (
          <input
            type="date"
            value={formData.purchaseDate || ''}
            onChange={onChange('purchaseDate')}
            onBlur={onBlur('purchaseDate')}
            max={localToday}
          />
        )}
      />

      {/* Warranty Expiry */}
      <FormField
        id="warrantyExpiry"
        label="Warranty Expiry Date"
        required
        error={errors.warrantyExpiry}
        render={() => (
          <input
            type="date"
            value={formData.warrantyExpiry || ''}
            onChange={onChange('warrantyExpiry')}
            onBlur={onBlur('warrantyExpiry')}
            min={warrantyMinDate}
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
            value={formData.location || ''}
            onChange={onChange('location')}
            onBlur={onBlur('location')}
          >
            <option value="">Select Location</option>
            {LOCATIONS.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        )}
      />

      {/* Department */}
      <FormField
        id="department"
        label="Department"
        required
        error={errors.department}
        render={() => (
          <select
            value={formData.department || ''}
            onChange={onChange('department')}
            onBlur={onBlur('department')}
          >
            <option value="">Select Department</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        )}
      />

      {/* Justification / Notes */}
      <FormField
        id="justification"
        label="Justification / Notes"
        render={() => (
          <textarea
            rows={3}
            placeholder="Enter any additional notes (optional)"
            value={formData.justification || ''}
            onChange={onChange('justification')}
          />
        )}
      />
    </>
  );
}
