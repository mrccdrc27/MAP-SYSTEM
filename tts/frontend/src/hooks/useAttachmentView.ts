// tts/frontend/src/hooks/useAttachmentView.ts
/**
 * React hook for viewing ticket attachments with PDF conversion support.
 * 
 * This hook handles:
 * - Viewing attachments as PDFs in the browser
 * - Polling for conversion status when processing
 * - Fallback to download for unsupported file types
 * - Error handling and retry logic
 * 
 * @example
 * ```tsx
 * const { status, pdfUrl, error, viewAttachment, downloadAttachment } = 
 *   useAttachmentView(ticketNumber, attachmentId);
 * 
 * // Trigger view
 * <button onClick={viewAttachment}>View</button>
 * 
 * // Render based on status
 * {status === 'loading' && <Spinner />}
 * {status === 'ready' && <PDFViewer url={pdfUrl} />}
 * {status === 'failed' && <button onClick={downloadAttachment}>Download Original</button>}
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/axios'; // Your axios instance with auth interceptors

export type AttachmentViewStatus = 
  | 'idle' 
  | 'loading' 
  | 'processing' 
  | 'ready' 
  | 'failed' 
  | 'not_supported';

export interface AttachmentViewResult {
  /** Current status of the view operation */
  status: AttachmentViewStatus;
  /** URL of the PDF blob when ready (for iframe/viewer) */
  pdfUrl: string | null;
  /** Error message if failed */
  error: string | null;
  /** Original file metadata */
  fileInfo: {
    fileName: string;
    fileType: string;
    fileSize: number;
  } | null;
  /** Initiate viewing the attachment as PDF */
  viewAttachment: () => Promise<void>;
  /** Download the original file */
  downloadAttachment: () => void;
  /** Reset state to idle */
  reset: () => void;
  /** Force refresh (re-convert even if cached) */
  forceRefresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 60; // Max 2 minutes of polling

export function useAttachmentView(
  ticketNumber: string,
  attachmentId: number
): AttachmentViewResult {
  const [status, setStatus] = useState<AttachmentViewStatus>('idle');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<AttachmentViewResult['fileInfo']>(null);
  
  const pollCountRef = useRef(0);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setPdfUrl(null);
    setError(null);
    setFileInfo(null);
    pollCountRef.current = 0;
    
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const pollConversionStatus = useCallback(async () => {
    if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
      setError('Conversion timed out. Please try again later.');
      setStatus('failed');
      return;
    }

    try {
      const response = await api.get(
        `/api/attachments/${attachmentId}/conversion-status`
      );
      
      const data = response.data;
      
      if (data.status === 'completed' || data.status === 'passthrough') {
        // Conversion done - fetch the PDF
        await fetchPdf(false);
      } else if (data.status === 'failed') {
        setError(data.error_message || 'Conversion failed');
        setStatus('failed');
      } else if (data.status === 'not_supported') {
        setError('This file type cannot be previewed');
        setStatus('not_supported');
      } else {
        // Still processing - poll again
        pollCountRef.current++;
        pollTimeoutRef.current = setTimeout(pollConversionStatus, POLL_INTERVAL_MS);
      }
    } catch (err: any) {
      console.error('Error polling conversion status:', err);
      setError('Failed to check conversion status');
      setStatus('failed');
    }
  }, [attachmentId]);

  const fetchPdf = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const params = forceRefresh ? { force_refresh: 'true' } : {};
      
      const response = await api.get(
        `/api/tickets/${ticketNumber}/attachments/${attachmentId}/view`,
        { 
          params,
          responseType: 'blob' 
        }
      );
      
      // Check if we got a PDF or a JSON response (202 processing)
      const contentType = response.headers['content-type'];
      
      if (contentType?.includes('application/pdf')) {
        // PDF ready
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        
        const blobUrl = URL.createObjectURL(response.data);
        blobUrlRef.current = blobUrl;
        setPdfUrl(blobUrl);
        setStatus('ready');
      } else if (contentType?.includes('application/json')) {
        // Got JSON response - likely 202 or error
        const text = await response.data.text();
        const data = JSON.parse(text);
        
        if (data.status === 'processing') {
          setStatus('processing');
          pollCountRef.current = 0;
          pollTimeoutRef.current = setTimeout(pollConversionStatus, POLL_INTERVAL_MS);
        } else if (data.status === 'not_supported') {
          setError(data.message || 'File type not supported for preview');
          setStatus('not_supported');
        } else if (data.status === 'failed') {
          setError(data.message || 'Conversion failed');
          setStatus('failed');
        }
      }
    } catch (err: any) {
      if (err.response?.status === 202) {
        // Conversion in progress
        setStatus('processing');
        pollCountRef.current = 0;
        pollTimeoutRef.current = setTimeout(pollConversionStatus, POLL_INTERVAL_MS);
      } else if (err.response?.status === 415) {
        // Unsupported file type
        const data = err.response?.data;
        setError(data?.message || 'File type not supported for preview');
        setStatus('not_supported');
      } else if (err.response?.status === 404) {
        setError('Attachment not found');
        setStatus('failed');
      } else if (err.response?.status === 503) {
        setError(err.response?.data?.message || 'Conversion failed');
        setStatus('failed');
      } else {
        console.error('Error fetching PDF:', err);
        setError('Failed to load attachment');
        setStatus('failed');
      }
    }
  }, [ticketNumber, attachmentId, pollConversionStatus]);

  const viewAttachment = useCallback(async () => {
    reset();
    setStatus('loading');
    await fetchPdf(false);
  }, [reset, fetchPdf]);

  const forceRefresh = useCallback(async () => {
    reset();
    setStatus('loading');
    await fetchPdf(true);
  }, [reset, fetchPdf]);

  const downloadAttachment = useCallback(() => {
    // Open download URL in new tab/trigger download
    const downloadUrl = `/api/tickets/${ticketNumber}/attachments/${attachmentId}/download`;
    
    // Create a temporary link and click it
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileInfo?.fileName || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [ticketNumber, attachmentId, fileInfo]);

  return {
    status,
    pdfUrl,
    error,
    fileInfo,
    viewAttachment,
    downloadAttachment,
    reset,
    forceRefresh,
  };
}

export default useAttachmentView;
