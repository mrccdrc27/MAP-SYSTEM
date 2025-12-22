import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/Modal.css";

const UploadModal = ({
  isOpen,
  onClose,
  onUpload,
  title = "Upload File"
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileError, setFileError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    mode: "all"
  });

  const notes = watch("notes", "");

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFileError("");

    if (files.length > 0) {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      const validFiles = files.filter(file => {
        if (file.size > maxSize) {
          alert(`${file.name} is larger than 5MB and was not added.`);
          return false;
        }
        return true;
      });

      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    if (selectedFiles.length === 0) {
      setFileError("Please select at least one file to upload");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
      formData.append("notes", data.notes || "");
      formData.append("fileCount", selectedFiles.length);

      await onUpload(formData);
      reset();
      setSelectedFiles([]);
      onClose();
    } catch (error) {
      console.error("Error uploading file:", error);
      setFileError("Failed to upload file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedFiles([]);
    setFileError("");
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{title}</h2>
          <button 
            type="button" 
            className="modal-close-btn"
            onClick={handleClose}
          >
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
          <div className="modal-body">
            {/* File Upload Field */}
            <fieldset>
              <label htmlFor="file">
                File <span style={{color: 'red'}}>*</span>
              </label>
              <div className="attachments-wrapper">
                {/* Left column: Upload button & info */}
                <div className="upload-left">
                  <label htmlFor="file" className="upload-image-btn">
                    Choose File
                    <input
                      type="file"
                      id="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                      multiple
                      disabled={isLoading}
                    />
                  </label>
                  <small className="file-size-info">
                    Maximum file size must be 5MB
                  </small>
                </div>

                {/* Right column: Uploaded files */}
                <div className="upload-right">
                  {selectedFiles.map((file, index) => (
                    <div className="file-uploaded" key={index}>
                      <span title={file.name}>{file.name}</span>
                      <button type="button" onClick={() => removeFile(index)} disabled={isLoading}>
                        <img src={CloseIcon} alt="Remove" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {fileError && (
                <span className="error-message">{fileError}</span>
              )}
            </fieldset>

            {/* Notes Field */}
            <fieldset>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                placeholder="Add any notes about this file (optional)"
                maxLength={500}
                {...register("notes")}
                className={errors.notes ? 'input-error' : ''}
                disabled={isLoading}
              />
              <span className="char-count">{notes.length}/500</span>
              {errors.notes && (
                <span className="error-message">
                  {errors.notes.message}
                </span>
              )}
            </fieldset>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={handleClose}
              disabled={isLoading}
            >
              Close
            </button>
            <button
              type="submit"
              className="modal-save-btn"
              disabled={selectedFiles.length === 0 || isLoading}
            >
              {isLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;

