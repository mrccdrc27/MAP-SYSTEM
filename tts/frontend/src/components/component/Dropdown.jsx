import { useEffect, useRef, useState } from "react";
import styles from "./dropdown.module.css";
import { FiChevronDown, FiX } from "react-icons/fi";

const DynamicDropdown = ({
  options = [],
  multiple = false,
  onChange,
  label,
  selectedItems = [],
  labelKey = "label",
  secondaryKey,          // optional (e.g. "category", "type")
  searchKeys = ["label"] // fields used for search
}) => {
  const [search, setSearch] = useState("");
  const [openDropdown, setOpenDropdown] = useState(false);
  const wrapperRef = useRef(null);

  const filteredOptions = options.filter((opt) =>
    searchKeys.some((key) =>
      String(opt?.[key] ?? "")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  );

  const toggleMulti = (opt) => {
    const exists = selectedItems.some(
      (item) => item[labelKey] === opt[labelKey]
    );

    const updatedSelection = exists
      ? selectedItems.filter((item) => item[labelKey] !== opt[labelKey])
      : [...selectedItems, opt];

    onChange(updatedSelection);
  };

  const selectSingle = (opt) => {
    onChange([opt]);
    setOpenDropdown(false);
    setSearch("");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.ddDropdownWrapper} ref={wrapperRef}>
      <div className={styles.ddDropdown}>
        <button
          type="button"
          className={styles.ddDropdownButton}
          onClick={() => setOpenDropdown((prev) => !prev)}
        >
          {multiple
            ? `${selectedItems.length} Selected`
            : selectedItems[0]?.[labelKey] || `Select ${label}`}
          <span
            className={`${styles.ddDropdownArrow} ${
              openDropdown ? styles.open : ""
            }`}
          >
            <FiChevronDown />
          </span>
        </button>

        {openDropdown && (
          <div className={styles.ddDropdownMenu}>
            <input
              className={styles.ddSearchInput}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <ul className={styles.ddDropdownList}>
              {filteredOptions.length === 0 && (
                <li className={styles.ddEmptyState}>No options found.</li>
              )}

              {filteredOptions.map((opt) => {
                const isSelected = selectedItems.some(
                  (item) => item[labelKey] === opt[labelKey]
                );

                return (
                  <li
                    key={opt[labelKey]}
                    className={`${styles.ddDropdownItem} ${
                      isSelected ? styles.selected : ""
                    }`}
                    onClick={() =>
                      multiple ? toggleMulti(opt) : selectSingle(opt)
                    }
                  >
                    {opt[labelKey]}

                    {secondaryKey && opt[secondaryKey] && (
                      <span className={styles.ddCategory}>
                        ({opt[secondaryKey]})
                      </span>
                    )}

                    {multiple && isSelected && <span>✓</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {multiple && selectedItems.length > 0 && (
        <div className={styles.ddTagsContainer}>
          {selectedItems.map((item) => (
            <span key={item[labelKey]} className={styles.ddTag}>
              {item[labelKey]}
              <button
                type="button"
                className={styles.ddTagRemove}
                onClick={() => toggleMulti(item)}
              >
                <FiX />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default DynamicDropdown;
