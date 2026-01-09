import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import styles from './ImageCropperModal.module.css';

/**
 * Image Cropper Modal
 * Handles:
 * - 1:1 aspect ratio cropping
 * - Max dimensions: 1024x1024
 * - Max file size: 2MB
 * - Compression to ensure file size is within limit
 */
const ImageCropperModal = ({ isOpen, onClose, onSave, initialImage }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Compress image to ensure it's under 2MB
  const compressImage = async (canvas, quality = 0.95) => {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    });
  };

  // Generate cropped image as File object
  const getCroppedImage = async () => {
    if (!croppedAreaPixels || !initialImage) {
      setError('Unable to process image');
      return null;
    }

    try {
      const image = new Image();
      image.src = initialImage;

      return new Promise((resolve) => {
        image.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxSize = 1024;
          
          // Set canvas size to 1:1 ratio, max 1024x1024
          const size = Math.min(maxSize, croppedAreaPixels.width, croppedAreaPixels.height);
          canvas.width = size;
          canvas.height = size;

          const ctx = canvas.getContext('2d');

          // Draw cropped image
          ctx.drawImage(
            image,
            croppedAreaPixels.x,
            croppedAreaPixels.y,
            croppedAreaPixels.width,
            croppedAreaPixels.height,
            0,
            0,
            size,
            size
          );

          // Compress to ensure < 2MB
          let quality = 0.95;
          let blob = null;
          const maxFileSize = 2 * 1024 * 1024; // 2MB

          while (quality > 0.1) {
            blob = await compressImage(canvas, quality);
            if (blob.size <= maxFileSize) {
              break;
            }
            quality -= 0.05;
          }

          // Convert blob to File object
          const file = new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
          resolve(file);
        };

        image.onerror = () => {
          setError('Failed to process image');
          resolve(null);
        };
      });
    } catch (err) {
      setError('Error processing image: ' + err.message);
      return null;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const croppedFile = await getCroppedImage();
      if (croppedFile) {
        onSave(croppedFile);
        onClose();
      }
    } catch (err) {
      setError('Failed to save image: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Edit Profile Picture</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          {initialImage ? (
            <>
              <div className={styles.cropperContainer}>
                <Cropper
                  image={initialImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} // 1:1 aspect ratio
                  cropShape="round"
                  showGrid={true}
                  objectFit="cover"
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  maxZoom={3}
                  minZoom={1}
                />
              </div>

              <div className={styles.controls}>
                <div className={styles.controlGroup}>
                  <label>Zoom</label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.zoomValue}>{(zoom * 100).toFixed(0)}%</span>
                </div>

                <div className={styles.info}>
                  <small>• Aspect ratio: 1:1 (square)</small>
                  <small>• Output resolution: Up to 1024x1024 pixels</small>
                  <small>• Large images are automatically resized and optimized</small>
                </div>

                {error && <div className={styles.error}>{error}</div>}
              </div>
            </>
          ) : (
            <div className={styles.loadingMessage}>Loading image...</div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={isSaving || !initialImage}
          >
            {isSaving ? (
              <>
                <span>Saving...</span>
                <span className={styles.spinner}></span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check"></i>
                <span>Save Picture</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
