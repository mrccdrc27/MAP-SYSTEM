import Select from "react-select";
import "../../styles/SortModal.css";
import { useState } from "react";

export default function SortModal({ setOptionSelected, selectedOption }) {
  const sortOptions = [
    { value: "name (a-z)", label: "Name (a-z)" },
    { value: "name (z-a)", label: "Name (z-a)" },
    {
      value: "minimum quantity (lowest first).",
      label: "Minimum Quantity (lowest first)",
    },
    {
      value: "minimum quantity (highest first).",
      label: "Minimum Quantity (highest first)",
    },
    {
      value: "purchase date (newest first).",
      label: "Purchase Date (newest first)",
    },
    {
      value: "purchase date (oldest first).",
      label: "Purchase Date (oldest first)",
    },
  ];

  const customStylesDropdown = {
    control: (provided) => ({
      ...provided,
      width: "100%",
      borderRadius: "10px",
      fontSize: "0.875rem",
      padding: "3px 8px",
    }),
    container: (provided) => ({
      ...provided,
      width: "100%",
    }),
    option: (provided, state) => ({
      ...provided,
      color: state.isSelected ? "white" : "grey",
      fontSize: "0.875rem",
    }),
  };

  return (
    <main className="sort-modal" onClick={(e) => e.stopPropagation()}>
      {/* Prevents the click event from propagating to parent elements, which can close the modal */}
      <p>SORT BY</p>
      <Select
        options={sortOptions}
        styles={customStylesDropdown}
        placeholder="Select sorting..."
        onChange={(selectedOption) => {
          /* Pass the selectedOption value to the callback function for updating the state.
          (This value will then be passed to the page where the modal is rendered.) */
          setOptionSelected(selectedOption);
        }}
        defaultValue={selectedOption}
      />
    </main>
  );
}
