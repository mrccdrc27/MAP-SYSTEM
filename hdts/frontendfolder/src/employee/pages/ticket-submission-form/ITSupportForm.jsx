import { useState } from 'react';

const itSupportSubCategories = [
  'Technical Assistance',
  'Software Installation/Update',
  'Hardware Troubleshooting',
  'Email/Account Access Issue',
  'Internet/Network Connectivity Issue',
  'Printer/Scanner Setup or Issue',
  'System Performance Issue',
  'Virus/Malware Check',
  'IT Consultation Request',
  'Data Backup/Restore'
];

const deviceTypes = [
  'Laptop',
  'Printer',
  'Projector',
  'Monitor',
  'Other'
];

export default function ITSupportForm({ formData, onChange, onBlur, errors, FormField }) {
  return (
    <>
      {/* Device Type */}
      <FormField
        id="deviceType"
        label="Device Type"
        required
        error={errors.deviceType}
        render={() => (
          <select
            value={formData.deviceType}
            onChange={onChange('deviceType')}
            onBlur={onBlur('deviceType')}
          >
            <option value="">Select Device Type</option>
            {deviceTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}
      />

      {/* Custom Device Type - Shown when "Other" is selected */}
      {formData.deviceType === 'Other' && (
        <FormField
          id="customDeviceType"
          label="Please Specify Device Type"
          render={() => (
            <input
              type="text"
              placeholder="Enter device type"
              value={formData.customDeviceType || ''}
              onChange={onChange('customDeviceType')}
              onBlur={onBlur('customDeviceType')}
            />
          )}
        />
      )}

      {/* Software Affected */}
      <FormField
        id="softwareAffected"
        label="Software Affected (Problem inside the device)"
        render={() => (
          <input
            type="text"
            placeholder="Enter affected software"
            value={formData.softwareAffected}
            onChange={onChange('softwareAffected')}
            onBlur={onBlur('softwareAffected')}
          />
        )}
      />
    </>
  );
}
