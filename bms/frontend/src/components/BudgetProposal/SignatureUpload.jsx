import React, { useState, useRef } from "react";
import { Upload, X } from "lucide-react";

const SignatureUpload = ({ value, onChange }) => {
  const [preview, setPreview] = useState(value || "");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
      if (!validTypes.includes(selectedFile.type)) {
        alert("Please upload a valid image file (PNG, JPG, JPEG, SVG)");
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert("File size should be less than 5MB");
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataURL = e.target.result;
        setPreview(dataURL);
        if (onChange) onChange(dataURL);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview("");
    if (onChange) onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ position: "relative" }}>
      {preview ? (
        <div style={{ position: "relative" }}>
          <img
            src={preview}
            alt="Signature Preview"
            style={{
              maxWidth: "300px",
              maxHeight: "100px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "5px",
              backgroundColor: "#f8f9fa",
            }}
          />
          <button
            type="button"
            onClick={removeFile}
            style={{
              marginTop: "8px",
              padding: "4px 12px",
              backgroundColor: "#adb5bd",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <X size={12} /> Remove
          </button>
        </div>
      ) : (
        <div
          style={{
            border: "2px dashed #ccc",
            borderRadius: "4px",
            padding: "20px",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: "#f8f9fa",
            minHeight: "100px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => fileInputRef.current.click()}
        >
          <Upload size={24} style={{ marginBottom: "8px", color: "#666" }} />
          <div style={{ color: "#666", marginBottom: "4px" }}>Click to upload signature file</div>
          <div style={{ fontSize: "12px", color: "#999" }}>PNG, JPG, SVG up to 5MB</div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      {file && <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>File: {file.name}</div>}
    </div>
  );
};

export default SignatureUpload;