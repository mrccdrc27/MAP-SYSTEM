import React, { useState } from 'react';
import styles from './AttachmentPreview.module.css';

const AttachmentPreview = ({ attachment, onDownload, isOwn }) => {
  const [imageError, setImageError] = useState(false);
  const { attachment_id, filename, file_size, content_type, file_url } = attachment;

  // Check if the attachment is an image
  const isImage = content_type?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon based on type
  const getFileIcon = () => {
    if (isImage) return 'fa-regular fa-image';
    if (content_type?.includes('pdf')) return 'fa-solid fa-file-pdf';
    if (content_type?.includes('word') || content_type?.includes('document')) return 'fa-solid fa-file-word';
    if (content_type?.includes('excel') || content_type?.includes('spreadsheet')) return 'fa-solid fa-file-excel';
    if (content_type?.includes('zip') || content_type?.includes('rar')) return 'fa-solid fa-file-zipper';
    return 'fa-solid fa-paperclip';
  };

  // Handle image click to open in new tab
  const handleImageClick = () => {
    if (file_url) {
      window.open(file_url, '_blank');
    }
  };

  if (isImage && !imageError && file_url) {
    return (
      <div className={`${styles.imagePreview} ${isOwn ? styles.imageOwn : styles.imageOther}`}>
        <img
          src={file_url}
          alt={filename}
          className={styles.image}
          onClick={handleImageClick}
          onError={() => setImageError(true)}
          loading="lazy"
        />
        <div className={styles.imageOverlay}>
          <button 
            onClick={() => onDownload(attachment_id)} 
            className={styles.downloadBtn}
            title="Download"
          >
            <i className="fa-solid fa-download"></i>
          </button>
        </div>
      </div>
    );
  }

  // Regular file attachment
  return (
    <div className={`${styles.filePreview} ${isOwn ? styles.fileOwn : styles.fileOther}`}>
      <div className={styles.fileIcon}><i className={getFileIcon()}></i></div>
      <div className={styles.fileInfo}>
        <div className={styles.fileName}>{filename}</div>
        <div className={styles.fileSize}>{formatFileSize(file_size)}</div>
      </div>
      <button 
        onClick={() => onDownload(attachment_id)} 
        className={styles.downloadBtn}
        title="Download"
      >
        <i className="fa-solid fa-download"></i>
      </button>
    </div>
  );
};

export default AttachmentPreview;
