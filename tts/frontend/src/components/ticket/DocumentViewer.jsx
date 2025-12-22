import React, { useState, useEffect } from "react";
import styles from "./DocumentViewer.module.css";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import mammoth from "mammoth";
import ReactDOM from "react-dom";

export default function DocumentViewer({ attachments }) {
  const [activeFile, setActiveFile] = useState(null);
  const [docxHtml, setDocxHtml] = useState("");

  const isPdf = (type) => type === "application/pdf";
  const isDocx = (type) =>
    type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const handleFileClick = async (file, type) => {
    if (isPdf(type)) {
      setActiveFile({ type: "pdf", url: file });
    } else if (isDocx(type)) {
      try {
        const response = await fetch(file);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocxHtml(result.value);
        setActiveFile({ type: "docx", url: file });
      } catch (err) {
        console.error("Error reading DOCX file:", err);
      }
    } else {
      window.open(file, "_blank");
    }
  };

  const closeModal = () => {
    setActiveFile(null);
    setDocxHtml("");
  };

  if (!attachments) {
    return <div className={styles.status}>Loading attachments...</div>;
  }

  if (attachments.length === 0) {
    return <div className={styles.status}>No file attached.</div>;
  }

  return (
    <>
      <div className={styles.container}>
        {attachments.map(({ id, file, file_name, file_type }) => (
          <div
            key={id}
            className={styles.card}
            onClick={() => handleFileClick(file, file_type)}
          >
            <div className={styles.icon}>
              {isPdf(file_type) ? "📄" : isDocx(file_type) ? "📝" : "📎"}
            </div>
            <div className={styles.info}>
              <div className={styles.filename}>{file_name}</div>
              <div className={styles.meta}>
                {isPdf(file_type) || isDocx(file_type)
                  ? "Click to preview"
                  : "Click to download"}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* {activeFile && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.viewerHeader}>
              <button className={styles.backBtn} onClick={closeModal}>
                ⬅ Back
              </button>
              <a href={activeFile.url} download className={styles.downloadBtn}>
                ⬇ Download
              </a>
            </div>

            {activeFile.type === "pdf" && (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <div className={styles.pdfViewer}>
                  <Viewer fileUrl={activeFile.url} />
                </div>
              </Worker>
            )}

            {activeFile.type === "docx" && (
              <div
                className={styles.docxContent}
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            )}
          </div>
        </div>
      )} */}

      {activeFile &&
        ReactDOM.createPortal(
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.viewerHeader}>
                <button className={styles.backBtn} onClick={closeModal}>
                  ⬅ Back
                </button>
                <a
                  href={activeFile.url}
                  download
                  className={styles.downloadBtn}
                >
                  ⬇ Download
                </a>
              </div>

              {activeFile.type === "pdf" && (
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                  <div className={styles.pdfViewer}>
                    <Viewer fileUrl={activeFile.url} />
                  </div>
                </Worker>
              )}

              {activeFile.type === "docx" && (
                <div
                  className={styles.docxContent}
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
