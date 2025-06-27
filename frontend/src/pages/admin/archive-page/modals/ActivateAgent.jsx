import styles from "./add-agent.module.css";
import { useState } from "react";

export default function TicketTaskAssign({ closeActivateAgent }) {


  return (
    <div className={styles.aaOverlayWrapper} onClick={closeActivateAgent}>
      <div className={styles.addAgentModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.aaExit} onClick={closeActivateAgent}>
          <i className="fa-solid fa-xmark"></i>
        </div>

        <div className={styles.aaBody}>
          <div className={styles.aaWrapper}>
          </div>
        </div>
      </div>
    </div>
  );
}
