// Update your UploadProfilePicture component with these changes:
import { useEffect, useRef, useState } from "react";
import styles from "./UploadProfilePicture.module.css";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export default function UploadProfilePicture({ 
  register, 
  setValue, 
  watch, 
  errors, 
  touchedFields,
  triggerValidation 
}) {
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const fileList = watch("profileImage");

  useEffect(() => {
    const file = fileList?.[0];
    if (!file) {
      setPreview(null);
      return;
    }

    const isValidType = ALLOWED_TYPES.includes(file.type);
    const isValidSize = file.size <= MAX_FILE_SIZE;

    if (isValidType && isValidSize) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    } else {
      handleRemoveImage();
    }
  }, [fileList]);

  const handleRemoveImage = () => {
    setValue("profileImage", null, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    triggerValidation?.("profileImage");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValidType = ALLOWED_TYPES.includes(file.type);
    const isValidSize = file.size <= MAX_FILE_SIZE;

    if (isValidType && isValidSize) {
      const dt = new DataTransfer();
      dt.items.add(file);
      setValue("profileImage", dt.files, {
        shouldValidate: true,
        shouldDirty: true,
      });
      triggerValidation?.("profileImage");
    } else {
      handleRemoveImage();
    }
  };

  return (
    <>
      <div className={styles.uploadWrapper}>
        {!preview && (
          <label className={styles.uploadButton}>
            Choose Profile Picture
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/jpg,image/png"
              className={styles.hiddenInput}
              onChange={handleFileChange}
              {...register("profileImage", {
                required: "Profile picture is required",
                validate: {
                  validFile: (files) =>
                    files?.[0]?.size <= MAX_FILE_SIZE || "File too large (max 2MB)",
                  validType: (files) =>
                    ALLOWED_TYPES.includes(files?.[0]?.type) || "Invalid file type",
                },
              })}
            />
          </label>
        )}
      </div>

      {preview && (
        <div className={styles.previewContainer}>
          <img src={preview} alt="Preview" className={styles.imagePreview} />
          <button
            type="button"
            className={styles.removeButton}
            onClick={handleRemoveImage}
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}