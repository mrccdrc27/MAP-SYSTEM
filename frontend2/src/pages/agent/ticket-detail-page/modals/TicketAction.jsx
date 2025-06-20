// style
import styles from "./ticket-action.module.css";

// react
import { useState } from "react";
  
export default function TicketAction({ closeTicketAction, ticket }) {
  return (
    <div
      className={styles.taOverlayWrapper}
      onClick={() => {
        closeTicketAction(false);
      }}
    >
      <div
        className={styles.ticketActionModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.taExit}
          onClick={() => {
            closeTicketAction(false);
          }}
        >
          <i className="fa-solid fa-xmark"></i>
        </div>
        <div className={styles.taHeader}>
          <h1>Ticket No. {ticket?.ticket_id}</h1>
          <div className={styles.taSubject}>{ticket?.subject}</div>
        </div>
        <div className={styles.tdMetaData}>
          <p className={styles.tdDateOpened}>Opened On: {ticket?.opened_on}</p>
          <p className={styles.tdDateResolution}>Expected Resolution: </p>
        </div>
        <div className={styles.taBody}>
          <div className={styles.taDescriptionCont}>
            <h3>Description</h3>
            <p>{ticket?.description}</p>
          </div>
          <div className={styles.taActionStatusCont}>
            <select name="ticket-action-status" className={styles.actionStatus}>
              <option value="" disabled>
                Please select an option
              </option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="On Hold">On Hold</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>
          <button className={styles.taActionButton}>Push Changes</button>
        </div>
      </div>
    </div>
  );
}
