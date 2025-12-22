import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import "../../styles/Registration.css";
import TopSecFormPage from "../../components/TopSecFormPage";
import { useForm, Controller } from "react-hook-form";
import CloseIcon from "../../assets/icons/close.svg";
import PlusIcon from "../../assets/icons/plus.svg";
import AddEntryModal from "../../components/Modals/AddEntryModal";
import MockupData from "../../data/mockData/components/component-mockup-data.json";

const ComponentRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editState = location.state?.item || null;
  const isEdit = !!editState;

  const [attachmentFile, setAttachmentFile] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm({
    mode: "all",
    defaultValues: {
      componentName: editState?.name || "",
      category: editState?.category || "",
      manufacturer: editState?.manufacturer || "",
      supplier: editState?.supplier || "",
      location: editState?.location || "",
      modelNumber: editState?.model_number || "",
      orderNumber: editState?.order_number || "",
      purchaseCost: editState?.purchase_cost || "",
      quantity: editState?.quantity || "",
      minimumQuantity: editState?.minimum_quantity || "",
      purchaseDate: editState?.purchase_date || "",
      notes: editState?.notes || "",
    },
  });

  useEffect(() => {
    if (isEdit && editState) {
      setValue("componentName", editState.name || "");
      setValue("category", editState.category || "");
      setValue("manufacturer", editState.manufacturer || "");
      setValue("supplier", editState.supplier || "");
      setValue("location", editState.location || "");
      setValue("modelNumber", editState.model_number || "");
      setValue("orderNumber", editState.order_number || "");
      setValue("purchaseCost", editState.purchase_cost || "");
      setValue("quantity", editState.quantity || "");
      setValue("minimumQuantity", editState.minimum_quantity || "");
      setValue("purchaseDate", editState.purchase_date || "");
      setValue("notes", editState.notes || "");
    }
  }, [editState, isEdit, setValue]);

  // Base option lists derived from mock data
  const [categories, setCategories] = useState(
    () => Array.from(new Set(MockupData.map((item) => item.category).filter(Boolean)))
  );
  const [manufacturers, setManufacturers] = useState(
    () => Array.from(new Set(MockupData.map((item) => item.manufacturer).filter(Boolean)))
  );
  const [suppliers, setSuppliers] = useState(
    () => Array.from(new Set(MockupData.map((item) => item.supplier).filter(Boolean)))
  );
  const [locations, setLocations] = useState(
    () => Array.from(new Set(MockupData.map((item) => item.location).filter(Boolean)))
  );

  // Quick-add modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Modal field configurations for quick-add
  const categoryFields = [
    {
      name: "name",
      label: "Category Name",
      type: "text",
      placeholder: "Category Name",
      required: true,
      maxLength: 100,
      validation: { required: "Category Name is required" },
    },
  ];

  const manufacturerFields = [
    {
      name: "name",
      label: "Manufacturer Name",
      type: "text",
      placeholder: "Manufacturer Name",
      required: true,
      maxLength: 100,
      validation: { required: "Manufacturer Name is required" },
    },
  ];

  const supplierFields = [
    {
      name: "name",
      label: "Supplier Name",
      type: "text",
      placeholder: "Supplier Name",
      required: true,
      maxLength: 100,
      validation: { required: "Supplier Name is required" },
    },
  ];

  const locationFields = [
    {
      name: "name",
      label: "Location Name",
      type: "text",
      placeholder: "Location Name",
      required: true,
      maxLength: 100,
      validation: { required: "Location Name is required" },
    },
  ];

  const handleSaveCategory = async (data) => {
    const name = data.name?.trim();
    if (!name) return;
    setCategories((prev) =>
      prev.includes(name) ? prev : [...prev, name].sort()
    );
  };

  const handleSaveManufacturer = async (data) => {
    const name = data.name?.trim();
    if (!name) return;
    setManufacturers((prev) =>
      prev.includes(name) ? prev : [...prev, name].sort()
    );
  };

  const handleSaveSupplier = async (data) => {
    const name = data.name?.trim();
    if (!name) return;
    setSuppliers((prev) =>
      prev.includes(name) ? prev : [...prev, name].sort()
    );
  };

  const handleSaveLocation = async (data) => {
    const name = data.name?.trim();
    if (!name) return;
    setLocations((prev) =>
      prev.includes(name) ? prev : [...prev, name].sort()
    );
  };

  const handleFileSelection = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!["image/png", "image/jpeg"].includes(file.type)) {
        alert("Only PNG and JPEG images are allowed.");
        e.target.value = "";
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        e.target.value = "";
        return;
      }

      setAttachmentFile(file);
    }
  };

  const onSubmit = (data) => {
    console.log("Form submitted:", data, attachmentFile);
    navigate("/components");
  };

  return (
    <>
      <section className="page-layout-registration">
        <NavBar />
        <main className="registration">
        <section className="top">
          <TopSecFormPage
            root="Components"
            currentPage={isEdit ? "Edit Component" : "New Component"}
            rootNavigatePage="/components"
            title={isEdit ? "Edit Component" : "New Component"}
          />
        </section>
        <section className="registration-form">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Component Name */}
            <fieldset>
              <label htmlFor="componentName">
                Component Name<span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter component name"
                maxLength="100"
                className={errors.componentName ? "input-error" : ""}
                {...register("componentName", {
                  required: "Component name is required",
                })}
              />
              {errors.componentName && (
                <span className="error-message">
                  {errors.componentName.message}
                </span>
              )}
            </fieldset>

            {/* Category (required) */}
            <fieldset>
              <label htmlFor="category">
                Category<span className="required-asterisk">*</span>
              </label>
              <div className="select-with-button">
                <select
                  className={errors.category ? "input-error" : ""}
                  {...register("category", { required: "Category is required" })}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-entry-btn"
                  onClick={() => setShowCategoryModal(true)}
                  title="Add new category"
                >
                  <img src={PlusIcon} alt="Add" />
                </button>
              </div>
              {errors.category && (
                <span className="error-message">{errors.category.message}</span>
              )}
            </fieldset>

            {/* Manufacturer (optional) */}
            <fieldset>
              <label htmlFor="manufacturer">Manufacturer</label>
              <div className="select-with-button">
                <select {...register("manufacturer")}>
                  <option value="">Select Manufacturer</option>
                  {manufacturers.map((manufacturer) => (
                    <option key={manufacturer} value={manufacturer}>
                      {manufacturer}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-entry-btn"
                  onClick={() => setShowManufacturerModal(true)}
                  title="Add new manufacturer"
                >
                  <img src={PlusIcon} alt="Add" />
                </button>
              </div>
            </fieldset>

            {/* Supplier (optional) */}
            <fieldset>
              <label htmlFor="supplier">Supplier</label>
              <div className="select-with-button">
                <select {...register("supplier")}>
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier} value={supplier}>
                      {supplier}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-entry-btn"
                  onClick={() => setShowSupplierModal(true)}
                  title="Add new supplier"
                >
                  <img src={PlusIcon} alt="Add" />
                </button>
              </div>
            </fieldset>

            {/* Location (optional) */}
            <fieldset>
              <label htmlFor="location">Location</label>
              <div className="select-with-button">
                <select {...register("location")}>
                  <option value="">Select Location</option>
                  {locations.map((locationOption) => (
                    <option key={locationOption} value={locationOption}>
                      {locationOption}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-entry-btn"
                  onClick={() => setShowLocationModal(true)}
                  title="Add new location"
                >
                  <img src={PlusIcon} alt="Add" />
                </button>
              </div>
            </fieldset>

            {/* Model Number (optional) */}
            <fieldset>
              <label htmlFor="modelNumber">Model Number</label>
              <input
                type="text"
                placeholder="Enter model number"
                maxLength="50"
                {...register("modelNumber")}
              />
            </fieldset>

            {/* Order Number (optional) */}
            <fieldset>
              <label htmlFor="orderNumber">Order Number</label>
              <input
                type="text"
                placeholder="Enter order number"
                maxLength="50"
                {...register("orderNumber")}
              />
            </fieldset>

            {/* Purchased Cost */}
            <fieldset className="cost-field">
              <label htmlFor="purchaseCost">Purchased Cost</label>
              <div className="cost-input-group">
                <span className="cost-addon">PHP</span>
                <input
                  type="number"
                  id="cost"
                  name="cost"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  {...register("purchaseCost", { valueAsNumber: true })}
                />
              </div>
            </fieldset>

            {/* Quantity (required) */}
            <fieldset>
              <label htmlFor="quantity">
                Quantity<span className="required-asterisk">*</span>
              </label>
              <input
                type="number"
                id="quantity"
                placeholder="Enter quantity"
                min="0"
                step="1"
                className={errors.quantity ? "input-error" : ""}
                {...register("quantity", {
                  required: "Quantity is required",
                  valueAsNumber: true,
                  min: { value: 0, message: "Quantity cannot be negative" },
                })}
              />
              {errors.quantity && (
                <span className="error-message">{errors.quantity.message}</span>
              )}
            </fieldset>

            {/* Minimum Quantity (optional) */}
            <fieldset>
              <label htmlFor="minimumQuantity">Minimum Quantity</label>
              <input
                type="number"
                id="minimumQuantity"
                placeholder="Enter minimum quantity"
                min="0"
                step="1"
                {...register("minimumQuantity", { valueAsNumber: true })}
              />
            </fieldset>

            {/* Purchased Date (optional, past to current date only) */}
            <fieldset>
              <label htmlFor="purchaseDate">Purchased Date</label>
              <input
                type="date"
                className={errors.purchaseDate ? "input-error" : ""}
                max={new Date().toISOString().split("T")[0]} // limits to today or earlier
                {...register("purchaseDate")}
              />
              {errors.purchaseDate && (
                <span className="error-message">{errors.purchaseDate.message}</span>
              )}
            </fieldset>

            {/* Notes (optional, max 500 characters) */}
            <fieldset>
              <label htmlFor="notes">Notes</label>
              <textarea
                placeholder="Enter notes"
                maxLength={500}
                {...register("notes")}
                rows="3"
              ></textarea>
            </fieldset>

            <fieldset>
              <label>Image</label>
              {attachmentFile ? (
                <div className="image-selected">
                  <img
                    src={URL.createObjectURL(attachmentFile)}
                    alt="Selected icon"
                  />
                  <button type="button" onClick={() => setAttachmentFile(null)}>
                    <img src={CloseIcon} alt="Remove" />
                  </button>
                </div>
              ) : (
                <label className="upload-image-btn">
                  Choose File
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleFileSelection}
                    style={{ display: "none" }}
                  />
                </label>
              )}
              <small className="file-size-info">
                Maximum file size must be 5MB
              </small>
            </fieldset>

            {/* Submit */}
            <button type="submit" className="primary-button" disabled={!isValid}>
              {isEdit ? "Update Component" : "Save"}
            </button>
          </form>
        </section>
      </main>
      <Footer />
      </section>

      <AddEntryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={handleSaveCategory}
        title="New Category"
        fields={categoryFields}
        type="category"
      />

      <AddEntryModal
        isOpen={showManufacturerModal}
        onClose={() => setShowManufacturerModal(false)}
        onSave={handleSaveManufacturer}
        title="New Manufacturer"
        fields={manufacturerFields}
        type="manufacturer"
      />

      <AddEntryModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSave={handleSaveSupplier}
        title="New Supplier"
        fields={supplierFields}
        type="supplier"
      />

      <AddEntryModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSave={handleSaveLocation}
        title="New Location"
        fields={locationFields}
        type="location"
      />


    </>
  );
};

export default ComponentRegistration;