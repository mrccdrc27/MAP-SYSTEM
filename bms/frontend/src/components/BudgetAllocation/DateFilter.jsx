import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

const DateFilter = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const wrapperRef = useRef(null);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (day) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const renderCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ height: "30px" }} />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = value === currentStr;
      
      days.push(
        <div 
          key={d} 
          onClick={() => handleSelect(d)} 
          style={{ 
            textAlign: "center", cursor: "pointer", borderRadius: "4px", fontSize: "13px",
            lineHeight: "30px", height: "30px",
            backgroundColor: isSelected ? "#007bff" : "transparent",
            color: isSelected ? "white" : "#333",
            fontWeight: isSelected ? "bold" : "normal"
          }}
          onMouseEnter={(e) => !isSelected && (e.target.style.backgroundColor = "#f0f0f0")}
          onMouseLeave={(e) => !isSelected && (e.target.style.backgroundColor = "transparent")}
        >
          {d}
        </div>
      );
    }
    return days;
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ 
          display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", 
          border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "white", 
          cursor: "pointer", fontSize: "13px", height: "40px", minWidth: "150px" 
        }}
      >
        <Calendar size={16} color="#007bff" />
        <span style={{ flex: 1, textAlign: "left", color: value ? "#000" : "#666" }}>
          {value || "Filter by Date"}
        </span>
        {value ? (
          <X size={14} onClick={(e) => { e.stopPropagation(); onChange(""); }} />
        ) : (
          <ChevronDown size={14} />
        )}
      </button>

      {isOpen && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "5px", background: "white", border: "1px solid #ccc", borderRadius: "8px", padding: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 2000, width: "280px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", alignItems: "center" }}>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={{ border: "none", background: "none", cursor: "pointer" }}><ChevronLeft size={18} /></button>
            <span style={{ fontWeight: "600", fontSize: "14px" }}>{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={{ border: "none", background: "none", cursor: "pointer" }}><ChevronRight size={18} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "5px", textAlign: "center", fontSize: "12px", color: "#666", fontWeight: "bold" }}>
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {renderCalendarDays()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter;