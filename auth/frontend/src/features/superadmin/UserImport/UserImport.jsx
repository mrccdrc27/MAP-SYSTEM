import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '../../../components/SuperAdminLayout/SuperAdminLayout';
import { Button, Alert, Card } from '../../../components/common';
import styles from './UserImport.module.css';

const UserImport = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState(null);

  const sampleHeaders = [
    'email',
    'username',
    'password',
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'phone_number',
    'department',
    'status',
    'is_active',
    'is_staff',
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a valid CSV file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setResults(null);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = sampleHeaders.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/superadmin/api/users/import/', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Import completed! ${data.created} users created, ${data.skipped} skipped.`);
        setResults(data);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
      } else {
        setError(data.error || 'Failed to import users');
      }
    } catch (err) {
      console.error('Error importing users:', err);
      setError('An error occurred while importing users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="page-wrapper">
        <header className="page-header">
          <div className="page-title-section">
            <h1>Import Users</h1>
            <p className="page-subtitle">Batch create user accounts using a CSV file upload.</p>
          </div>
          <div className="page-actions">
            <Button variant="secondary" onClick={() => navigate('/superadmin/users')} icon={<i className="fa fa-arrow-left"></i>}>
              Back to List
            </Button>
          </div>
        </header>

        <div className="page-content">
          <Card title="CSV File Import" flat>

        <Alert type="info">
          <strong>Instructions:</strong>
          <ul style={{ paddingLeft: 'var(--space-md)', marginTop: 'var(--space-xs)' }}>
            <li>Upload a CSV file with user data</li>
            <li>The first row should contain headers</li>
            <li>Email is required; password will be auto-generated if not provided</li>
            <li>Existing emails will be skipped</li>
            <li>Download the template below for the correct format</li>
          </ul>
        </Alert>

        <div className={styles.templateSection}>
          <h4>Sample CSV Headers:</h4>
          <div className={styles.headerList}>
            {sampleHeaders.map((header, index) => (
              <span key={index} className={styles.headerBadge}>
                {header}
              </span>
            ))}
          </div>
          <Button onClick={handleDownloadTemplate} icon={<i className="fa fa-download"></i>}>
            Download Template
          </Button>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className={styles.uploadForm}>
          <div className={styles.fileInputWrapper}>
            <label htmlFor="file-input" className={styles.fileLabel}>
              <i className="fa fa-cloud-upload-alt"></i>
              <span>{file ? file.name : 'Choose CSV file or drag here'}</span>
            </label>
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className={styles.fileInput}
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            isLoading={loading} 
            disabled={!file}
            icon={<i className="fa fa-upload"></i>}
          >
            Import Users
          </Button>
        </form>

        {results && (
          <div className={styles.resultsSection}>
            <h4>Import Results</h4>
            <div className={styles.resultsGrid}>
              <div className={styles.resultCard}>
                <div className={`${styles.resultIcon} ${styles.success}`}>
                  <i className="fa fa-check-circle"></i>
                </div>
                <div className={styles.resultInfo}>
                  <h3>{results.created}</h3>
                  <p>Users Created</p>
                </div>
              </div>

              <div className={styles.resultCard}>
                <div className={`${styles.resultIcon} ${styles.warning}`}>
                  <i className="fa fa-exclamation-triangle"></i>
                </div>
                <div className={styles.resultInfo}>
                  <h3>{results.skipped}</h3>
                  <p>Users Skipped</p>
                </div>
              </div>

              <div className={styles.resultCard}>
                <div className={`${styles.resultIcon} ${styles.danger}`}>
                  <i className="fa fa-times-circle"></i>
                </div>
                <div className={styles.resultInfo}>
                  <h3>{results.errors?.length || 0}</h3>
                  <p>Errors</p>
                </div>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div className={styles.errorsList}>
                <h5>Errors:</h5>
                <ul>
                  {results.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.skipped_emails && results.skipped_emails.length > 0 && (
              <div className={styles.skippedList}>
                <h5>Skipped Emails (Already Exist):</h5>
                <ul>
                  {results.skipped_emails.map((email, index) => (
                    <li key={index}>{email}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
      </div>
    </div>
    </SuperAdminLayout>
  );
};

export default UserImport;
