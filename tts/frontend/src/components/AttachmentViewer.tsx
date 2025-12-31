// tts/frontend/src/components/AttachmentViewer.tsx
/**
 * Component for viewing ticket attachments with PDF conversion support.
 * 
 * Features:
 * - View button to trigger PDF view
 * - Download button for original file
 * - Loading spinner during conversion
 * - Error handling with fallback to download
 * - Modal PDF viewer
 */

import React, { useState } from 'react';
import { useAttachmentView, AttachmentViewStatus } from '../hooks/useAttachmentView';

export interface AttachmentInfo {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_size_display: string;
  can_preview: boolean;
  preview_status: string;
}

interface AttachmentViewerProps {
  ticketNumber: string;
  attachment: AttachmentInfo;
  onClose?: () => void;
}

export function AttachmentViewer({ ticketNumber, attachment, onClose }: AttachmentViewerProps) {
  const {
    status,
    pdfUrl,
    error,
    viewAttachment,
    downloadAttachment,
    reset,
    forceRefresh,
  } = useAttachmentView(ticketNumber, attachment.id);

  const [showModal, setShowModal] = useState(false);

  const handleView = async () => {
    await viewAttachment();
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    reset();
    onClose?.();
  };

  const handleDownload = () => {
    downloadAttachment();
  };

  return (
    <div className="attachment-viewer">
      {/* Attachment Info */}
      <div className="attachment-info">
        <span className="file-icon">{getFileIcon(attachment.file_type)}</span>
        <div className="file-details">
          <span className="file-name" title={attachment.file_name}>
            {truncateFilename(attachment.file_name, 30)}
          </span>
          <span className="file-size">{attachment.file_size_display}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="attachment-actions">
        {attachment.can_preview && (
          <button
            className="btn btn-view"
            onClick={handleView}
            disabled={status === 'loading' || status === 'processing'}
          >
            {status === 'loading' || status === 'processing' ? (
              <>
                <span className="spinner" /> Converting...
              </>
            ) : (
              <>
                <span className="icon">👁️</span> View
              </>
            )}
          </button>
        )}
        
        <button className="btn btn-download" onClick={handleDownload}>
          <span className="icon">⬇️</span> Download
        </button>
      </div>

      {/* Error Message */}
      {(status === 'failed' || status === 'not_supported') && (
        <div className="attachment-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          {status === 'not_supported' && (
            <span className="error-hint">
              Click "Download" to view the original file.
            </span>
          )}
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{attachment.file_name}</h3>
              <div className="modal-actions">
                <button
                  className="btn btn-refresh"
                  onClick={forceRefresh}
                  title="Force re-conversion"
                >
                  🔄
                </button>
                <button
                  className="btn btn-download-modal"
                  onClick={handleDownload}
                  title="Download original"
                >
                  ⬇️
                </button>
                <button className="btn btn-close" onClick={handleClose}>
                  ✕
                </button>
              </div>
            </div>
            
            <div className="modal-body">
              {status === 'loading' || status === 'processing' ? (
                <div className="loading-container">
                  <div className="spinner-large" />
                  <p>
                    {status === 'loading' 
                      ? 'Loading...' 
                      : 'Converting to PDF...'}
                  </p>
                </div>
              ) : status === 'ready' && pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="pdf-iframe"
                  title={`PDF viewer: ${attachment.file_name}`}
                />
              ) : (status === 'failed' || status === 'not_supported') ? (
                <div className="error-container">
                  <p className="error-message">{error}</p>
                  <button className="btn btn-primary" onClick={handleDownload}>
                    Download Original File
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Component to display a list of attachments with view/download options.
 */
interface AttachmentListProps {
  ticketNumber: string;
  attachments: AttachmentInfo[];
}

export function AttachmentList({ ticketNumber, attachments }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) {
    return (
      <div className="no-attachments">
        <p>No attachments</p>
      </div>
    );
  }

  return (
    <div className="attachment-list">
      <h4>Attachments ({attachments.length})</h4>
      {attachments.map(attachment => (
        <AttachmentViewer
          key={attachment.id}
          ticketNumber={ticketNumber}
          attachment={attachment}
        />
      ))}
    </div>
  );
}

// Helper functions
function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('text/')) return '📃';
  return '📎';
}

function truncateFilename(filename: string, maxLength: number): string {
  if (filename.length <= maxLength) return filename;
  
  const ext = filename.split('.').pop() || '';
  const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.slice(0, maxLength - ext.length - 4);
  
  return `${truncatedName}...${ext}`;
}

export default AttachmentViewer;
