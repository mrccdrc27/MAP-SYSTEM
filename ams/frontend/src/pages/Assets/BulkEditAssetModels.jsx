import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import TopSecFormPage from "../../components/TopSecFormPage";
import Alert from "../../components/Alert";
import CloseIcon from "../../assets/icons/close.svg";
import PlusIcon from '../../assets/icons/plus.svg';
import AddEntryModal from "../../components/Modals/AddEntryModal";
import SystemLoading from "../../components/Loading/SystemLoading";
import "../../styles/Registration.css";
import "../../styles/Assets/BulkEditAssetModels.css";
import { fetchProductNames, bulkEditProducts } from "../../services/assets-service";
import { fetchAllDropdowns, createCategory, createManufacturer, createDepreciation, createSupplier } from "../../services/contexts-service";

export default function BulkEditAssetModels() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedIds } = location.state || { selectedIds: [] };
  const [currentSelectedIds, setCurrentSelectedIds] = useState(selectedIds || []);
  
  const [selectedModels, setSelectedModels] = useState([]);
  const [isLoading, setLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [depreciations, setDepreciations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Modal states for adding new entries
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [previewImage, setPreviewImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    async function loadSelectedModels() {
      try {
        if (!selectedIds || selectedIds.length === 0) {
          setErrorMessage("No asset models selected for bulk edit");
          setTimeout(() => navigate("/products"), 2000);
          return;
        }

        setLoading(true);
        const models = await fetchProductNames({ ids: selectedIds });
        setSelectedModels(models);

        // Fetch dropdown options
        const dropdowns = await fetchAllDropdowns("product");
          setCategories(dropdowns.categories);
          setManufacturers(dropdowns.manufacturers);
          setSuppliers(dropdowns.suppliers);
          setDepreciations(dropdowns.depreciations);

      } catch (error) {
        setErrorMessage("Failed to load selected asset models");
      } finally {
        setLoading(false);
      }
    }

    loadSelectedModels();
  }, [selectedIds, navigate]);

  const handleRemoveModel = (modelId) => {
    setCurrentSelectedIds((prev) => prev.filter((id) => id !== modelId));
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: {
      productName: "",
      category: "",
      manufacturer: "",
      depreciation: "",
      endOfLifeDate: "",
      defaultPurchaseCost: "",
      defaultSupplier: "",
      minimumQuantity: "",
      cpu: "",
      gpu: "",
      ram: "",
      screenSize: "",
      storageSize: "",
      operatingSystem: "",
      notes: "",
    },
  });

  const handleImageSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Image size exceeds 5MB. Please choose a smaller file.");
        setTimeout(() => setErrorMessage(""), 5000);
        return;
      }

      setSelectedImage(file);
      setValue('image', file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Modal field configurations
  const categoryFields = [
    {
      name: 'name',
      label: 'Category Name',
      type: 'text',
      placeholder: 'Category Name',
      required: true,
      maxLength: 100,
      validation: { required: 'Category Name is required' }
    }
  ];

  const manufacturerFields = [
    {
      name: 'name',
      label: 'Manufacturer Name',
      type: 'text',
      placeholder: 'Manufacturer Name',
      required: true,
      maxLength: 100,
      validation: { required: 'Manufacturer Name is required' }
    }
  ];

  const depreciationFields = [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'Depreciation Method Name',
      required: true,
      maxLength: 100,
      validation: { required: 'Name is required' }
    },
    {
      name: 'duration',
      label: 'Duration',
      type: 'number',
      placeholder: '0',
      required: true,
      validation: {
        required: 'Duration is required',
        min: { value: 1, message: 'Duration must be at least 1' }
      },
      suffix: 'months'
    },
    {
      name: 'minimum_value',
      label: 'Minimum Value',
      type: 'number',
      placeholder: '0.00',
      required: true,
      validation: {
        required: 'Minimum Value is required',
        min: { value: 0, message: 'Minimum Value must be at least 0' }
      },
      prefix: 'PHP',
      step: '0.01'
    }
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

  // Handle save for each modal
  const handleSaveCategory = async (data) => {
    try {
      const categoryData = {
        name: data.name,
        type: 'asset'
      };
      const newCategory = await createCategory(categoryData);
      setCategories([...categories, newCategory]);
      setShowCategoryModal(false);
      setErrorMessage("");
    } catch (error) {
      console.error("Error creating category:", error);
      setErrorMessage("Failed to create category");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const handleSaveManufacturer = async (data) => {
    try {
      const newManufacturer = await createManufacturer(data);
      setManufacturers([...manufacturers, newManufacturer]);
      setShowManufacturerModal(false);
      setErrorMessage("");
    } catch (error) {
      console.error("Error creating manufacturer:", error);
      setErrorMessage("Failed to create manufacturer");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const handleSaveDepreciation = async (data) => {
    try {
      const newDepreciation = await createDepreciation(data);
      setDepreciations([...depreciations, newDepreciation]);
      setShowDepreciationModal(false);
      setErrorMessage("");
    } catch (error) {
      console.error("Error creating depreciation:", error);
      setErrorMessage("Failed to create depreciation method");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const handleSaveSupplier = async (data) => {
    try {
      const newSupplier = await createSupplier(data);
      setSuppliers([...suppliers, newSupplier]);
      setShowSupplierModal(false);
      setErrorMessage("");
    } catch (error) {
      console.error("Error creating supplier:", error);
      setErrorMessage("Failed to create supplier");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const onSubmit = async (data) => {
    try {
      if (currentSelectedIds.length === 0) {
        setErrorMessage("Please select at least one asset model to update");
        return;
      }

      // Map frontend field names to backend field names
      const fieldMapping = {
        productName: 'name',
        category: 'category',
        manufacturer: 'manufacturer',
        depreciation: 'depreciation',
        modelNumber: 'model_number',
        endOfLifeDate: 'end_of_life',
        defaultPurchaseCost: 'default_purchase_cost',
        defaultSupplier: 'default_supplier',
        minimumQuantity: 'minimum_quantity',
        cpu: 'cpu',
        gpu: 'gpu',
        ram: 'ram',
        screenSize: 'size',
        storageSize: 'storage',
        operatingSystem: 'os',
        notes: 'notes',
      };

      // Filter out empty values and map to backend field names
      const updateData = {};
      Object.entries(data).forEach(([key, value]) => {
        // Skip empty, null, undefined, and NaN values
        const isEmptyOrInvalid = value === "" || value === null || value === undefined ||
                                  (typeof value === 'number' && isNaN(value));
        if (!isEmptyOrInvalid) {
          const backendKey = fieldMapping[key] || key;
          // For integer fields, parse as integer to avoid floating point issues
          if (key === 'minimumQuantity') {
            updateData[backendKey] = parseInt(value, 10);
          } else if (key === 'defaultPurchaseCost') {
            // For decimal fields, keep as string to preserve precision
            updateData[backendKey] = String(value);
          } else {
            updateData[backendKey] = value;
          }
        }
      });

      // Check if there's anything to update (including image)
      const hasFieldUpdates = Object.keys(updateData).length > 0;
      const hasImageUpdate = selectedImage !== null || removeImage;

      if (!hasFieldUpdates && !hasImageUpdate) {
        setErrorMessage("Please fill in at least one field to update");
        return;
      }

      setLoading(true);

      let result;

      // If image is selected, we need to use FormData
      if (hasImageUpdate) {
        const formData = new FormData();
        formData.append('ids', JSON.stringify(currentSelectedIds));
        formData.append('data', JSON.stringify(updateData));

        if (selectedImage) {
          formData.append('image', selectedImage);
        }
        if (removeImage) {
          formData.append('remove_image', 'true');
        }

        result = await bulkEditProducts(formData, true); // true = use FormData
      } else {
        const payload = {
          ids: currentSelectedIds,
          data: updateData,
        };
        result = await bulkEditProducts(payload, false);
      }

      if (result.failed && result.failed.length > 0) {
        setErrorMessage(
          `Updated ${result.updated?.length || 0} asset model(s), but ${result.failed.length} failed.`
        );
      } else {
        setSuccessMessage(
          `Successfully updated ${result.updated?.length || currentSelectedIds.length} asset model(s)`
        );
        setTimeout(() => {
          navigate("/products", {
            state: {
              successMessage: `Updated ${result.updated?.length || currentSelectedIds.length} asset model(s)`,
            },
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Bulk edit error:", error);
      setErrorMessage(error.response?.data?.detail || error.message || "Failed to update asset models");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    console.log("isLoading triggered — showing loading screen");
    return <SystemLoading />;
  }

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      <section className="page-layout-with-table">
        <NavBar />

        <main className="main-with-table">
          <TopSecFormPage
            root="Asset Models"
            currentPage="Bulk Edit Asset Models"
            rootNavigatePage="/products"
            title="Bulk Edit Asset Models"
          />

          {/* Selected Asset Models */}
          <section className="asset-models-selected-section">
            <h3>Selected Asset Models ({currentSelectedIds.length})</h3>
            <div className="asset-models-selected-tags">
              {selectedModels.length > 0 ? (
                selectedModels.map((model) => (
                  <div key={model.id} className="asset-model-tag">
                    <span className="asset-model-tag-name">{model.name}</span>
                    <span className="asset-model-tag-id">#{model.id}</span>
                    <button
                      type="button"
                      className="asset-model-tag-remove"
                      onClick={() => handleRemoveModel(model.id)}
                      title="Remove from selection"
                    >
                      <img src={CloseIcon} alt="Remove" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="asset-models-no-selection-message">
                  No asset models selected
                </p>
              )}
            </div>
          </section>

          {/* Bulk Edit Form */}
          <section className="asset-models-bulk-form-section registration">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="asset-models-bulk-form"
            >
              {/* Asset Model Name */}
              <fieldset className="form-field">
                <label htmlFor="productName">Asset Model Name</label>
                <input
                  type="text"
                  id="productName"
                  className={`form-input ${errors.productName ? "input-error" : ""}`}
                  {...register("productName")}
                  maxLength="100"
                  placeholder="Asset Model Name"
                />
              </fieldset>

              {/* Category */}
              <fieldset className="form-field">
                <label htmlFor='category'>Category</label>
                <div className="dropdown-with-add">
                  <select
                    id="category"
                    {...register("category")}
                    className={`form-input ${errors.category ? 'input-error' : ''}`}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => setShowCategoryModal(true)}
                    title="Add new category"
                  >
                    <img src={PlusIcon} alt="Add" />
                  </button>
                </div>
              </fieldset>

              {/* Manufacturer */}
              <fieldset className="form-field">
                <label htmlFor='manufacturer'>Manufacturer</label>
                <div className="dropdown-with-add">
                  <select
                    id="manufacturer"
                    {...register("manufacturer")}
                    className={`form-input ${errors.manufacturer ? 'input-error' : ''}`}
                  >
                    <option value="">Select Manufacturer</option>
                    {manufacturers.map(manufacturer => (
                      <option key={manufacturer.id} value={manufacturer.id}>
                        {manufacturer.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => setShowManufacturerModal(true)}
                    title="Add new manufacturer"
                  >
                    <img src={PlusIcon} alt="Add" />
                  </button>
                </div>
              </fieldset>

              {/* Depreciation */}
              <fieldset className="form-field">
                <label htmlFor='depreciation'>Depreciation</label>
                <div className="dropdown-with-add">
                  <select
                    id="depreciation"
                    {...register("depreciation")}
                    className={`form-input ${errors.depreciation ? 'input-error' : ''}`}
                  >
                    <option value="">Select Depreciation</option>
                    {depreciations.map(depreciation => (
                      <option key={depreciation.id} value={depreciation.id}>
                        {depreciation.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => setShowDepreciationModal(true)}
                    title="Add new depreciation"
                  >
                    <img src={PlusIcon} alt="Add" />
                  </button>
                </div>
              </fieldset>

              {/* Model Number */}
              <fieldset className="form-field">
                <label htmlFor="modelNumber">Model Number</label>
                <input
                  type="text"
                  id="modelNumber"
                  className={`form-input ${
                    errors.modelNumber ? "input-error" : ""
                  }`}
                  {...register("modelNumber")}
                  maxLength="100"
                  placeholder="Model Number"
                />
              </fieldset>

              {/* End of Life Date */}
              <fieldset className="form-field">
                <label htmlFor="endOfLifeDate">End of Life Date</label>
                <input
                  type="date"
                  id="endOfLifeDate"
                  className={`form-input ${errors.endOfLifeDate ? "input-error" : ""}`}
                  {...register("endOfLifeDate")}
                />
              </fieldset>

              {/* Default Purchase Cost */}
              <fieldset className="form-field cost-field">
                <label htmlFor="defaultPurchaseCost">Default Purchase Cost</label>
                <div className="cost-input-group">
                  <span className="cost-addon">PHP</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    id="defaultPurchaseCost"
                    placeholder="0.00"
                    className={`form-input ${
                      errors.defaultPurchaseCost ? "input-error" : ""
                    }`}
                    {...register("defaultPurchaseCost", {
                      pattern: {
                        value: /^[0-9]*\.?[0-9]*$/,
                        message: "Please enter a valid number, e.g. 100.00"
                      }
                    })}
                  />
                </div>
                {errors.defaultPurchaseCost && (
                  <span className="error-message">
                    {errors.defaultPurchaseCost.message}
                  </span>
                )}
              </fieldset>

              {/* Default Supplier */}
              <fieldset className="form-field">
                <label htmlFor='defaultSupplier'>Default Supplier</label>
                <div className="dropdown-with-add">
                  <select
                    id="defaultSupplier"
                    {...register("defaultSupplier")}
                    className={`form-input ${errors.defaultSupplier ? 'input-error' : ''}`}
                  >
                    <option value="">Select Default Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => setShowSupplierModal(true)}
                    title="Add new supplier"
                  >
                    <img src={PlusIcon} alt="Add" />
                  </button>
                </div>
              </fieldset>

              {/* Minimum Quantity */}
              <fieldset className="form-field">
                <label htmlFor="minimumQuantity">Minimum Quantity</label>
                <input
                  type="text"
                  inputMode="numeric"
                  id="minimumQuantity"
                  className={`form-input ${
                    errors.minimumQuantity ? "input-error" : ""
                  }`}
                  {...register("minimumQuantity", {
                    pattern: {
                      value: /^[0-9]*$/,
                      message: "Please enter a valid whole number"
                    }
                  })}
                  placeholder="Minimum Quantity"
                />
                {errors.minimumQuantity && (
                  <span className="error-message">
                    {errors.minimumQuantity.message}
                  </span>
                )}
              </fieldset>

              {/* CPU */}
              <fieldset className="form-field">
                <label htmlFor='cpu'>CPU</label>

                <select
                  id="cpu"
                  {...register("cpu")}
                  className={`form-input ${errors.cpu ? 'input-error' : ''}`}
                >
                  <option value="">Select CPU</option>
                  <option value="intel-i3">Intel Core i3</option>
                  <option value="intel-i5">Intel Core i5</option>
                  <option value="intel-i7">Intel Core i7</option>
                  <option value="intel-i9">Intel Core i9</option>
                  <option value="amd-ryzen-5">AMD Ryzen 5</option>
                  <option value="amd-ryzen-7">AMD Ryzen 7</option>
                  <option value="amd-ryzen-9">AMD Ryzen 9</option>
                  <option value="apple-m1">Apple M1</option>
                  <option value="apple-m2">Apple M2</option>
                  <option value="other">Other</option>
                </select>
              </fieldset>

              {/* GPU */}
              <fieldset className="form-field">
                <label htmlFor='gpu'>GPU</label>
                <select
                  id="gpu"
                  {...register("gpu")}
                  className={`form-input ${errors.gpu ? 'input-error' : ''}`}
                >
                  <option value="">Select GPU</option>
                  <option value="nvidia-gtx-1050">NVIDIA GTX 1050</option>
                  <option value="nvidia-gtx-1650">NVIDIA GTX 1650</option>
                  <option value="nvidia-rtx-2060">NVIDIA RTX 2060</option>
                  <option value="nvidia-rtx-3060">NVIDIA RTX 3060</option>
                  <option value="amd-radeon-rx-5500">AMD Radeon RX 5500</option>
                  <option value="amd-radeon-rx-6600">AMD Radeon RX 6600</option>
                  <option value="integrated">Integrated Graphics</option>
                  <option value="other">Other</option>
                </select>
              </fieldset>

              {/* RAM */}
              <fieldset className="form-field">
                <label htmlFor='ram'>RAM</label>
                <select
                  id="ram"
                  {...register("ram")}
                  className={`form-input ${errors.ram ? 'input-error' : ''}`}
                >
                  <option value="">Select RAM</option>
                  <option value="4gb">4 GB</option>
                  <option value="8gb">8 GB</option>
                  <option value="16gb">16 GB</option>
                  <option value="32gb">32 GB</option>
                  <option value="64gb">64 GB</option>
                  <option value="other">Other</option>
                </select>
              </fieldset>

              {/* Screen Size */}
              <fieldset className="form-field">
                <label htmlFor='screenSize'>Screen Size</label>
                <select
                  id="screenSize"
                  {...register("screenSize")}
                  className={`form-input ${errors.screenSize ? 'input-error' : ''}`}
                >
                  <option value="">Select Screen Size</option>
                  <option value="13-inch">13 inches</option>
                  <option value="14-inch">14 inches</option>
                  <option value="15-inch">15 inches</option>
                  <option value="17-inch">17 inches</option>
                  <option value="21-inch">21 inches</option>
                  <option value="24-inch">24 inches</option>
                  <option value="27-inch">27 inches</option>
                  <option value="other">Other</option>
                </select>
              </fieldset>

              {/* Storage Size */}
              <fieldset className="form-field">
                <label htmlFor='storageSize'>Storage Size</label>
                <select
                  id="storageSize"
                  {...register("storageSize")}
                  className={`form-input ${errors.storageSize ? 'input-error' : ''}`}
                >
                  <option value="">Select Storage Size</option>
                  <option value="128gb">128 GB</option>
                  <option value="256gb">256 GB</option>
                  <option value="512gb">512 GB</option>
                  <option value="1tb">1 TB</option>
                  <option value="2tb">2 TB</option>
                  <option value="other">Other</option>
                </select>
              </fieldset>

              {/* Operating System */}
              <fieldset className="form-field">
                <label htmlFor='operatingSystem'>Operating System</label>
                <select
                  id="operatingSystem"
                  {...register("operatingSystem")}
                  className={`form-input ${errors.operatingSystem ? 'input-error' : ''}`}
                >
                  <option value="">Select Operating System</option>
                  <option value="linux">Linux</option>
                  <option value="windows">Windows</option>
                  <option value="macos">macOS</option>
                  <option value="ubuntu">Ubuntu</option>
                  <option value="centos">CentOS</option>
                  <option value="debian">Debian</option>
                  <option value="fedora">Fedora</option>
                  <option value="other">Other</option>
                </select>
              </fieldset>

              {/* Notes */}
              <fieldset className="form-field notes-field">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  className={`form-input ${errors.notes ? "input-error" : ""}`}
                  {...register("notes")}
                  maxLength="500"
                  placeholder="Notes"
                  rows="4"
                />
              </fieldset>

              {/* Image */}
              <fieldset>
                <label>Image</label>
                {previewImage ? (
                  <div className="image-selected">
                    <img src={previewImage} alt="Selected image" />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setPreviewImage(null);
                        setSelectedImage(null);
                        setValue('image', null);
                        document.getElementById('image').value = '';
                        setRemoveImage(true);
                        console.log("Remove image flag set to:", true);
                      }}
                    >
                      <img src={CloseIcon} alt="Remove" />
                    </button>
                  </div>
                ) : (
                  <label className="upload-image-btn">
                    Choose File
                    <input
                      type="file"
                      id="image"
                      accept="image/*"
                      onChange={handleImageSelection}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
                <small className="file-size-info">
                  Maximum file size must be 5MB
                </small>
              </fieldset>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => navigate("/products")}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update Asset Models
                </button>
              </div>
            </form>
          </section>
          {/* Add Category Modal */}
        <AddEntryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSave={handleSaveCategory}
          title="New Category"
          fields={categoryFields}
          type="category"
        />

        {/* Add Manufacturer Modal */}
        <AddEntryModal
          isOpen={showManufacturerModal}
          onClose={() => setShowManufacturerModal(false)}
          onSave={handleSaveManufacturer}
          title="New Manufacturer"
          fields={manufacturerFields}
          type="manufacturer"
        />

        {/* Add Depreciation Modal */}
        <AddEntryModal
          isOpen={showDepreciationModal}
          onClose={() => setShowDepreciationModal(false)}
          onSave={handleSaveDepreciation}
          title="New Depreciation"
          fields={depreciationFields}
          type="depreciation"
        />

        {/* Add Supplier Modal */}
        <AddEntryModal
          isOpen={showSupplierModal}
          onClose={() => setShowSupplierModal(false)}
          onSave={handleSaveSupplier}
          title="New Supplier"
          fields={supplierFields}
          type="supplier"
        />
        </main>
        <Footer />
      </section>
    </>
  );
}
