import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { getAllDepartments } from "../../API/departments";

const DepartmentDropdown = ({
  selectedDepartment,
  onSelect,
  disabled = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Map department codes to full names
  const departmentNameMap = {
    "MERCH": "Merchandising",
    "SALES": "Sales", 
    "MARKET": "Marketing",
    "OPS": "Operations",
    "IT": "IT",
    "LOG": "Logistics Management",
    "HR": "Human Resources",
    "FIN": "Finance Department"
  };

  // Function to get full department name from code
  const getFullDepartmentName = (code) => {
    return departmentNameMap[code] || code;
  };

  // Function to shorten department name for display
  const shortenDepartmentName = (name, maxLength = 20) => {
    if (!name || name.length <= maxLength) return name;
    const abbreviations = {
      Department: "Dept.",
      Management: "Mgmt.",
      Operations: "Ops.",
      Merchandising: "Merch.",
      Marketing: "Mktg.",
      Logistics: "Log.",
      "Human Resources": "HR",
      "Information Technology": "IT",
      Finance: "Fin.",
    };
    
    let shortened = name;
    for (const [full, abbr] of Object.entries(abbreviations)) {
      shortened = shortened.replace(new RegExp(full, "gi"), abbr);
    }
    
    if (shortened.length <= maxLength) return shortened;
    return shortened.substring(0, maxLength - 3) + "...";
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const deptRes = await getAllDepartments();
        
        // Transform API data: map codes to full names
        const transformedOptions = deptRes.data.map((dept) => ({
          value: dept.code,
          label: departmentNameMap[dept.code] || dept.code,
          originalName: dept.name // Keep original for reference
        }));
        
        // Add "All Departments" option
        setDepartmentOptions([
          { value: "", label: "All Departments" },
          ...transformedOptions
        ]);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
        // Fallback to static options if API fails
        setDepartmentOptions([
          { value: "", label: "All Departments" },
          ...Object.entries(departmentNameMap).map(([code, name]) => ({
            value: code,
            label: name,
            originalName: name
          }))
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const toggleDropdown = () => {
    if (!disabled) {
      setShowDropdown(!showDropdown);
    }
  };

  const handleSelect = (value) => {
    onSelect(value);
    setShowDropdown(false);
  };

  // Find selected department
  const selectedOption = departmentOptions.find(dept => dept.value === selectedDepartment);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".department-dropdown")) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="department-dropdown filter-dropdown" style={{ position: "relative" }}>
      <button
        className={`filter-dropdown-btn ${showDropdown ? "active" : ""}`}
        onClick={toggleDropdown}
        onMouseDown={(e) => e.preventDefault()}
        disabled={disabled}
        style={{
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          backgroundColor: disabled ? "#f5f5f5" : "white",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          outline: "none",
          minWidth: "160px",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "140px",
            color: disabled ? "#666" : "#000",
          }}
        >
          {loading ? (
            "Loading..."
          ) : selectedOption ? (
            shortenDepartmentName(selectedOption.label)
          ) : (
            "All Departments"
          )}
        </span>
        <ChevronDown 
          size={14} 
          style={{ 
            transform: showDropdown ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
            opacity: disabled ? 0.5 : 1
          }}
        />
      </button>
      
      {showDropdown && !loading && (
        <div
          className="department-dropdown-menu"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            width: "100%",
            zIndex: 1000,
            maxHeight: "250px",
            overflowY: "auto",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          {departmentOptions.map((dept) => (
            <div
              key={dept.value}
              className={`department-dropdown-item ${
                selectedDepartment === dept.value ? "active" : ""
              }`}
              onClick={() => handleSelect(dept.value)}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor:
                  selectedDepartment === dept.value
                    ? "#f0f0f0"
                    : "white",
                outline: "none",
                fontSize: "14px",
                borderBottom: "1px solid #f5f5f5",
                transition: "background-color 0.2s",
                whiteSpace: "normal",
                wordWrap: "break-word",
              }}
              onMouseEnter={(e) => {
                if (selectedDepartment !== dept.value) {
                  e.currentTarget.style.backgroundColor = "#f9f9f9";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedDepartment !== dept.value) {
                  e.currentTarget.style.backgroundColor = "white";
                }
              }}
            >
              {dept.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentDropdown;