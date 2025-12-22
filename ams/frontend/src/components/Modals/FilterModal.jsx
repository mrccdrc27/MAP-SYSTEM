import Select from "react-select";
import "../../styles/FilterModal.css";
import { useState } from "react";

export default function FilterModal({
  setCategoryOptionSelected,
  setLocationOptionSelected,
  categorySelected,
  locationSelected,
}) {
  const categoryOptions = [
    { value: "cables", label: "Cables" },
    { value: "chargers", label: "Chargers" },
    { value: "keyboards", label: "Keyboards" },
  ];

  const locationOptions = [
    { value: "makati", label: "Makati" },
    { value: "pasig", label: "Pasig" },
    { value: "marikina", label: "Marikina" },
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
    <main className="filter-modal" onClick={(e) => e.stopPropagation()}>
      {/* Prevents the click event from propagating to parent elements, which can close the modal */}
      <p>FILTER BY</p>
      <fieldset>
        <label htmlFor="category">Category:</label>
        <Select
          options={categoryOptions}
          styles={customStylesDropdown}
          placeholder="Select category..."
          onChange={(selectedOption) => {
            /* Pass the selectedOption value to the callback function for updating the state.
          (This value will then be passed to the page where the modal is rendered.) */
            setCategoryOptionSelected(selectedOption);
          }}
          defaultValue={categorySelected}
        />
      </fieldset>
      <fieldset>
        <label htmlFor="location">Location:</label>
        <Select
          options={locationOptions}
          styles={customStylesDropdown}
          placeholder="Select location..."
          onChange={(selectedOption) => {
            /* Pass the selectedOption value to the callback function for updating the state.
          (This value will then be passed to the page where the modal is rendered.) */
            setLocationOptionSelected(selectedOption);
          }}
          defaultValue={locationSelected}
        />
      </fieldset>
    </main>
  );
}
