// style
import styles from "./add-agent.module.css";
import { useState } from "react";

export default function AddAgent({ closeAddAgent }) {
  // Local state for the form inputs
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !name) {
      alert("Please fill in both fields");
      return;
    }

    // Here you can add the logic to send the data to the backend
    console.log("Submitting:", { email, name });

    // After submitting, close the modal
    closeAddAgent();
  };

  return (
    <div className={styles.aaOverlayWrapper} onClick={closeAddAgent}>
      <div
        className={styles.addAgentModal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className={styles.aaExit} onClick={closeAddAgent}>
          <i className="fa-solid fa-xmark"></i>
        </div>

        {/* Modal Header */}
        <div className={styles.aaHeader}>
          <h2>Invite an Agent</h2>
        </div>

        {/* Modal Body */}
        <div className={styles.aaBody}>
          <form onSubmit={handleSubmit} className={styles.aaWrapper}>
            {/* Name Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter agent's name"
              />
            </div>

            {/* Email Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter agent's email"
              />
            </div>

            {/* Submit Button */}
            <button type="submit" className={styles.submitBtn}>
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
