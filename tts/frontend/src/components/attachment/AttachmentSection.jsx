import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import styles from './AttachmentSection.module.css';

// API configuration - uses workflow_api (VITE_BACKEND_API) as the gateway
const WORKFLOW_API_URL = (import.meta.env.VITE_BACKEND_API || 'http://localhost:8002/').replace(/\/$/, '');

/**
 * AttachmentSection Component
 * 
 * Renders a list of ticket attachments with view (PDF) and download capabilities.
 * All requests route through workflow_api which handles PDF conversion and proxying.
 * 
 * @param {Object} props
 * @param {string} props.ticketNumber - The ticket number/ID
 * @param {Array} props.attachments - Array of attachment objects
 */
const AttachmentSection = ({ ticketNumber, attachments }) => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  /**
   * Determine file icon based on MIME type
   */
  const getFileIcon = (fileType) => {
    if (!fileType) return 'fa-file';
    if (fileType.includes('pdf')) return 'fa-file-pdf';
    if (fileType.includes('image')) return 'fa-file-image';
    if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fa-file-powerpoint';
    if (fileType.includes('zip') || fileType.includes('archive')) return 'fa-file-zipper';
    if (fileType.includes('text')) return 'fa-file-lines';
    return 'fa-file';
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Check if file type can be viewed in browser
   * PDFs and images can always be viewed
   * Office docs only if LibreOffice is available (we'll find out from API response)
   */
  const isViewable = (fileType) => {
    if (!fileType) return false;
    const viewableTypes = [
      'pdf', 'image',  // Always viewable
      // Office docs are conditionally viewable (depends on backend LibreOffice)
      'word', 'document', 'docx', 'doc',
      'excel', 'spreadsheet', 'xlsx', 'xls',
      'powerpoint', 'presentation', 'pptx', 'ppt',
      'text', 'plain',
      'rtf', 'odt', 'ods', 'odp'
    ];
    return viewableTypes.some(type => fileType.toLowerCase().includes(type));
  };

  /**
   * Handle view button click - navigate to document view page
   */
  const handleView = useCallback((attachment) => {
    navigate(`document/${attachment.id}`, {
      state: { attachment }
    });
  }, [navigate]);

  /**
   * Handle download button click - download original through workflow_api
   */
  const handleDownload = useCallback(async (attachment) => {
    try {
      const response = await fetch(
        `${WORKFLOW_API_URL}/api/tickets/${ticketNumber}/attachments/${attachment.id}/download`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download attachment');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }, [ticketNumber]);

  // No attachments
  if (!attachments || attachments.length === 0) {
    return (
      <div className={styles.attachmentSection}>
        <h3>Attachments</h3>
        <div className={styles.noAttachments}>
          <i className="fa-solid fa-paperclip"></i>
          <span>No attachments available.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.attachmentSection}>
      <h3>Attachments</h3>
      
      {/* Error display */}
      {error && (
        <div className={styles.errorMessage}>
          <i className="fa-solid fa-exclamation-circle"></i>
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.dismissError}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
      )}

      {/* Attachment list */}
      <div className={styles.attachmentList}>
        {attachments.map((file) => {
          const canView = isViewable(file.file_type);
          
          return (
            <div key={file.id} className={styles.attachmentItem}>
              <i className={`fa-solid ${getFileIcon(file.file_type)} ${styles.attachmentIcon}`}></i>
              
              <div className={styles.attachmentInfo}>
                <span className={styles.attachmentName} title={file.file_name}>
                  {file.file_name}
                </span>
                <span className={styles.attachmentMeta}>
                  {formatFileSize(file.file_size)}
                </span>
              </div>

              <div className={styles.attachmentActions}>
                {/* View button - only for viewable types */}
                {canView && (
                  <button
                    onClick={() => handleView(file)}
                    className={styles.actionButton}
                    title="View Document"
                  >
                    <i className="fa-solid fa-eye"></i>
                  </button>
                )}
                
                {/* Download button - always available */}
                <button
                  onClick={() => handleDownload(file)}
                  className={styles.actionButton}
                  title="Download original file"
                >
                  <i className="fa-solid fa-download"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

AttachmentSection.propTypes = {
  ticketNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  attachments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      file_name: PropTypes.string,
      file_type: PropTypes.string,
      file_size: PropTypes.number,
      file_path: PropTypes.string,
    })
  ),
};

AttachmentSection.defaultProps = {
  attachments: [],
};

export default AttachmentSection;
