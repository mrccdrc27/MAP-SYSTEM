import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import NavBar from "../../components/NavBar";
import TopSecFormPage from "../../components/TopSecFormPage";
import Alert from "../../components/Alert";
import SystemLoading from "../../components/Loading/SystemLoading";
import CloseIcon from "../../assets/icons/close.svg";
import PlusIcon from "../../assets/icons/plus.svg";
import AddEntryModal from "../../components/Modals/AddEntryModal";
import { fetchAssetNames, bulkEditAssets, fetchProductsForAssetRegistration } from "../../services/assets-service";
import { fetchAllDropdowns, createStatus, createSupplier } from "../../services/contexts-service";
import { fetchAllLocations, createLocation } from "../../services/integration-help-desk-service";
import "../../styles/Registration.css";
import "../../styles/Assets/BulkEditAssets.css";

export default function BulkEditAssets() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedIds } = location.state || { selectedIds: [] };

  const [currentSelectedIds, setCurrentSelectedIds] = useState(selectedIds || []);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [isLoading, setLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [previewImage, setPreviewImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  // Modal states for adding new entries
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const currentDate = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    mode: "all",
    defaultValues: {
      product: '',
      status: '',
      supplier: '',
      location: '',
      name: '',
      serial_number: '',
      warranty_expiration: '',
      order_number: '',
      purchase_date: '',
      purchase_cost: '',
      notes: '',
    }
  });

  useEffect(() => {
    async function loadSelectedAssets() {
      try {
        if (!selectedIds || selectedIds.length === 0) {
          setErrorMessage("No assets selected for bulk edit");
          setTimeout(() => navigate('/assets'), 2000);
          return;
        }

        setLoading(true);
        const assets = await fetchAssetNames({ ids: selectedIds });
        setSelectedAssets(assets);

        // Update currentSelectedIds to only include IDs that exist
        const validIds = assets.map(a => a.id);
        setCurrentSelectedIds(validIds);

        // Fetch products for asset registration (includes default_purchase_cost and default_supplier)
        const productsData = await fetchProductsForAssetRegistration();
        setProducts(productsData || []);

        // Fetch dropdown options
        const dropdowns = await fetchAllDropdowns("asset");
        setStatuses(dropdowns.statuses || []);
        setSuppliers(dropdowns.suppliers || []);

        const locationsData = await fetchAllLocations();
        setLocations(locationsData || []);

      } catch (error) {
        setErrorMessage("Failed to load selected assets");
      } finally {
        setLoading(false);
      }
    }

    loadSelectedAssets();
  }, [selectedIds, navigate]);

  const handleRemoveAsset = (assetId) => {
    setCurrentSelectedIds(prev => prev.filter(id => id !== assetId));
  };

  // Handle product selection to auto-fill default values
  const handleProductChange = (event) => {
    const productId = event.target.value;
    setValue('product', productId);

    if (productId) {
      const product = products.find(p => p.id === parseInt(productId));
      if (product) {
        // Set purchase cost if available
        if (product.default_purchase_cost) {
          setValue('purchase_cost', product.default_purchase_cost);
        }
        // Set supplier if available
        if (product.default_supplier) {
          setValue('supplier', String(product.default_supplier));
        }
      }
    }
  };

  const handleAddStatus = async (data) => {
    try {
      const statusData = {
        name: data.name,
        category: 'asset',
        type: data.type
      };
      const newStatus = await createStatus(statusData);
      setStatuses([...statuses, newStatus]);
      setShowStatusModal(false);
      setErrorMessage("");
    } catch (error) {
      console.error("Error creating status:", error);
      setErrorMessage("Failed to create status");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const handleAddSupplier = async (data) => {
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

  const handleAddLocation = async (data) => {
    try {
      const newLocation = await createLocation(data);
      setLocations([...locations, newLocation]);
      setShowLocationModal(false);
      setErrorMessage("");
    } catch (error) {
      console.error("Error creating location:", error);
      setErrorMessage("Failed to create location");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

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

  const onSubmit = async (data) => {
    try {
      if (currentSelectedIds.length === 0) {
        setErrorMessage("Please select at least one asset to update");
        return;
      }

      // Filter out empty values
      const updateData = {};
      Object.entries(data).forEach(([key, value]) => {
        const isEmptyOrInvalid = value === "" || value === null || value === undefined ||
                                  (typeof value === 'number' && isNaN(value));
        if (!isEmptyOrInvalid) {
          // For decimal fields, keep as string to preserve precision
          if (key === 'purchase_cost') {
            updateData[key] = String(value);
          } else {
            updateData[key] = value;
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

        result = await bulkEditAssets(formData, true); // true = use FormData
      } else {
        const payload = {
          ids: currentSelectedIds,
          data: updateData,
        };
        result = await bulkEditAssets(payload, false);
      }

      if (result.failed && result.failed.length > 0) {
        setErrorMessage(
          `Updated ${result.updated?.length || 0} asset(s), but ${result.failed.length} failed.`
        );
      } else {
        setSuccessMessage(
          `Successfully updated ${result.updated?.length || currentSelectedIds.length} asset(s)`
        );
        setTimeout(() => {
          navigate('/assets', {
            state: {
              successMessage: `Updated ${result.updated?.length || currentSelectedIds.length} asset(s)`,
            },
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Bulk edit error:", error);
      setErrorMessage(error.response?.data?.detail || error.message || "Failed to update assets");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
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
            root="Assets"
            currentPage="Bulk Edit Assets"
            rootNavigatePage="/assets"
            title="Bulk Edit Assets"
          />

          {/* Selected Assets Section */}
          <section className="selected-assets-section">
            <h3>Selected Assets ({selectedAssets.filter(a => currentSelectedIds.includes(a.id)).length})</h3>
            <div className="selected-assets-tags">
              {selectedAssets.filter(a => currentSelectedIds.includes(a.id)).length > 0 ? (
                selectedAssets
                  .filter(a => currentSelectedIds.includes(a.id))
                  .map((asset) => (
                    <div key={asset.id} className="asset-tag">
                      <span className="asset-tag-name">{asset.name || 'Unnamed Asset'}</span>
                      <span className="asset-tag-id">{asset.asset_id}</span>
                      <button
                        type="button"
                        className="asset-tag-remove"
                        onClick={() => handleRemoveAsset(asset.id)}
                        title="Remove from selection"
                      >
                        <img src={CloseIcon} alt="Remove" />
                      </button>
                    </div>
                  ))
              ) : (
                <p className="no-assets-message">No assets selected</p>
              )}
            </div>
          </section>

          <section className="bulk-edit-form-section registration">
            <form onSubmit={handleSubmit(onSubmit)} className="bulk-edit-form">
              {/* Product Dropdown */}
              <fieldset className="form-field">
                <label htmlFor='product'>Product</label>
                <select
                  id="product"
                  {...register("product")}
                  onChange={handleProductChange}
                  className={`form-input ${errors.product ? 'input-error' : ''}`}
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </fieldset>

              {/* Status Dropdown with Add Button */}
              <fieldset className="form-field">
                <label htmlFor='status'>Status</label>
                <div className="dropdown-with-add">
                  <select
                    id="status"
                    {...register("status")}
                    className={`form-input ${errors.status ? 'input-error' : ''}`}
                  >
                    <option value="">Select Status</option>
                    {statuses.map(status => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => setShowStatusModal(true)}
                    title="Add new status"
                  >
                    <img src={PlusIcon} alt="Add" />
                  </button>
                </div>
              </fieldset>

              {/* Supplier Dropdown with Add Button */}
              <fieldset className="form-field">
                <label htmlFor='supplier'>Supplier</label>
                <div className="dropdown-with-add">
                  <select
                    id="supplier"
                    {...register("supplier")}
                    className={`form-input ${errors.supplier ? 'input-error' : ''}`}
                  >
                    <option value="">Select Supplier</option>
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
                {errors.supplier && <span className='error-message'>{errors.supplier.message}</span>}
              </fieldset>

              {/* Location Dropdown with Add Button */}
              <fieldset className="form-field">
                <label htmlFor='location'>Location</label>
                <div className="dropdown-with-add">
                  <select
                    id="location"
                    {...register("location")}
                    className={`form-input ${errors.location ? 'input-error' : ''}`}
                  >
                    <option value="">Select Location</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => setShowLocationModal(true)}
                    title="Add new location"
                  >
                    <img src={PlusIcon} alt="Add" />
                  </button>
                </div>
                {errors.location && <span className='error-message'>{errors.location.message}</span>}
              </fieldset>

              {/* Asset Name */}
              <fieldset className="form-field">
                <label htmlFor='name'>Asset Name</label>
                <input
                  type='text'
                  id='name'
                  className={`form-input ${errors.name ? 'input-error' : ''}`}
                  {...register('name')}
                  maxLength='100'
                  placeholder='Asset Name'
                />
                {errors.name && <span className='error-message'>{errors.name.message}</span>}
              </fieldset>

              {/* Serial Number */}
              <fieldset className="form-field">
                <label htmlFor='serial_number'>Serial Number</label>
                <input
                  type='text'
                  id='serial_number'
                  className={`form-input ${errors.serial_number ? 'input-error' : ''}`}
                  {...register('serial_number')}
                  maxLength='50'
                  placeholder='Serial Number'
                />
                {errors.serial_number && <span className='error-message'>{errors.serial_number.message}</span>}
              </fieldset>

              {/* Warranty Expiration Date */}
              <fieldset className="form-field">
                <label htmlFor='warranty_expiration'>Warranty Expiration Date</label>
                <input
                  type='date'
                  id='warranty_expiration'
                  className={`form-input ${errors.warranty_expiration ? 'input-error' : ''}`}
                  {...register('warranty_expiration')}
                />
                {errors.warranty_expiration && <span className='error-message'>{errors.warranty_expiration.message}</span>}
              </fieldset>

              {/* Order Number */}
              <fieldset className="form-field">
                <label htmlFor='order_number'>Order Number</label>
                <input
                  type='text'
                  id='order_number'
                  className={`form-input ${errors.order_number ? 'input-error' : ''}`}
                  {...register('order_number')}
                  maxLength='50'
                  placeholder='Order Number'
                />
                {errors.order_number && <span className='error-message'>{errors.order_number.message}</span>}
              </fieldset>

              {/* Purchase Date */}
              <fieldset className="form-field">
                <label htmlFor='purchase_date'>Purchase Date</label>
                <input
                  type='date'
                  id='purchase_date'
                  className={`form-input ${errors.purchase_date ? 'input-error' : ''}`}
                  {...register('purchase_date')}
                />
                {errors.purchase_date && <span className='error-message'>{errors.purchase_date.message}</span>}
              </fieldset>

              {/* Purchase Cost */}
              <fieldset className="form-field cost-field">
                <label htmlFor="purchase_cost">Purchase Cost</label>
                <div className="cost-input-group">
                  <span className="cost-addon">PHP</span>
                  <input
                    type="number"
                    id="purchase_cost"
                    name="purchase_cost"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`form-input ${errors.purchase_cost ? 'input-error' : ''}`}
                    {...register("purchase_cost", { valueAsNumber: true })}
                  />
                </div>
                {errors.purchase_cost && <span className='error-message'>{errors.purchase_cost.message}</span>}
              </fieldset>

              {/* Notes */}
              <fieldset className="form-field notes-field">
                <label htmlFor='notes'>Notes</label>
                <textarea
                  id='notes'
                  className={`form-input ${errors.notes ? 'input-error' : ''}`}
                  {...register('notes')}
                  maxLength='500'
                  placeholder='Notes'
                  rows='4'
                />
                {errors.notes && <span className='error-message'>{errors.notes.message}</span>}
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
                  onClick={() => navigate('/assets')}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update Assets
                </button>
              </div>
            </form>
          </section>
        </main>
      </section>

      {/* Modals */}
      {showStatusModal && (
        <AddEntryModal
          title="Add New Status"
          fields={[
            {
              name: "name",
              label: "Status Name",
              type: "text",
              required: true,
              placeholder: "Enter status name",
              validation: { required: 'Status Name is required' }
            },
            {
              name: "category",
              type: "hidden",
              defaultValue: "asset"
            },
            {
              name: "type",
              label: "Status Type",
              type: "select",
              required: true,
              placeholder: "Select Status Type",
              options: [
                { value: 'deployable', label: 'Deployable' },
                { value: 'deployed', label: 'Deployed' },
                { value: 'undeployable', label: 'Undeployable' },
                { value: 'pending', label: 'Pending' },
                { value: 'archived', label: 'Archived' }
              ],
              validation: { required: 'Status Type is required' }
            }
          ]}
          onSubmit={handleAddStatus}
          onClose={() => setShowStatusModal(false)}
        />
      )}

      {showSupplierModal && (
        <AddEntryModal
          title="Add New Supplier"
          fields={[
            {
              name: "name",
              label: "Supplier Name",
              type: "text",
              required: true,
              placeholder: "Enter supplier name"
            }
          ]}
          onSubmit={handleAddSupplier}
          onClose={() => setShowSupplierModal(false)}
        />
      )}

      {showLocationModal && (
        <AddEntryModal
          title="Add New Location"
          fields={[
            {
              name: "name",
              label: "Location Name",
              type: "text",
              required: true,
              placeholder: "Enter location name"
            }
          ]}
          onSubmit={handleAddLocation}
          onClose={() => setShowLocationModal(false)}
        />
      )}
    </>
  );
}
