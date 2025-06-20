// style
import styles from "./add-workflow.module.css";
import { useState } from "react";

export default function AddWorkflow({ closeAddWorkflow }) {
  // Local state for the form inputs
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!description || !name || !description || !category || !subCategory) {
      alert("Please fill in all fields");
      return;
    }

    // Here you can add the logic to send the data to the backend
    console.log("Submitting:", { name, description, category, subCategory });

    // After submitting, close the modal
    closeAddWorkflow();
  };
  return (
    <div className={styles.awOverlayWrapper} onClick={closeAddWorkflow}>
      <div
        className={styles.addWorkflowModal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className={styles.awExit} onClick={closeAddWorkflow}>
          <i className="fa-solid fa-xmark"></i>
        </div>

        {/* Modal Header */}
        <div className={styles.awHeader}>
          <h2>Workflow Creator</h2>
        </div>

        {/* Modal Body */}
        <div className={styles.awBody}>
          <form onSubmit={handleSubmit} className={styles.awWrapper}>
            {/* Name Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Workflow Name"
              />
            </div>

            {/* Description Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="description">Description</label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter Description"
              />
            </div>

            {/* Category Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="category">Category</label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Enter Category"
              />
            </div>

            {/* Sub-category Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="subCategory">Sub-category</label>
              <input
                type="text"
                id="subCategory"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="Enter Sub-category"
              />
            </div>

            {/* Submit Button */}
            <button type="submit" className={styles.submitBtn}>
              Create Workflow
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
