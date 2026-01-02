// Shared ticket categories used by the ticket submission form and reports
export const TICKET_CATEGORIES = [
  'IT Support',
  'Asset Check In',
  'Asset Check Out',
  'Asset Request',
  'Asset Registration',
  'Asset Repair',
  'Asset Incident',
  'Asset Disposal',
  'New Budget Proposal',
  'Others'
];

// Sub-categories for Asset Request
export const ASSET_REQUEST_SUB_CATEGORIES = [
  'New Asset',
  'Asset Renewal'
];

// Sub-categories for Asset Repair
export const ASSET_REPAIR_SUB_CATEGORIES = [
  'Corrective Repair',
  'Preventive Maintenance',
  'Upgrade',
  'Part Replacement',
  'OS Re-imaging',
  'Warranty Service'
];

// Sub-categories for Asset Incident
export const ASSET_INCIDENT_SUB_CATEGORIES = [
  'Stolen',
  'Damage',
  'Employee Resign'
];

// Asset categories (fetched from AMS in production)
export const ASSET_CATEGORIES = [
  'Laptops',
  'Desktops',
  'Monitors',
  'Printers',
  'Projectors',
  'Networking Equipment',
  'Servers',
  'Mobile Devices',
  'Peripherals',
  'Other'
];

// Locations (should be fetched from backend in production)
export const LOCATIONS = [
  'Main Office - 1st Floor',
  'Main Office - 2nd Floor',
  'Main Office - 3rd Floor',
  'Branch Office - North',
  'Branch Office - South',
  'Warehouse',
  'Remote/Home Office',
  'Makati City',
  'Quezon City',
  'Manila'
];

// Departments (should be fetched from backend in production)
export const DEPARTMENTS = [
  'IT Department',
  'Human Resources',
  'Finance',
  'Marketing',
  'Operations',
  'Sales',
  'Engineering',
  'Customer Support',
  'Administration'
];

// Component categories for repair forms
export const COMPONENT_CATEGORIES = [
  'RAM',
  'Storage',
  'Battery',
  'Display',
  'Keyboard',
  'Motherboard',
  'Power Supply',
  'Graphics Card',
  'Network Card',
  'Other'
];
