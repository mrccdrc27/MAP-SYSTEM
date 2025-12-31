import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './DocumentViewPage.module.css';
import Nav from "../../../components/navigation/Nav";
import useAttachmentView from '../../../hooks/useAttachmentView';

export default function DocumentViewPage() {
  const { ticketNumber, attachmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const attachmentFromState = location.state?.attachment;

  const {
    status,
    pdfUrl,
    error,
    viewAttachment,
    downloadAttachment,
  } = useAttachmentView(ticketNumber, attachmentId);

  // Trigger view on mount
  useEffect(() => {
    if (ticketNumber && attachmentId) {
      viewAttachment();
    }
  }, [ticketNumber, attachmentId, viewAttachment]);

  const handleBack = () => {
    navigate(-1);
  };

  const getStatusContent = () => {
    switch (status) {
      case 'loading':
      case 'processing':
        return (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>{status === 'loading' ? 'Loading document...' : 'Converting document to PDF...'}</p>
          </div>
        );
      
      case 'ready':
        return (
          <iframe
            src={pdfUrl}
            title="Document Viewer"
            className={styles.pdfFrame}
          />
        );
      
      case 'failed':
      case 'not_supported':
        return (
          <div className={styles.errorContainer}>
            <i className={`fa-solid fa-triangle-exclamation ${styles.errorIcon}`}></i>
            <h3 className={styles.errorMessage}>
              {status === 'not_supported' 
                ? 'This file type cannot be viewed directly.' 
                : error || 'Failed to load document.'}
            </h3>
            <button className={styles.actionButton} onClick={downloadAttachment}>
              <i className="fa-solid fa-download"></i>
              Download Original File
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <Nav />
      <div className={styles.pageContainer}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.backButton} onClick={handleBack} title="Back to Ticket">
              <i className="fa-solid fa-arrow-left"></i>
              Back
            </button>
            <h1 className={styles.title}>
              {attachmentFromState?.file_name || `Attachment #${attachmentId}`}
            </h1>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.actionButton} onClick={downloadAttachment} title="Download Original">
               <i className="fa-solid fa-download"></i> Download
            </button>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.viewerContainer}>
            {getStatusContent()}
          </div>
        </main>
      </div>
    </>
  );
}
