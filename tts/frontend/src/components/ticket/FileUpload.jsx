// src/components/ticket/FileUpload.jsx
import React, { useState, useRef, useEffect } from 'react';
import styles from './ticketComments.module.css';

const FileUpload = ({ onFilesSelected, maxFiles = 5, uniqueId = 'file-upload', clearTrigger = 0 }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef();

  // Define allowed file extensions
  const ALLOWED_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar', '.txt'
  ];

  const isFileTypeAllowed = (filename) => {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return ALLOWED_EXTENSIONS.includes(extension);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types
    const invalidFiles = files.filter(file => !isFileTypeAllowed(file.name));
    
    if (invalidFiles.length > 0) {
      const invalidFileNames = invalidFiles.map(f => f.name).join(', ');
      setErrorMessage(`The following files are not allowed: ${invalidFileNames}. Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG, GIF, ZIP, RAR, and TXT files are supported.`);
      
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear error after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    
    // Clear any previous error
    setErrorMessage('');
    
    const limitedFiles = files.slice(0, maxFiles);
    setSelectedFiles(limitedFiles);
    onFilesSelected(limitedFiles);
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
    
    // Reset input if no files left
    if (newFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clear files when clearTrigger changes (after successful submissions)
  useEffect(() => {
    if (clearTrigger > 0) {
      setSelectedFiles([]);
      setErrorMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [clearTrigger]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.fileUpload}>
      {errorMessage && (
        <div className={styles.errorMessage}>
          <i className="fas fa-exclamation-triangle"></i> {errorMessage}
        </div>
      )}
      
      <div className={styles.fileInputContainer}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className={styles.fileInput}
          id={uniqueId}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.rar,.txt"
        />
        <label htmlFor={uniqueId} className={styles.fileInputLabel}>
          <i className="fas fa-paperclip"></i>
          Attach Files ({selectedFiles.length}/{maxFiles})
        </label>
      </div>
      
      {selectedFiles.length > 0 && (
        <div className={styles.selectedFiles}>
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
            Selected Files:
          </div>
          {selectedFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className={styles.selectedFile}>
              <span className={styles.fileName}>
                {file.name} ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className={styles.removeFileButton}
                title="Remove file"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;