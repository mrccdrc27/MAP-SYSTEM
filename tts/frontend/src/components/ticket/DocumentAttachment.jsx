// src/components/ticket/DocumentAttachment.jsx
import React from 'react';
import styles from './ticketComments.module.css';

const DocumentAttachment = ({ document, onDownload }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'fa-file-pdf';
      case 'doc': case 'docx': return 'fa-file-word';
      case 'xls': case 'xlsx': return 'fa-file-excel';
      case 'ppt': case 'pptx': return 'fa-file-powerpoint';
      case 'zip': case 'rar': return 'fa-file-zipper';
      case 'txt': return 'fa-file-text';
      default: return 'fa-file';
    }
  };

  return (
    <div className={styles.documentAttachment}>
      <i className={`fas ${getFileIcon(document.original_filename)} ${styles.documentIcon}`}></i>
      <div className={styles.documentInfo}>
        <span className={styles.documentName}>{document.original_filename}</span>
        <span className={styles.documentSize}>
          {formatFileSize(document.file_size)}
        </span>
      </div>
      
      <button
        className={styles.downloadButton}
        onClick={() => onDownload(document.id, document.original_filename)}
        title="Download file"
      >
        <i className="fas fa-download"></i>
      </button>
    </div>
  );
};

export default DocumentAttachment;