import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import NavBar from "../../components/NavBar";
import TopSecFormPage from "../../components/TopSecFormPage";
import CloseIcon from "../../assets/icons/close.svg";
import Alert from "../../components/Alert";
import {
  fetchManufacturerById,
  createManufacturer,
  updateManufacturer,
} from "../../services/contexts-service";
import { importManufacturers } from "../../services/contexts-service";
import Footer from "../../components/Footer";
import PlusIcon from "../../assets/icons/plus.svg";

import "../../styles/Registration.css";
import "../../styles/ManufacturerRegistration.css";
const ManufacturerRegistration = () => {
  const { id } = useParams();
  const location = useLocation();

  // Retrieve the "manufacturer" data value passed from the navigation state.
  // If the "manufacturer" data is not exist, the default value for this is "undifiend".
  const manufacturer = location.state?.manufacturer;

  const {
    setValue,
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      manufacturerName: manufacturer ? manufacturer.name : "",
      url: manufacturer ? manufacturer.url : "",
      supportUrl: manufacturer ? manufacturer.support_url : "",
      supportPhone: manufacturer ? manufacturer.phone_number : "",
      supportEmail: manufacturer ? manufacturer.email : "",
      notes: manufacturer ? manufacturer.notes : "",
      logo: manufacturer ? manufacturer.logo : "",
    },
    mode: "all",
  });

  const [previewImage, setPreviewImage] = useState(
    manufacturer ? manufacturer.logo : null
  );
  const [selectedImage, setSelectedImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const manufacturerData = await fetchManufacturerById(id);
        if (!manufacturerData) {
          setErrorMessage("Failed to fetch manufacturer details");
          return;
        }
        setValue("manufacturerName", manufacturerData.name || "");
        // support both new and legacy field names
        setValue(
          "url",
          manufacturerData.website_url || manufacturerData.manu_url || manufacturerData.url || ""
        );
        setValue("supportUrl", manufacturerData.support_url || "");
        setValue("supportPhone", manufacturerData.support_phone || "");
        setValue("supportEmail", manufacturerData.support_email || manufacturerData.email || "");
        setValue("notes", manufacturerData.notes || "");
        if (manufacturerData.logo) {
          setPreviewImage(manufacturerData.logo);
          setSelectedImage(null);
        }
      } catch (error) {
        console.error("Error initializing:", error);
        setErrorMessage("Failed to initialize form data");
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [id, setValue]);

  const handleImageSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage(
          "Image size exceeds 5MB. Please choose a smaller file."
        );
        setTimeout(() => setErrorMessage(""), 5000);
        e.target.value = "";
        return;
      }
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please select a valid image file (e.g., PNG, JPEG).");
        setTimeout(() => setErrorMessage(""), 5000);
        e.target.value = "";
        return;
      }

      setSelectedImage(file);
      setValue("logo", file);
      setRemoveImage(false);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (
        file.type !==
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        setErrorMessage("Please select a valid .xlsx file");
        setTimeout(() => setErrorMessage(""), 5000);
        return;
      }
      setImportFile(file);
      // Upload immediately and show result (inline messages like Category import)
      (async () => {
        try {
          setIsImporting(true);
          setSuccessMessage('');
          setErrorMessage('');
          const fd = new FormData();
          fd.append('file', file, file.name);
          const res = await importManufacturers(fd);
          const created = res?.created || 0;
          const updated = res?.updated || 0;
          const errors = res?.errors || [];
          let msg = `Import complete. Created ${created}. Updated ${updated}.`;
          if (Array.isArray(errors) && errors.length) {
            msg += ` ${errors.length} rows failed.`;
            setErrorMessage(msg);
          } else {
            setSuccessMessage(msg);
          }
        } catch (err) {
          console.error('Import failed', err);
          const detail = err?.response?.data?.detail || err?.message || 'Import failed';
          setErrorMessage(detail);
        } finally {
          setIsImporting(false);
          setImportFile(null);
          if (typeof e.target !== 'undefined') e.target.value = '';
        }
      })();
    }
  };

  const state = manufacturer
    ? { updatedManufacturer: true }
    : { addedManufacturer: true };

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);

      // Duplicate name check using fetchAllManufacturers is optional; skip to keep UX fast

      const formData = new FormData();
      formData.append("name", data.manufacturerName);
      // server expects `website_url`
      formData.append("website_url", data.url || "");
      formData.append("support_url", data.supportUrl || "");
      formData.append("support_phone", data.supportPhone || "");
      formData.append("support_email", data.supportEmail || "");
      formData.append("notes", data.notes || "");

      if (selectedImage) {
        formData.append("logo", selectedImage);
      }

      if (removeImage) {
        formData.append("remove_logo", "true");
      }

      let result;
      if (id) {
        result = await updateManufacturer(id, formData);
      } else {
        result = await createManufacturer(formData);
      }

      if (!result) throw new Error("Server did not return a result.");

      navigate("/More/ViewManufacturer", {
        state: { successMessage: `Manufacturer has been ${id ? "updated" : "created"} successfully!` },
      });
    } catch (error) {
      console.error(`Error ${id ? "updating" : "creating"} manufacturer:`, error);
      setErrorMessage(error?.message || "Failed to save manufacturer.");
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}

      <section className="page-layout-registration">
        <NavBar />
        <main className="registration">
          <section className="top">
            <TopSecFormPage
              root="Manufacturers"
              currentPage={id ? "Update Manufacturer" : "New Manufacturer"}
              rootNavigatePage="/More/ViewManufacturer"
              title={id ? manufacturer?.name || "Update Manufacturer" : "New Manufacturer"}
              rightComponent={
                !id && (
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
                )
              }
            />
          </section>
          {/* Left-side import status: matches Category import UI */}
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
                <label htmlFor="manufacturerName">
                  Manufacturer Name
                  <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Manufacturer Name"
                  maxLength="100"
                  className={errors.manufacturerName ? "input-error" : ""}
                  {...register("manufacturerName", {
                    required: "Manufacturer Name is required",
                  })}
                />
                {errors.manufacturerName && (
                  <span className="error-message">
                    {errors.manufacturerName.message}
                  </span>
                )}
              </fieldset>

              <fieldset>
                <label htmlFor="url">URL</label>
                <input
                  type="url"
                  placeholder="URL"
                  className={errors.url ? "input-error" : ""}
                  {...register("url", {
                    pattern: {
                      value: /^(https?:\/\/).+/i,
                      message: "URL must start with http:// or https://",
                    },
                  })}
                />
                {errors.url && (
                  <span className="error-message">{errors.url.message}</span>
                )}
              </fieldset>

              <fieldset>
                <label htmlFor="supportUrl">Support URL</label>
                <input
                  type="url"
                  placeholder="Support URL"
                  className={errors.supportUrl ? "input-error" : ""}
                  {...register("supportUrl", {
                    pattern: {
                      value: /^(https?:\/\/).+/i,
                      message:
                        "Support URL must start with http:// or https://",
                    },
                  })}
                />
                {errors.supportUrl && (
                  <span className="error-message">
                    {errors.supportUrl.message}
                  </span>
                )}
              </fieldset>

              <fieldset>
                <label htmlFor="supportPhone">Phone Number</label>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  {...register("supportPhone")}
                />
              </fieldset>

              <fieldset>
                <label htmlFor="supportEmail">Email</label>
                <input
                  type="email"
                  placeholder="Email"
                  {...register("supportEmail")}
                />
              </fieldset>

              <fieldset>
                <label htmlFor="notes">Notes</label>
                <textarea
                  placeholder="Notes"
                  rows="4"
                  maxLength="500"
                  {...register("notes")}
                />
              </fieldset>

              <fieldset>
                <label>Image Upload</label>
                <div className="attachments-wrapper">
                  {/* Left column: Upload button & info */}
                  <div className="upload-left">
                    <label htmlFor="logo" className="upload-image-btn">
                      Choose File
                      <input
                        type="file"
                        id="logo"
                        accept="image/*"
                        onChange={handleImageSelection}
                        style={{ display: "none" }}
                      />
                    </label>
                    <small className="file-size-info">
                      Maximum file size must be 5MB
                    </small>
                  </div>

                  {/* Right column: Uploaded file */}
                  <div className="upload-right">
                    {selectedImage && (
                      <div className="file-uploaded">
                        <span title={selectedImage.name}>{selectedImage.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewImage(null);
                            setSelectedImage(null);
                            setValue("logo", null);
                            document.getElementById("logo").value = "";
                            setRemoveImage(true);
                            console.log("Remove logo flag set to:", true);
                          }}
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

export default ManufacturerRegistration;
