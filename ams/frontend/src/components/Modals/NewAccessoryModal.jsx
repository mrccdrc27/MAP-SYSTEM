import "../../styles/NewAccessoryModal.css";
import CloseIcon from "../../assets/icons/close.svg";
import { useState } from "react";

export default function NewAccessoryModal({ save, closeModal }) {
  const [categoryName, setCategoryName] = useState(null);

  return (
    <main className="new-accessory-modal">
      <div className="overlay" onClick={closeModal}></div>
      <div className="content">
        <button className="close-button" onClick={closeModal}>
          <img src={CloseIcon} alt="" />
        </button>
        <h3>New Accessory!</h3>
        <form action="" method="post">
          <fieldset>
            <label htmlFor="category-name">Category Name *</label>
            <input
              type="text"
              placeholder="Category Name..."
              required
              onChange={(event) => setCategoryName(event.target.value)}
            />
          </fieldset>
        </form>
        <div>
          <button className="cancel-button" onClick={closeModal}>
            Cancel
          </button>
          <button
            className="save-button"
            onClick={() => {
              save(categoryName);
            }}
          >
            Save
          </button>
        </div>
      </div>
    </main>
  );
}
