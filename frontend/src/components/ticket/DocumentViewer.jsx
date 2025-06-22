import React, { useState } from "react";
import styles from "./DocumentViewer.module.css";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";

export default function DocumentViewer({ attachments }) {
  const [activePdf, setActivePdf] = useState(null);

  const isPdf = (type) => type === "application/pdf";

  if (!attachments) {
    return <div className={styles.status}>Loading attachments...</div>;
  }

  if (attachments.length === 0) {
    return <div className={styles.status}>No file attached.</div>;
  }

  return (
    <div className={styles.container}>
      {attachments.map(({ id, file, file_name, file_type }) => (
        <div
          key={id}
          className={styles.card}
          onClick={() => {
            if (isPdf(file_type)) setActivePdf(file);
            else window.open(file, "_blank");
          }}
        >
          <div className={styles.icon}>{isPdf(file_type) ? "📄" : "📎"}</div>
          <div className={styles.info}>
            <div className={styles.filename}>{file_name}</div>
            <div className={styles.meta}>
              {isPdf(file_type) ? "Click to preview" : "Click to download"}
            </div>
          </div>
        </div>
      ))}

      {activePdf && (
        <div className={styles.viewer}>
          <div className={styles.viewerHeader}>
            <button onClick={() => setActivePdf(null)}>⬅ Back</button>
            <span className={styles.viewerFilename}>
              {activePdf.split("/").pop()}
            </span>
          </div>
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer fileUrl={activePdf} />
          </Worker>
        </div>
      )}
    </div>
  );
}
