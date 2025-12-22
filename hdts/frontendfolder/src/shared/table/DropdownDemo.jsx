import React from "react";

export default function DropdownDemo({ name, value, onChange, options = [], className }) {
  return (
    <select name={name} value={value} onChange={onChange} className={className}>
      <option value="">Select {name}</option>
      {options.map((opt) => (
        <option key={opt.value || opt} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
  );
}
