import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { createCategory, importCategories } from '../../api/contextsApi'
import NavBar from "../../components/NavBar";
import TopSecFormPage from "../../components/TopSecFormPage";
import MediumButtons from "../../components/buttons/MediumButtons";
import CloseIcon from "../../assets/icons/close.svg";
import Footer from "../../components/Footer";
import PlusIcon from "../../assets/icons/plus.svg";
import "../../styles/Registration.css";
import "../../styles/CategoryRegistration.css";

const CategoryRegistration = () => {
  const navigate = useNavigate();
  const [attachmentFile, setAttachmentFile] = useState(null);

  // Import file state
  const [importFile, setImportFile] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      categoryName: "",
      categoryType: "",
      customFields: "",
      skipCheckoutConfirmation: false,
    },
    mode: "all",
  });

  const categoryTypes = [
    "Asset",
    "Component",
  ];
  const customFieldOptions = [
    "Serial Number",
    "MAC Address",
    "Asset Tag",
    "Purchase Date",
    "Warranty",
  ];

  const handleFileSelection = (e) => {
    if (e.target.files && e.target.files[0]) {
      // Check file size (max 5MB)
      if (e.target.files[0].size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        e.target.value = "";
        return;
      }
      setAttachmentFile(e.target.files[0]);
    }
  };

  const onSubmit = (data) => {
    // Build payload as FormData to support file upload
    const form = new FormData()
    form.append('name', data.categoryName)
    form.append('type', data.categoryType)
    if (attachmentFile) form.append('logo', attachmentFile)

    createCategory(form)
      .then(() => {
        navigate("/More/ViewCategories", { state: { addedCategory: true } })
      })
      .catch((err) => {
        console.error('Failed to create category', err)
        alert('Failed to create category: ' + (err?.response?.data?.detail || err.message))
      })
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    setErrorMessage('')
    setSuccessMessage('')
    if (!file) return

    // Validate size (max 5MB) and extension
    const maxSize = 5 * 1024 * 1024
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ]

    const name = (file.name || '').toLowerCase()
    const extOk = name.endsWith('.xlsx')
    const typeOk = !!file.type ? allowedTypes.includes(file.type) : true

    if (file.size > maxSize) {
      setErrorMessage('Please select a file smaller than 5MB')
      setTimeout(() => setErrorMessage(''), 6000)
      e.target.value = ''
      return
    }

    if (!extOk && !typeOk) {
      setErrorMessage('Please select a valid .xlsx file')
      setTimeout(() => setErrorMessage(''), 6000)
      e.target.value = ''
      return
    }

    // Upload immediately
    setIsImporting(true)
    setImportFile(file)
    importCategories(file)
      .then((resp) => {
        // resp expected: { created, updated, errors }
        const created = resp?.created ?? 0
        const updated = resp?.updated ?? 0
        const errors = resp?.errors ?? []
        let msg = `Import complete. Created ${created}. Updated ${updated}.`
        if (Array.isArray(errors) && errors.length) {
          msg += ` ${errors.length} rows failed.`
        }
        setSuccessMessage(msg)
      })
      .catch((err) => {
        console.error('Import failed', err)
        const detail = err?.response?.data?.detail || err?.message || 'Import failed'
        setErrorMessage(detail)
      })
      .finally(() => {
        setIsImporting(false)
        e.target.value = ''
        setImportFile(null)
      })
  };

  return (
    <>
      <section className="page-layout-registration">
        <NavBar />
        <main className="registration">
          <section className="top">
            <TopSecFormPage
              root="Categories"
              currentPage="New Category"
              rootNavigatePage="/More/ViewCategories"
              title="New Category"
              rightComponent={
                <div className="import-section">
                  <label htmlFor="import-file" className="import-btn">
                    <img src={PlusIcon} alt="Import" />
                    Import
                    <input
                      type="file"
                      id="import-file"
                      accept=".xlsx"
                      onChange={handleImportFile}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              }
            />
          </section>

          {/* Left-side import status: shows uploading first, then result messages */}
          <div style={{ padding: '0 24px', marginTop: 8 }}>
            <div className="import-status-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isImporting && <span style={{ fontSize: 13, fontWeight: 500 }}>Uploading...</span>}
              {!isImporting && successMessage && (
                <div className="success-message" style={{ fontSize: 13, color: 'green' }}>{successMessage}</div>
              )}
              {!isImporting && errorMessage && (
                <div className="error-message" style={{ fontSize: 13, color: '#d32f2f' }}>{errorMessage}</div>
              )}
            </div>
          </div>

          <section className="registration-form">
            <form onSubmit={handleSubmit(onSubmit)}>
              <fieldset>
                <label htmlFor="categoryName">
                  Category Name
                  <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Category Name"
                  maxLength="100"
                  className={errors.categoryName ? "input-error" : ""}
                  {...register("categoryName", {
                    required: "Category Name is required",
                  })}
                />
                {errors.categoryName && (
                  <span className="error-message">
                    {errors.categoryName.message}
                  </span>
                )}
              </fieldset>

              <fieldset>
                <label htmlFor="categoryType">
                  Category Type
                  <span className="required-asterisk">*</span>
                </label>
                <select
                  className={errors.categoryType ? "input-error" : ""}
                  {...register("categoryType", {
                    required: "Category Type is required",
                  })}
                >
                  <option value="">Select Category Type</option>
                  {categoryTypes.map((type, idx) => (
                    <option key={idx} value={type.toLowerCase()}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.categoryType && (
                  <span className="error-message">
                    {errors.categoryType.message}
                  </span>
                )}
              </fieldset>

              <fieldset>
                <label>Image Upload</label>
                <div className="attachments-wrapper">
                  {/* Left column: Upload button & info */}
                  <div className="upload-left">
                    <label htmlFor="icon" className="upload-image-btn">
                      Choose File
                      <input
                        type="file"
                        id="icon"
                        accept="image/*"
                        onChange={handleFileSelection}
                        style={{ display: "none" }}
                      />
                    </label>
                    <small className="file-size-info">
                      Maximum file size must be 5MB
                    </small>
                  </div>

                  {/* Right column: Uploaded file */}
                  <div className="upload-right">
                    {attachmentFile && (
                      <div className="file-uploaded">
                        <span title={attachmentFile.name}>{attachmentFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachmentFile(null)}
                        >
                          <img src={CloseIcon} alt="Remove" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </fieldset>

              <button
                type="submit"
                className="primary-button"
                disabled={!isValid}
              >
                Save
              </button>
            </form>
          </section>
        </main>
        <Footer />
      </section>
    </>
  );
};

export default CategoryRegistration;
