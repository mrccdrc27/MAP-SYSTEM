import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItem = options.find(
    (opt) => String(opt.value) === String(value),
  );
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: "8px 12px",
          border: disabled ? "1px solid #e9ecef" : "1px solid #ccc",
          borderRadius: "4px",
          backgroundColor: disabled ? "#e9ecef" : "white",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: "38px",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            color: selectedItem ? "#000" : "#666",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronDown size={16} color="#666" />
      </div>

      {isOpen && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            marginTop: "4px",
            maxHeight: "200px",
            overflowY: "auto",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              padding: "8px",
              position: "sticky",
              top: 0,
              background: "white",
            }}
          >
            <input
              type="text"
              placeholder="Type to filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "6px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: "14px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f8f9fa",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "#f0f8ff")
                }
                onMouseLeave={(e) => (e.target.style.backgroundColor = "white")}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: "10px",
                color: "#999",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
