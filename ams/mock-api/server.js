const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8010;

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// MOCK DATA
// ==========================================

const mockTickets = {
  unresolved: [
    // --- Asset Registration (5 items) ---
    {
      id: 1,
      ticket_number: "REG-001",
      ticket_type: "asset_registration",
      category: "Hardware",
      sub_category: "Laptop",
      asset_model_name: "MacBook Pro 16",
      asset_serial_number: "SN-REG-001",
      purchased_date: "2024-01-10",
      order_number: "PO-2024-1001",
      purchase_cost: 2500,
      warranty_exp: "2025-01-10",
      location: "HQ - IT Dept",
      department: "IT",
      justification: "New hire for Dev team",
      employee: 101,
      is_resolved: false,
      created_at: "2024-01-15T09:00:00Z",
      updated_at: "2024-01-15T09:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "John Smith" }
    },
    {
      id: 2,
      ticket_number: "REG-002",
      ticket_type: "asset_registration",
      category: "Hardware",
      sub_category: "Monitor",
      asset_model_name: "Dell UltraSharp 27",
      asset_serial_number: "SN-REG-002",
      purchased_date: "2024-01-12",
      order_number: "PO-2024-1002",
      purchase_cost: 450,
      warranty_exp: "2027-01-12",
      location: "Cebu Branch",
      department: "Design",
      justification: "Graphic Design Station",
      employee: 102,
      is_resolved: false,
      created_at: "2024-01-16T10:00:00Z",
      updated_at: "2024-01-16T10:00:00Z",
      location_details: { city: "Cebu" },
      requestor_details: { name: "Maria Garcia" }
    },
    {
      id: 3,
      ticket_number: "REG-003",
      ticket_type: "asset_registration",
      category: "Hardware",
      sub_category: "Printer",
      asset_model_name: "HP LaserJet Pro",
      asset_serial_number: "SN-REG-003",
      purchased_date: "2024-01-15",
      order_number: "PO-2024-1003",
      purchase_cost: 300,
      warranty_exp: "2025-01-15",
      location: "Davao Branch",
      department: "Admin",
      justification: "Replacement for broken printer",
      employee: 103,
      is_resolved: false,
      created_at: "2024-01-18T11:00:00Z",
      updated_at: "2024-01-18T11:00:00Z",
      location_details: { city: "Davao" },
      requestor_details: { name: "Robert Johnson" }
    },
    {
      id: 4,
      ticket_number: "REG-004",
      ticket_type: "asset_registration",
      category: "Hardware",
      sub_category: "Desktop",
      asset_model_name: "Optiplex 7090",
      asset_serial_number: "SN-REG-004",
      purchased_date: "2024-01-20",
      order_number: "PO-2024-1004",
      purchase_cost: 1200,
      warranty_exp: "2027-01-20",
      location: "HQ - Finance",
      department: "Finance",
      justification: "Financial Analyst Workstation",
      employee: 104,
      is_resolved: false,
      created_at: "2024-01-22T09:30:00Z",
      updated_at: "2024-01-22T09:30:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Sarah Wilson" }
    },
    {
      id: 5,
      ticket_number: "REG-005",
      ticket_type: "asset_registration",
      category: "Hardware",
      sub_category: "Tablet",
      asset_model_name: "iPad Air 5",
      asset_serial_number: "SN-REG-005",
      purchased_date: "2024-01-25",
      order_number: "PO-2024-1005",
      purchase_cost: 600,
      warranty_exp: "2025-01-25",
      location: "HQ - Sales",
      department: "Sales",
      justification: "Field Sales Device",
      employee: 105,
      is_resolved: false,
      created_at: "2024-01-26T14:00:00Z",
      updated_at: "2024-01-26T14:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Michael Brown" }
    },

    // --- Asset Checkout (5 items) ---
    {
      id: 6,
      ticket_number: "OUT-001",
      ticket_type: "asset_checkout",
      category: "Hardware",
      sub_category: "Laptop",
      subject: "Checkout for Project Alpha",
      asset_id_number: "AST-101",
      asset_serial_number: "SN-101",
      location: "Manila",
      request_date: "2024-02-01",
      checkout_date: "2024-02-02",
      expected_return_date: "2024-03-02",
      condition: "Good",
      notes: "Project deployment",
      employee: 101,
      is_resolved: false,
      created_at: "2024-02-01T08:00:00Z",
      updated_at: "2024-02-01T08:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "John Smith" }
    },
    {
      id: 7,
      ticket_number: "OUT-002",
      ticket_type: "asset_checkout",
      category: "Hardware",
      sub_category: "Projector",
      subject: "Conference Room Setup",
      asset_id_number: "AST-102",
      asset_serial_number: "SN-102",
      location: "Cebu",
      request_date: "2024-02-03",
      checkout_date: "2024-02-04",
      expected_return_date: "2024-02-05",
      condition: "Excellent",
      notes: "Client presentation",
      employee: 102,
      is_resolved: false,
      created_at: "2024-02-03T10:00:00Z",
      updated_at: "2024-02-03T10:00:00Z",
      location_details: { city: "Cebu" },
      requestor_details: { name: "Maria Garcia" }
    },
    {
      id: 8,
      ticket_number: "OUT-003",
      ticket_type: "asset_checkout",
      category: "Accessory",
      sub_category: "Headset",
      subject: "New Employee Kit",
      asset_id_number: "AST-103",
      asset_serial_number: "SN-103",
      location: "Davao",
      request_date: "2024-02-05",
      checkout_date: "2024-02-06",
      expected_return_date: "2024-08-06",
      condition: "New",
      notes: "Standard issue",
      employee: 103,
      is_resolved: false,
      created_at: "2024-02-05T09:00:00Z",
      updated_at: "2024-02-05T09:00:00Z",
      location_details: { city: "Davao" },
      requestor_details: { name: "Robert Johnson" }
    },
    {
      id: 9,
      ticket_number: "OUT-004",
      ticket_type: "asset_checkout",
      category: "Hardware",
      sub_category: "Mobile Phone",
      subject: "Testing Device",
      asset_id_number: "AST-104",
      asset_serial_number: "SN-104",
      location: "Manila",
      request_date: "2024-02-07",
      checkout_date: "2024-02-08",
      expected_return_date: "2024-02-28",
      condition: "Fair",
      notes: "QA Testing",
      employee: 104,
      is_resolved: false,
      created_at: "2024-02-07T11:00:00Z",
      updated_at: "2024-02-07T11:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Sarah Wilson" }
    },
    {
      id: 10,
      ticket_number: "OUT-005",
      ticket_type: "asset_checkout",
      category: "Hardware",
      sub_category: "Laptop",
      subject: "Temporary Loaner",
      asset_id_number: "AST-105",
      asset_serial_number: "SN-105",
      location: "Manila",
      request_date: "2024-02-09",
      checkout_date: "2024-02-10",
      expected_return_date: "2024-02-17",
      condition: "Good",
      notes: "While main laptop is repaired",
      employee: 105,
      is_resolved: false,
      created_at: "2024-02-09T13:00:00Z",
      updated_at: "2024-02-09T13:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Michael Brown" }
    },

    // --- Asset Checkin (5 items) ---
    {
      id: 11,
      ticket_number: "IN-001",
      ticket_type: "asset_checkin",
      category: "Hardware",
      sub_category: "Laptop",
      subject: "Returning Loaner",
      asset_id_number: "AST-105",
      asset_serial_number: "SN-105",
      status: "Pending Inspection",
      checkin_date: "2024-02-17",
      checkout_ticket_reference: "OUT-005",
      location: "Manila",
      department: "Sales",
      condition: "Good",
      notes: "Returned on time",
      employee: 105,
      is_resolved: false,
      created_at: "2024-02-17T09:00:00Z",
      updated_at: "2024-02-17T09:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Michael Brown" }
    },
    {
      id: 12,
      ticket_number: "IN-002",
      ticket_type: "asset_checkin",
      category: "Hardware",
      sub_category: "Projector",
      subject: "Return Conference Equipment",
      asset_id_number: "AST-102",
      asset_serial_number: "SN-102",
      status: "Pending Inspection",
      checkin_date: "2024-02-05",
      checkout_ticket_reference: "OUT-002",
      location: "Cebu",
      department: "Design",
      condition: "Excellent",
      notes: "No issues",
      employee: 102,
      is_resolved: false,
      created_at: "2024-02-05T16:00:00Z",
      updated_at: "2024-02-05T16:00:00Z",
      location_details: { city: "Cebu" },
      requestor_details: { name: "Maria Garcia" }
    },
    {
      id: 13,
      ticket_number: "IN-003",
      ticket_type: "asset_checkin",
      category: "Hardware",
      sub_category: "Mobile Phone",
      subject: "Testing Complete",
      asset_id_number: "AST-104",
      asset_serial_number: "SN-104",
      status: "Needs Cleaning",
      checkin_date: "2024-02-28",
      checkout_ticket_reference: "OUT-004",
      location: "Manila",
      department: "QA",
      condition: "Fair",
      notes: "Screen has smudges",
      employee: 104,
      is_resolved: false,
      created_at: "2024-02-28T10:00:00Z",
      updated_at: "2024-02-28T10:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Sarah Wilson" }
    },
    {
      id: 14,
      ticket_number: "IN-004",
      ticket_type: "asset_checkin",
      category: "Hardware",
      sub_category: "Laptop",
      subject: "Employee Resignation",
      asset_id_number: "AST-201",
      asset_serial_number: "SN-201",
      status: "Pending Wipe",
      checkin_date: "2024-03-01",
      checkout_ticket_reference: "OUT-OLD-01",
      location: "Davao",
      department: "HR",
      condition: "Good",
      notes: "Exit clearance",
      employee: 106,
      is_resolved: false,
      created_at: "2024-03-01T08:00:00Z",
      updated_at: "2024-03-01T08:00:00Z",
      location_details: { city: "Davao" },
      requestor_details: { name: "Alice Guo" }
    },
    {
      id: 15,
      ticket_number: "IN-005",
      ticket_type: "asset_checkin",
      category: "Accessory",
      sub_category: "Monitor",
      subject: "Upgrade Exchange",
      asset_id_number: "AST-202",
      asset_serial_number: "SN-202",
      status: "To Be Disposed",
      checkin_date: "2024-03-05",
      checkout_ticket_reference: "OUT-OLD-02",
      location: "Manila",
      department: "IT",
      condition: "Broken",
      notes: "Dead pixels",
      employee: 101,
      is_resolved: false,
      created_at: "2024-03-05T09:30:00Z",
      updated_at: "2024-03-05T09:30:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "John Smith" }
    },

    // --- Asset Repair (5 items) ---
    {
      id: 16,
      ticket_number: "REP-001",
      ticket_type: "asset_repair",
      category: "Hardware",
      sub_category: "Laptop",
      subject: "Broken Screen",
      repair_name: "Screen Replacement",
      repair_type: "Corrective Repair",
      asset_id_number: "AST-301",
      start_date: "2024-03-10",
      end_date: "2024-03-15",
      supplier: "FixIt Inc.",
      cost: 150,
      notes: "Dropped",
      employee: 101,
      is_resolved: false,
      created_at: "2024-03-09T08:00:00Z",
      updated_at: "2024-03-09T08:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "John Smith" }
    },
    {
      id: 17,
      ticket_number: "REP-002",
      ticket_type: "asset_repair",
      category: "Hardware",
      sub_category: "Desktop",
      subject: "Upgrade RAM",
      repair_name: "Memory Upgrade",
      repair_type: "Upgrade",
      asset_id_number: "AST-302",
      start_date: "2024-03-12",
      end_date: "2024-03-12",
      supplier: "Internal IT",
      cost: 80,
      notes: "Upgrade to 32GB",
      employee: 102,
      is_resolved: false,
      created_at: "2024-03-11T10:00:00Z",
      updated_at: "2024-03-11T10:00:00Z",
      location_details: { city: "Cebu" },
      requestor_details: { name: "Maria Garcia" }
    },
    {
      id: 18,
      ticket_number: "REP-003",
      ticket_type: "asset_repair",
      category: "Hardware",
      sub_category: "Printer",
      subject: "Paper Jam / Roller Issue",
      repair_name: "Roller Replacement",
      repair_type: "Preventive Maintenance",
      asset_id_number: "AST-303",
      start_date: "2024-03-15",
      end_date: "2024-03-16",
      supplier: "PrintMaster",
      cost: 50,
      notes: "Routine maintenance",
      employee: 103,
      is_resolved: false,
      created_at: "2024-03-14T09:00:00Z",
      updated_at: "2024-03-14T09:00:00Z",
      location_details: { city: "Davao" },
      requestor_details: { name: "Robert Johnson" }
    },
    {
      id: 19,
      ticket_number: "REP-004",
      ticket_type: "asset_repair",
      category: "Hardware",
      sub_category: "Server",
      subject: "Fan Noise",
      repair_name: "Fan Replacement",
      repair_type: "Part Replacement",
      asset_id_number: "AST-304",
      start_date: "2024-03-20",
      end_date: "2024-03-20",
      supplier: "ServerTech",
      cost: 200,
      notes: "Loud grinding noise",
      employee: 104,
      is_resolved: false,
      created_at: "2024-03-19T11:00:00Z",
      updated_at: "2024-03-19T11:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Sarah Wilson" }
    },
    {
      id: 20,
      ticket_number: "REP-005",
      ticket_type: "asset_repair",
      category: "Hardware",
      sub_category: "Laptop",
      subject: "Battery Replacement",
      repair_name: "Battery Swap",
      repair_type: "Part Replacement",
      asset_id_number: "AST-305",
      start_date: "2024-03-25",
      end_date: "2024-03-25",
      supplier: "Internal IT",
      cost: 100,
      notes: "Battery health < 80%",
      employee: 105,
      is_resolved: false,
      created_at: "2024-03-24T14:00:00Z",
      updated_at: "2024-03-24T14:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Michael Brown" }
    },

    // --- Asset Incident (5 items) ---
    {
      id: 21,
      ticket_number: "INC-001",
      ticket_type: "asset_incident",
      category: "Incident",
      sub_category: "Stolen",
      subject: "Laptop Stolen from Car",
      asset_id_number: "AST-401",
      incident_date: "2024-04-01",
      employee_name: "John Smith",
      last_location: "Parking Lot",
      schedule_audit: "2024-04-05",
      notes: "Police report filed",
      employee: 101,
      is_resolved: false,
      created_at: "2024-04-02T08:00:00Z",
      updated_at: "2024-04-02T08:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "John Smith" }
    },
    {
      id: 22,
      ticket_number: "INC-002",
      ticket_type: "asset_incident",
      category: "Incident",
      sub_category: "Damage",
      subject: "Water Spilled on Laptop",
      asset_id_number: "AST-402",
      incident_date: "2024-04-03",
      employee_name: "Maria Garcia",
      last_location: "Office Desk",
      schedule_audit: "2024-04-04",
      damage_description: "Keyboard and motherboard affected",
      notes: "Accidental spill",
      employee: 102,
      is_resolved: false,
      created_at: "2024-04-03T10:00:00Z",
      updated_at: "2024-04-03T10:00:00Z",
      location_details: { city: "Cebu" },
      requestor_details: { name: "Maria Garcia" }
    },
    {
      id: 23,
      ticket_number: "INC-003",
      ticket_type: "asset_incident",
      category: "Incident",
      sub_category: "Lost",
      subject: "Mobile Phone Lost in Transit",
      asset_id_number: "AST-403",
      incident_date: "2024-04-06",
      employee_name: "Robert Johnson",
      last_location: "Taxi",
      schedule_audit: "2024-04-07",
      notes: "Attempted to call, no answer",
      employee: 103,
      is_resolved: false,
      created_at: "2024-04-07T09:00:00Z",
      updated_at: "2024-04-07T09:00:00Z",
      location_details: { city: "Davao" },
      requestor_details: { name: "Robert Johnson" }
    },
    {
      id: 24,
      ticket_number: "INC-004",
      ticket_type: "asset_incident",
      category: "Incident",
      sub_category: "Damage",
      subject: "Monitor Fell off Desk",
      asset_id_number: "AST-404",
      incident_date: "2024-04-10",
      employee_name: "Sarah Wilson",
      last_location: "Home Office",
      schedule_audit: "2024-04-11",
      damage_description: "Screen shattered",
      notes: "Earthquake damage",
      employee: 104,
      is_resolved: false,
      created_at: "2024-04-10T11:00:00Z",
      updated_at: "2024-04-10T11:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Sarah Wilson" }
    },
    {
      id: 25,
      ticket_number: "INC-005",
      ticket_type: "asset_incident",
      category: "Incident",
      sub_category: "Employee Resign",
      subject: "Unaccounted Asset",
      asset_id_number: "AST-405",
      incident_date: "2024-04-15",
      employee_name: "Michael Brown",
      last_location: "Unknown",
      schedule_audit: "2024-04-20",
      notes: "Employee left without returning asset",
      employee: 105,
      is_resolved: false,
      created_at: "2024-04-16T14:00:00Z",
      updated_at: "2024-04-16T14:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Admin" }
    },

    // --- Asset Disposal (5 items) ---
    {
      id: 26,
      ticket_number: "DIS-001",
      ticket_type: "asset_disposal",
      category: "Disposal",
      sub_category: "E-Waste",
      subject: "Old Printers Disposal",
      command_note: "Proceed with certified recycler",
      notes: "5 units of HP Laserjet 1010",
      employee: 101,
      is_resolved: false,
      created_at: "2024-05-01T09:00:00Z",
      updated_at: "2024-05-01T09:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Admin User" }
    },
    {
      id: 27,
      ticket_number: "DIS-002",
      ticket_type: "asset_disposal",
      category: "Disposal",
      sub_category: "Write-off",
      subject: "Broken Chairs",
      command_note: "Dumpster disposal approved",
      notes: "10 broken office chairs",
      employee: 101,
      is_resolved: false,
      created_at: "2024-05-02T10:00:00Z",
      updated_at: "2024-05-02T10:00:00Z",
      location_details: { city: "Cebu" },
      requestor_details: { name: "Admin User" }
    },
    {
      id: 28,
      ticket_number: "DIS-003",
      ticket_type: "asset_disposal",
      category: "Disposal",
      sub_category: "Donation",
      subject: "Old Laptops for Charity",
      command_note: "Donate to Local School",
      notes: "20 Dell Latitude E7440",
      employee: 101,
      is_resolved: false,
      created_at: "2024-05-03T09:00:00Z",
      updated_at: "2024-05-03T09:00:00Z",
      location_details: { city: "Davao" },
      requestor_details: { name: "Admin User" }
    },
    {
      id: 29,
      ticket_number: "DIS-004",
      ticket_type: "asset_disposal",
      category: "Disposal",
      sub_category: "E-Waste",
      subject: "Defective Keyboards",
      command_note: "Recycle",
      notes: "50 units of various brands",
      employee: 101,
      is_resolved: false,
      created_at: "2024-05-04T11:00:00Z",
      updated_at: "2024-05-04T11:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Admin User" }
    },
    {
      id: 30,
      ticket_number: "DIS-005",
      ticket_type: "asset_disposal",
      category: "Disposal",
      sub_category: "Sale",
      subject: "Surplus Monitors",
      command_note: "Sell to employees",
      notes: "15 units of Samsung 24\"",
      employee: 101,
      is_resolved: false,
      created_at: "2024-05-05T14:00:00Z",
      updated_at: "2024-05-05T14:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Admin User" }
    }
  ],
  resolved: [
    // --- Asset Request (5 items) ---
    {
      id: 31,
      ticket_number: "REQ-001",
      ticket_type: "asset_request",
      category: "Hardware",
      sub_category: "Monitor",
      asset_model_number: "DELL-24-U",
      order_number: "ORD-2023-888",
      quantity: 5,
      subject: "New Monitors for Design Team",
      manufacturer: "Dell",
      supplier: "TechHub",
      specs: { screen_size: "24 inch", resolution: "4K" },
      purchased_cost: 200,
      total_cost_request: 1000,
      justification: "Upgrade for high res work",
      employee: 106,
      is_resolved: true,
      created_at: "2023-12-01T09:00:00Z",
      updated_at: "2023-12-05T09:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Alice Guo" }
    },
    {
      id: 32,
      ticket_number: "REQ-002",
      ticket_type: "asset_request",
      category: "Software",
      sub_category: "License",
      asset_model_number: "ADOBE-CC",
      order_number: "ORD-2023-889",
      quantity: 2,
      subject: "Adobe CC for Marketing",
      manufacturer: "Adobe",
      supplier: "Adobe Inc.",
      specs: { type: "Subscription", duration: "1 Year" },
      purchased_cost: 600,
      total_cost_request: 1200,
      justification: "New marketing hires",
      employee: 102,
      is_resolved: true,
      created_at: "2023-12-02T10:00:00Z",
      updated_at: "2023-12-06T10:00:00Z",
      location_details: { city: "Cebu" },
      requestor_details: { name: "Maria Garcia" }
    },
    {
      id: 33,
      ticket_number: "REQ-003",
      ticket_type: "asset_request",
      category: "Hardware",
      sub_category: "Server Rack",
      asset_model_number: "RACK-42U",
      order_number: "ORD-2023-890",
      quantity: 1,
      subject: "Additional Server Rack",
      manufacturer: "APC",
      supplier: "InfraSupply",
      specs: { height: "42U", type: "Enclosed" },
      purchased_cost: 1500,
      total_cost_request: 1500,
      justification: "Datacenter expansion",
      employee: 101,
      is_resolved: true,
      created_at: "2023-12-03T11:00:00Z",
      updated_at: "2023-12-07T11:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "John Smith" }
    },
    {
      id: 34,
      ticket_number: "REQ-004",
      ticket_type: "asset_request",
      category: "Hardware",
      sub_category: "Laptop",
      asset_model_number: "THINKPAD-X1",
      order_number: "ORD-2023-891",
      quantity: 10,
      subject: "Laptops for Sales Team",
      manufacturer: "Lenovo",
      supplier: "CorpIT",
      specs: { cpu: "i7", ram: "16GB", ssd: "512GB" },
      purchased_cost: 1300,
      total_cost_request: 13000,
      justification: "Refresh cycle",
      employee: 104,
      is_resolved: true,
      created_at: "2023-12-04T13:00:00Z",
      updated_at: "2023-12-08T13:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Sarah Wilson" }
    },
    {
      id: 35,
      ticket_number: "REQ-005",
      ticket_type: "asset_request",
      category: "Accessory",
      sub_category: "Docking Station",
      asset_model_number: "DELL-DOCK-WD19",
      order_number: "ORD-2023-892",
      quantity: 10,
      subject: "Docks for Hot Desking",
      manufacturer: "Dell",
      supplier: "TechHub",
      specs: { ports: "USB-C, HDMI, DP" },
      purchased_cost: 180,
      total_cost_request: 1800,
      justification: "New office layout",
      employee: 105,
      is_resolved: true,
      created_at: "2023-12-05T14:00:00Z",
      updated_at: "2023-12-09T14:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Michael Brown" }
    },
    
    // --- Asset Registration (Resolved - 1 example from before) ---
    {
      id: 36,
      ticket_number: "REG-000",
      ticket_type: "asset_registration",
      category: "Hardware",
      sub_category: "Desktop",
      asset_model_name: "Optiplex 7080",
      asset_serial_number: "SN-2023-555",
      purchased_date: "2023-11-15",
      order_number: "PO-2023-900",
      employee: 101,
      is_resolved: true,
      created_at: "2023-11-10T09:00:00Z",
      updated_at: "2023-11-15T09:00:00Z",
      location_details: { city: "Manila" },
      requestor_details: { name: "Admin" }
    }
  ]
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Simulate network delay
 */
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a single ticket with random field variations
 */
function generateRandomTicket(baseTicket, overrides = {}) {
  return {
    ...baseTicket,
    ...overrides,
    // Add slight variations to timestamps
    created_at: new Date(new Date(baseTicket.created_at).getTime() + Math.random() * 1000000).toISOString(),
    updated_at: new Date().toISOString()
  };
}

// ==========================================
// ROUTES
// ==========================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AMS Mock API Server',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /tickets/unresolved/
 * Returns all unresolved tickets
 */
app.get('/tickets/unresolved', async (req, res) => {
  try {
    // Simulate network delay
    await delay(300);

    // Get query parameters
    const { include_details = 'true', limit } = req.query;

    let tickets = [...mockTickets.unresolved];

    // Apply limit if provided
    if (limit) {
      tickets = tickets.slice(0, parseInt(limit));
    }

    // Optionally exclude enriched details
    if (include_details === 'false') {
      tickets = tickets.map(t => {
        const { location_details, requestor_details, ...rest } = t;
        return rest;
      });
    }

    console.log(`✓ GET /tickets/unresolved - returned ${tickets.length} tickets`);

    res.json(tickets);
  } catch (error) {
    console.error('✗ Error fetching unresolved tickets:', error);
    res.status(500).json({
      error: 'Failed to fetch unresolved tickets',
      message: error.message
    });
  }
});

/**
 * GET /tickets/resolved/
 * Returns all resolved tickets
 */
app.get('/tickets/resolved', async (req, res) => {
  try {
    // Simulate network delay
    await delay(300);

    // Get query parameters
    const { include_details = 'true', limit } = req.query;

    let tickets = [...mockTickets.resolved];

    // Apply limit if provided
    if (limit) {
      tickets = tickets.slice(0, parseInt(limit));
    }

    // Optionally exclude enriched details
    if (include_details === 'false') {
      tickets = tickets.map(t => {
        const { location_details, requestor_details, ...rest } = t;
        return rest;
      });
    }

    console.log(`✓ GET /tickets/resolved - returned ${tickets.length} tickets`);

    res.json(tickets);
  } catch (error) {
    console.error('✗ Error fetching resolved tickets:', error);
    res.status(500).json({
      error: 'Failed to fetch resolved tickets',
      message: error.message
    });
  }
});

/**
 * GET /tickets/:id
 * Returns a single ticket by ID
 */
app.get('/tickets/:id', async (req, res) => {
  try {
    await delay(200);

    const { id } = req.params;
    const ticketId = parseInt(id);

    // Search in both resolved and unresolved
    let ticket = mockTickets.unresolved.find(t => t.id === ticketId);
    if (!ticket) {
      ticket = mockTickets.resolved.find(t => t.id === ticketId);
    }

    if (!ticket) {
      console.log(`✗ GET /tickets/${id} - not found`);
      return res.status(404).json({
        error: 'Ticket not found',
        ticket_id: ticketId
      });
    }

    console.log(`✓ GET /tickets/${id} - returned ticket`);
    res.json(ticket);
  } catch (error) {
    console.error(`✗ Error fetching ticket:`, error);
    res.status(500).json({
      error: 'Failed to fetch ticket',
      message: error.message
    });
  }
});

/**
 * GET /tickets/by-asset/:asset_id
 * Returns ticket for a specific asset
 */
app.get('/tickets/by-asset/:asset_id', async (req, res) => {
  try {
    await delay(200);

    const { asset_id } = req.params;
    const { status } = req.query; // 'resolved' or 'unresolved'

    const assetId = parseInt(asset_id);

    let ticket = null;

    if (status === 'resolved') {
      ticket = mockTickets.resolved.find(t => t.asset === assetId);
    } else if (status === 'unresolved') {
      ticket = mockTickets.unresolved.find(t => t.asset === assetId);
    } else {
      // Return first match from either
      ticket = mockTickets.unresolved.find(t => t.asset === assetId) ||
               mockTickets.resolved.find(t => t.asset === assetId);
    }

    if (!ticket) {
      console.log(`✗ GET /tickets/by-asset/${asset_id} - not found`);
      return res.status(404).json({
        error: 'No ticket found for asset',
        asset_id: assetId
      });
    }

    console.log(`✓ GET /tickets/by-asset/${asset_id} - returned ticket`);
    res.json(ticket);
  } catch (error) {
    console.error(`✗ Error fetching ticket by asset:`, error);
    res.status(500).json({
      error: 'Failed to fetch ticket by asset',
      message: error.message
    });
  }
});

/**
 * PATCH /tickets/:id/resolve
 * Mark a ticket as resolved
 */
app.patch('/tickets/:id/resolve', async (req, res) => {
  try {
    await delay(400);

    const { id } = req.params;
    const ticketId = parseInt(id);

    // Find ticket in unresolved
    const index = mockTickets.unresolved.findIndex(t => t.id === ticketId);

    if (index === -1) {
      console.log(`✗ PATCH /tickets/${id}/resolve - not found`);
      return res.status(404).json({
        error: 'Ticket not found or already resolved',
        ticket_id: ticketId
      });
    }

    // Move to resolved
    const ticket = mockTickets.unresolved[index];
    ticket.is_resolved = true;
    ticket.updated_at = new Date().toISOString();

    mockTickets.unresolved.splice(index, 1);
    mockTickets.resolved.push(ticket);

    console.log(`✓ PATCH /tickets/${id}/resolve - ticket resolved`);
    res.json(ticket);
  } catch (error) {
    console.error(`✗ Error resolving ticket:`, error);
    res.status(500).json({
      error: 'Failed to resolve ticket',
      message: error.message
    });
  }
});

/**
 * POST /tickets
 * Create a new ticket
 */
app.post('/tickets', async (req, res) => {
  try {
    await delay(500);

    const { ticket_type, subject, employee, asset, location, checkout_date, return_date } = req.body;

    // Validate required fields
    if (!ticket_type || !subject || !employee || !asset || !location) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['ticket_type', 'subject', 'employee', 'asset', 'location']
      });
    }

    // Create new ticket
    const newId = Math.max(...mockTickets.unresolved.map(t => t.id), ...mockTickets.resolved.map(t => t.id)) + 1;
    const ticketNumber = String(newId).padStart(6, '0');

    const newTicket = {
      id: newId,
      ticket_number: ticketNumber,
      ticket_type,
      subject,
      employee,
      asset,
      location,
      is_resolved: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      checkout_date: ticket_type === 'checkout' ? checkout_date : null,
      return_date: ticket_type === 'checkout' ? return_date : null,
      asset_checkout: null,
      checkin_date: null,
      asset_checkin: null,
      location_details: mockTickets.unresolved[0]?.location_details || null,
      requestor_details: mockTickets.unresolved[0]?.requestor_details || null
    };

    mockTickets.unresolved.push(newTicket);

    console.log(`✓ POST /tickets - created ticket #${ticketNumber}`);
    res.status(201).json(newTicket);
  } catch (error) {
    console.error(`✗ Error creating ticket:`, error);
    res.status(500).json({
      error: 'Failed to create ticket',
      message: error.message
    });
  }
});

/**
 * GET /stats
 * Return API statistics
 */
app.get('/stats', (req, res) => {
  res.json({
    unresolved_count: mockTickets.unresolved.length,
    resolved_count: mockTickets.resolved.length,
    total_count: mockTickets.unresolved.length + mockTickets.resolved.length,
    endpoints: [
      'GET /tickets/unresolved',
      'GET /tickets/resolved',
      'GET /tickets/:id',
      'GET /tickets/by-asset/:asset_id',
      'PATCH /tickets/:id/resolve',
      'POST /tickets',
      'GET /health',
      'GET /stats'
    ]
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

/**
 * 404 handler
 */
app.use((req, res) => {
  console.log(`✗ 404 - ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    message: 'Try GET /stats to see available endpoints'
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('✗ Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     AMS Mock API Server - Running          ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`📍 Server listening on: http://localhost:${PORT}`);
  console.log('');
  console.log('Available Endpoints:');
  console.log('  GET    /health');
  console.log('  GET    /stats');
  console.log('  GET    /tickets/unresolved');
  console.log('  GET    /tickets/resolved');
  console.log('  GET    /tickets/:id');
  console.log('  GET    /tickets/by-asset/:asset_id');
  console.log('  PATCH  /tickets/:id/resolve');
  console.log('  POST   /tickets');
  console.log('');
  console.log('Frontend Config (.env):');
  console.log(`  VITE_INTEGRATION_TICKET_TRACKING_API_URL=http://localhost:${PORT}/`);
  console.log('');
  console.log('⏸️  Press Ctrl+C to stop the server');
  console.log('');
});