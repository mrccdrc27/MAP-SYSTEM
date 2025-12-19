import { useRef, useState } from 'react';
import styles from './ProfileImageUpload.module.css';
import Button from './Button';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export default function ProfileImageUpload({ value, onChange, error }) {
  const [preview, setPreview] = useState(value || null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValidType = ALLOWED_TYPES.includes(file.type);
    const isValidSize = file.size <= MAX_FILE_SIZE;

    if (!isValidType) {
      onChange({ target: { name: 'profileImage', value: null, error: 'Only JPG, JPEG, and PNG files are allowed' } });
      return;
    }

    if (!isValidSize) {
      onChange({ target: { name: 'profileImage', value: null, error: 'File size must be less than 2MB' } });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onChange({ target: { name: 'profileImage', value: file } });
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onChange({ target: { name: 'profileImage', value: null } });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.uploadWrapper}>
      {!preview ? (
        <div>
          <input
            id="profileImageUpload"
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/jpg,image/png"
            className={styles.hiddenInput}
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="secondary"
            size="small"
            className={styles.uploadFileBtn}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            Choose Profile Picture
          </Button>
          <p className={styles.fileInfo}>
            Accepted: JPG, JPEG, PNG (Max 2MB)
          </p>
        </div>
      ) : (
        <div className={styles.previewContainer}>
          <img src={preview} alt="Profile Preview" className={styles.imagePreview} />
          <button
            type="button"
            className={styles.removeButton}
            onClick={handleRemoveImage}
            aria-label="Remove image"
          >
            ✕
          </button>
        </div>
      )}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}
