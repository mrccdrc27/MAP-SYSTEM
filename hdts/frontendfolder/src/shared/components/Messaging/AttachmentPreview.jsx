import React, { useState } from 'react';
import { FiDownload, FiX, FiFile } from 'react-icons/fi';
import { FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFileCsv, FaFileArchive } from 'react-icons/fa';
import styles from './AttachmentPreview.module.css';

const AttachmentPreview = ({ attachment, onDownload, isOwn, isExpanded }) => {
  const [imageError, setImageError] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const { 
    attachment_id, 
    filename, 
    file_size, 
    content_type, 
    file_url,
    // Fallback fields from different API formats
    id,
    file,
    name,
    type
  } = attachment;

  // Normalize values
  const normalizedId = attachment_id || id;
  const normalizedFilename = filename || name || 'attachment';
  const normalizedUrl = file_url || file;
  const normalizedType = content_type || type || '';

  // Check if the attachment is an image
  const isImage = normalizedType?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(normalizedFilename);

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon based on type
  const FileIcon = () => {
    const iconProps = { size: 18, color: '#fff' };
    if (isImage) return <FaFileImage {...iconProps} />;
    if (normalizedType?.includes('pdf')) return <FaFilePdf {...iconProps} />;
    if (normalizedType?.includes('word') || normalizedType?.includes('document')) return <FaFileWord {...iconProps} />;
    if (normalizedType?.includes('excel') || normalizedType?.includes('spreadsheet')) return <FaFileExcel {...iconProps} />;
    if (normalizedType?.includes('csv')) return <FaFileCsv {...iconProps} />;
    if (normalizedType?.includes('zip') || normalizedType?.includes('rar')) return <FaFileArchive {...iconProps} />;
    return <FiFile {...iconProps} />;
  };

  // Handle image click to open modal
  const handleImageClick = () => {
    setIsImageModalOpen(true);
  };

  // Handle download
  const handleDownload = (e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(normalizedId);
    } else if (normalizedUrl) {
      window.open(normalizedUrl, '_blank');
    }
  };

  if (isImage && !imageError && normalizedUrl) {
    return (
      <>
        <div 
          className={`${styles.imagePreview} ${isOwn ? styles.imageOwn : styles.imageOther} ${isExpanded ? styles.previewExpanded : ''}`}
          onClick={handleImageClick}
        >
          <img
            src={normalizedUrl}
            alt={normalizedFilename}
            className={styles.image}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>

        {/* Image Modal */}
        {isImageModalOpen && (
          <div className={styles.imageModal} onClick={() => setIsImageModalOpen(false)}>
            <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
              <button 
                className={styles.closeModalBtn}
                onClick={() => setIsImageModalOpen(false)}
              >
                <FiX size={20} />
              </button>
              <img 
                src={normalizedUrl} 
                alt={normalizedFilename}
                className={styles.modalImage}
              />
              <div className={styles.modalActions}>
                <span className={styles.modalFilename}>{normalizedFilename}</span>
                <button onClick={handleDownload} className={styles.modalDownloadBtn}>
                  <FiDownload size={16} /> Download
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Regular file attachment
  return (
    <div 
      className={`${styles.filePreview} ${isOwn ? styles.fileOwn : styles.fileOther} ${isExpanded ? styles.previewExpanded : ''}`}
      onClick={handleDownload}
    >
      <div className={styles.fileIcon}><FileIcon /></div>
      <div className={styles.fileInfo}>
        <div className={styles.fileName}>{normalizedFilename}</div>
        {file_size && <div className={styles.fileSize}>{formatFileSize(file_size)}</div>}
      </div>
      <FiDownload className={styles.downloadIcon} size={16} />
    </div>
  );
};

export default AttachmentPreview;
