import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import NavBar from "../../components/NavBar";
import TopSecFormPage from "../../components/TopSecFormPage";
import Alert from "../../components/Alert";
import SystemLoading from "../../components/Loading/SystemLoading";
import Footer from "../../components/Footer";
import PlusIcon from "../../assets/icons/plus.svg";
import MediumButtons from "../../components/buttons/MediumButtons";
import ConfirmationModal from "../../components/Modals/DeleteModal";
import CloseIcon from "../../assets/icons/close.svg";

import "../../styles/Registration.css";
import "../../styles/SupplierRegistration.css";

const SupplierRegistration = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Delete modal state
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  // Retrieve the "supplier" data value passed from the navigation state.
  // If the "supplier" data is not exist, the default value for this is "undifiend".
  const supplier = location.state?.supplier;

  const [previewImage, setPreviewImage] = useState(
    supplier ? supplier.logo : null
  );
  const [selectedImage, setSelectedImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  // Import file state
  const [importFile, setImportFile] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      name: supplier ? supplier.name : "",
      address: supplier ? supplier.address : "",
      city: supplier ? supplier.city : "",
      zip: supplier ? supplier.zip : "",
      contact_name: supplier ? supplier.contact_name : "",
      phone_number: supplier ? supplier.contact_phone : "",
      email: supplier ? supplier.contact_email : "",
      URL: supplier ? supplier.url : "",
      notes: supplier ? supplier.notes : "",
      logo: supplier ? supplier.logo : "",
    },
    mode: "all",
  });

  /* BACKEND INTEGRATION HERE
  const contextServiceUrl =
    "https://contexts-service-production.up.railway.app";

  useEffect(() => {
    const initialize = async () => {
      try {
        if (id) {
          const supplierData = await fetchAllCategories();
          if (!supplierData)
            throw new Error("Failed to fetch supplier details");

          setValue("name", supplierData.name || "");
          setValue("address", supplierData.address || "");
          setValue("city", supplierData.city || "");
          setValue("zip", supplierData.zip || "");
          setValue("contact_name", supplierData.contact_name || "");
          setValue("phone_number", supplierData.phone_number || "");
          setValue("email", supplierData.email || "");
          setValue("URL", supplierData.URL || "");
          setValue("notes", supplierData.notes || "");

          if (supplierData.logo) {
            setPreviewImage(`${contextServiceUrl}${supplierData.logo}`);
          }
        }
      } catch (error) {
        setErrorMessage(error.message || "Failed to initialize form");
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [id, setValue]);
  */

  const handleImageSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Image exceeds 5MB.");
        setTimeout(() => setErrorMessage(""), 5000);
        return;
      }
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Only image files are allowed.");
        setTimeout(() => setErrorMessage(""), 5000);
        return;
      }

      setSelectedImage(file);
      setRemoveImage(false);

      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const state = supplier ? { updatedSupplier: true } : { addedSupplier: true };

  const onSubmit = async (data) => {
    /* BACKEND INTEGRATION HERE
    try {
      if (!id) {
        const existingSuppliers = await contextsService.fetchAllSupplierNames();
        if (!existingSuppliers)
          throw new Error("Failed to fetch supplier names for duplicate check");

        const isDuplicate = existingSuppliers.suppliers.some(
          (supplier) => supplier.name.toLowerCase() === data.name.toLowerCase()
        );
        if (isDuplicate) {
          setErrorMessage(
            "A supplier with this name already exists. Please use a different name."
          );
          setTimeout(() => setErrorMessage(""), 5000);
          return;
        }
      }

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("address", data.address);
      formData.append("city", data.city);
      formData.append("zip", data.zip);
      formData.append("contact_name", data.contact_name);
      formData.append("phone_number", data.phone_number);
      formData.append("email", data.email);
      formData.append("URL", data.URL || "");
      formData.append("notes", data.notes || "");

      if (selectedImage) formData.append("logo", selectedImage);
      if (removeImage) formData.append("remove_logo", "true");

      let result;
      if (id) {
        result = await contextsService.updateSupplier(id, formData);
      } else {
        result = await contextsService.createSupplier(formData);
      }

      if (!result) throw new Error("Failed to save supplier");

      navigate("/More/ViewSupplier", {
        state: {
          successMessage: `Supplier successfully ${id ? "updated" : "created"}`,
        },
      });
    } catch (error) {
      const message =
        typeof error === "string"
          ? error
          : error?.error || error?.message || "An unexpected error occurred";

      setErrorMessage(message);
      setTimeout(() => setErrorMessage(""), 5000);
    }
    */
    navigate("/More/ViewSupplier", { state });
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
      // Here you would typically process the Excel file
      console.log("Import file selected:", file.name);
    }
  };

  return (
    <>
      {isDeleteModalOpen && (
        <ConfirmationModal
          closeModal={() => setDeleteModalOpen(false)}
          actionType="delete"
        />
      )}

      <section className="page-layout-registration">
        <NavBar />
        <main className="registration">
          <section className="top">
            <TopSecFormPage
              root="Suppliers"
              currentPage={id ? "Update Supplier" : "New Supplier"}
              rootNavigatePage="/More/ViewSupplier"
              title={id ? supplier.name : "New Supplier"}
              rightComponent={
                !id ? (
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
                ) : (
                  <MediumButtons
                    type="delete"
                    onClick={() => setDeleteModalOpen(true)}
                  />
                )
              }
            />
          </section>

          {errorMessage && <Alert type="danger" message={errorMessage} />}

          <form onSubmit={handleSubmit(onSubmit)} className="registration-form">
            <fieldset>
              <label htmlFor="name">
                Supplier Name
                <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                placeholder="Supplier Name"
                maxLength={100}
                className={errors.name ? "input-error" : ""}
                {...register("name", { required: "Supplier Name is required" })}
              />
              {errors.name && (
                <span className="error-message">{errors.name.message}</span>
              )}
            </fieldset>

            <fieldset>
              <label htmlFor="address">Address</label>
              <input
                type="text"
                placeholder="Address"
                maxLength={200}
                className={errors.address ? "input-error" : ""}
                {...register("address")}
              />
              {errors.address && (
                <span className="error-message">{errors.address.message}</span>
              )}
            </fieldset>

            <fieldset>
              <label htmlFor="city">City</label>
              <input placeholder="City" {...register("city")} maxLength={50} />
            </fieldset>

            <fieldset>
              <label htmlFor="zip">Zip Code</label>
              <input
                type="number"
                placeholder="ZIP"
                maxLength={4}
                className={errors.zip ? "input-error" : ""}
                {...register("zip", {
                  pattern: {
                    value: /^[0-9]{4}$/,
                    message: "Zip code must be a number with 4 digits only",
                  },
                  maxLength: {
                    value: 4,
                    message: "Zip code must not exceed 4 digits",
                  },
                })}
              />
              {errors.zip && (
                <span className="error-message">{errors.zip.message}</span>
              )}
            </fieldset>

            <fieldset>
              <label htmlFor="state">State</label>
              <input
                type="text"
                placeholder="State"
                maxLength={50}
                className={errors.state ? "input-error" : ""}
                {...register("state")}
              />
            </fieldset>

            <fieldset>
              <label htmlFor="country">Country</label>
              <input
                type="text"
                placeholder="Country"
                maxLength={50}
                className={errors.state ? "input-error" : ""}
                {...register("country")}
              />
            </fieldset>

            <fieldset>
              <label htmlFor="contact_name">Contact Person</label>
              <input
                type="text"
                placeholder="Supplier's Contact Name"
                maxLength={100}
                {...register("contact_name")}
              />
              {errors.contact_name && (
                <span className="error-message">
                  {errors.contact_name.message}
                </span>
              )}
            </fieldset>

            <fieldset>
              <label htmlFor="phone_number">Phone Number</label>
              <input
                type="number"
                placeholder="Contact's Phone Number"
                maxLength={13}
                {...register("phone_number")}
              />
            </fieldset>

            <fieldset>
              <label htmlFor="fax">Fax</label>
              <input
                type="text"
                placeholder="Fax"
                maxLength={50}
                className={errors.state ? "input-error" : ""}
                {...register("fax")}
              />
              {errors.fax && (
                <span className="error-message">{errors.fax.message}</span>
              )}
            </fieldset>

            <fieldset>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                placeholder="Contact's Email"
                {...register("email")}
              />
            </fieldset>

            <fieldset>
              <label htmlFor="URL">URL</label>
              <input
                type="url"
                placeholder="URL"
                className={errors.URL ? "input-error" : ""}
                {...register("URL", {
                  pattern: {
                    value: /^(https?:\/\/).+/i,
                    message: "URL must start with http:// or https://",
                  },
                })}
              />
              {errors.URL && (
                <span className="error-message">{errors.URL.message}</span>
              )}
            </fieldset>

            <fieldset className="notes">
              <label>Notes</label>
              <textarea
                placeholder="Notes..."
                {...register("notes")}
                maxLength={500}
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
                          setRemoveImage(true);
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
        </main>
        <Footer />
      </section>
    </>
  );
};

export default SupplierRegistration;
