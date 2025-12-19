const ticketConfig = {
  general: {
    label: "General Request",
    fields: [
      { name: "subject", type: "text", label: "Subject" },
      { name: "description", type: "textarea", label: "Description" },
      { 
        name: "categoryDetail", 
        type: "select", 
        label: "Category", 
        options: [
          "IT Support",
          "Asset Check In (Asset Return)",
          "Asset Check-Out (Employee Request)",
          "Capital Expenses (CapEx)",
          "Operational Expenses (OpeEx)",
          "Reimbursement Claim (Liabilities)",
          "Charging Department (Cost Center)"
        ]
      },
      { name: "scheduleRequest", type: "date", label: "Schedule Request" },
      { name: "file", type: "file", label: "File Upload" }
    ]
  },

  itSupport: {
    label: "IT Support Request",
    fields: [
      { name: "subcategory", type: "select", label: "Sub Category", options: [
        "Technical Assistance",
        "Software Installation/Update",
        "Hardware Troubleshooting",
        "Email/Account Access Issue",
        "Internet/Network Connectivity Issue",
        "Printer/Scanner Setup or Issue",
        "System Performance Issue",
        "Virus/Malware Check",
        "IT Consultation Request",
        "Data Backup/Restore"
      ]},
      { name: "deviceType", type: "select", label: "Device Type (Optional)", options: [
        "Laptop", "Printer", "Projector", "Monitor"
      ]},
      { name: "softwareAffected", type: "text", label: "Software Affected (Optional)" },
      { name: "file", type: "file", label: "File Upload" }
    ]
  },

  assetCheckIn: {
    label: "AMS Request Ticket (Asset Check-In)",
    fields: [
      { name: "subcategory", type: "select", label: "Product Type", options: [
        "Laptop", "Printer", "Projector", "Mouse", "Keyboard"
      ]},
      { name: "assetName", type: "select", label: "Asset Name", options: [
        "Dell Latitude 5420",
        "HP ProBook 450 G9",
        "Lenovo ThinkPad X1"
      ]},
      { name: "serialNumber", type: "text", label: "Serial Number", autoFillFrom: "assetName" },
      { name: "location", type: "text", label: "Location" },
      { name: "issue", type: "select", label: "Specify Issue", options: [
        "Not Functioning",
        "Missing Accessories (charger, case)",
        "Physical Damage",
        "Battery Issue",
        "Software Issue",
        "Screen/Display Issue",
        "Other"
      ]},
      { name: "file", type: "file", label: "File Upload" }
    ]
  },

  assetCheckOut: {
    label: "AMS Request Ticket (Asset Check-Out)",
    fields: [
      { name: "subcategory", type: "select", label: "Product Type", options: [
        "Laptop", "Printer", "Projector", "Mouse", "Keyboard"
      ]},
      { name: "assetName", type: "select", label: "Asset Name", options: [
        "Dell Latitude 5420",
        "HP ProBook 450 G9",
        "Lenovo ThinkPad X1"
      ]},
      { name: "serialNumber", type: "text", label: "Serial Number", autoFillFrom: "assetName" },
      { name: "location", type: "text", label: "Location" }
    ]
  }
};

export default ticketConfig;
