// style
import general from '../../style/general.module.css';

export function SearchBar({ value, onChange }) {
  return (
    <input
      className={general.searchBar}
      type="text"
      name="search-ticket"
      placeholder="Search..."
      value={value}
      onChange={onChange}
    />
  );
}

export function Dropdown({ name, value, onChange, options = [], placeholder = "Please select an option" }) {
  return (
    <select className={general.dropdown} name={name} value={value} onChange={onChange}>
      <option value="" disabled>{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export function Datetime({ name = "datetime", value, onChange, type = "date"}) {
  return(
    <input 
    className={general.dateTime}
    type={type}
    name={name}
    value={value}
    onChange={onChange}
    >
    </input>
  );
}

