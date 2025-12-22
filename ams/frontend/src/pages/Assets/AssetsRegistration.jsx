import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import TopSecFormPage from "../../components/TopSecFormPage";
import CloseIcon from "../../assets/icons/close.svg";
import PlusIcon from "../../assets/icons/plus.svg";
import AddEntryModal from "../../components/Modals/AddEntryModal";
import SystemLoading from "../../components/Loading/SystemLoading";
import Alert from "../../components/Alert";
import "../../styles/Registration.css";
import { getNextAssetId, fetchAssetNames, fetchProductsForAssetRegistration, fetchAssetById, createAsset, updateAsset } from "../../services/assets-service";
import { fetchAllDropdowns, createStatus, createSupplier } from "../../services/contexts-service";
import { fetchAllLocations, createLocation } from "../../services/integration-help-desk-service";


export default function AssetsRegistration() {
  const [products, setProducts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [asset, setAsset] = useState(null);
  const [isClone, setIsClone] = useState(false);

  // Modal states for adding new entries
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const currentDate = new Date().toISOString().split("T")[0];

  const { setValue, register, handleSubmit, formState: { errors, isValid } } = useForm({
    mode: "all",
    defaultValues: {
      assetId: '',
      product: '',
      status: '',
      supplier: '',
      location: '',
      assetName: '',
      serialNumber: '',
      warrantyExpiration: '',
      orderNumber: '',
      purchaseDate: '',
      purchaseCost: '',
      notes: '',
    }
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Determine mode: clone mode passed from AssetViewPage
  const cloneMode = location.state?.isClone === true;

  const generateCloneName = async (baseName) => {
    // 1. Fetch all existing asset names that contain the base name
    const existing = await fetchAssetNames({ search: baseName });
    const existingNames = existing.map(a => a.name);

    // 2. Pattern matches: "BaseName (clone)" or "BaseName (clone) (N)" - case insensitive
    const clonePattern = new RegExp(`^${escapeRegExp(baseName)} \\(clone\\)(?: \\((\\d+)\\))?$`, 'i');

    // 3. Find the highest existing clone index
    let maxIndex = -1; // -1 means no clones exist yet
    existingNames.forEach(name => {
      const match = name.match(clonePattern);
      if (match) {
        // If no number group, it's the first clone (index 0)
        // If number group exists, that's the index
        const index = match[1] ? parseInt(match[1], 10) : 0;
        if (index > maxIndex) maxIndex = index;
      }
    });

    // 4. Generate clone name
    if (maxIndex === -1) {
      // No clones exist, return first clone name
      return `${baseName} (clone)`;
    }
    // Clones exist, return next number
    return `${baseName} (clone) (${maxIndex + 1})`;
  };

  // Utility to escape regex special chars in base name
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setIsClone(cloneMode);

        // Generate new asset ID for clone mode or new registration
        if (cloneMode || !id) {
          const nextAssetId = await getNextAssetId();
          setValue("assetId", nextAssetId || "");
        }

        // Fetch dropdown options for assets (filter statuses by asset category)
        const contextDropdowns = await fetchAllDropdowns("asset", { category: "asset" });
        setStatuses(contextDropdowns.statuses || []);
        setSuppliers(contextDropdowns.suppliers || []);

        // Fetch dropdown options for locations from Help Desk service
        const helpDeskDropdowns = await fetchAllLocations();
        setLocations(helpDeskDropdowns || []);

        // Fetch products for asset registration (includes default_purchase_cost and default_supplier)
        const productsData = await fetchProductsForAssetRegistration();
        setProducts(productsData || []);

        // If editing or cloning, fetch the asset data
        if (id) {
          const assetData = await fetchAssetById(id);
          if (assetData) {
            setAsset(assetData);

            // Fill form with asset data
            if (!cloneMode) {
              setValue("assetId", assetData.asset_id || "");
            }
            setValue("product", assetData.product || "");
            setValue("status", assetData.status || "");
            setValue("supplier", assetData.supplier || "");
            setValue("location", assetData.location || "");
            if (cloneMode) {
              const clonedName = await generateCloneName(assetData.name);
              setValue("assetName", clonedName);
            } else {
              setValue("assetName", assetData.name || "");
            }
            setValue("serialNumber", assetData.serial_number || "");
            setValue("warrantyExpiration", assetData.warranty_expiration || "");
            setValue("orderNumber", assetData.order_number || "");
            setValue("purchaseDate", assetData.purchase_date || "");
            setValue("purchaseCost", assetData.purchase_cost || "");
            setValue("notes", assetData.notes || "");

            if (assetData.image) {
              setPreviewImage(assetData.image);

              // For cloning, fetch the image as a file so it can be uploaded with the new asset
              if (cloneMode) {
                try {
                  const response = await fetch(assetData.image);
                  const blob = await response.blob();
                  const fileName = assetData.image.split('/').pop() || 'cloned-image.jpg';
                  const file = new File([blob], fileName, { type: blob.type });
                  setSelectedImage(file);
                } catch (imgError) {
                  console.error("Failed to fetch image for cloning:", imgError);
                }
              }
            }
          }
        } else {
          // New registration - generate new asset ID
          const nextAssetId = await getNextAssetId();
          setValue("assetId", nextAssetId || "");
        }
      } catch (error) {
        console.error("Error initializing:", error);
        setErrorMessage("Failed to initialize form data");
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [id, cloneMode, setValue]);

  const handleImageSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Image size exceeds 5MB. Please choose a smaller file.");
        setTimeout(() => setErrorMessage(""), 5000);
        return;
      }

      setSelectedImage(file);
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
      if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        setErrorMessage("Please select a valid .xlsx file");
        setTimeout(() => setErrorMessage(""), 5000);
        return;
      }
      console.log("Import file selected:", file.name);
    }
  };

  // Modal field configurations
  const statusFields = [
    {
      name: 'name',
      label: 'Status Label',
      type: 'text',
      placeholder: 'Status Label',
      required: true,
      maxLength: 100,
      validation: { required: 'Status Label is required' }
    },
    {
      name: 'category',
      type: 'hidden',
      defaultValue: 'asset'
    },
    {
      name: 'type',
      label: 'Status Type',
      type: 'select',
      placeholder: 'Select Status Type',
      required: true,
      options: [
        { value: 'deployable', label: 'Deployable' },
        { value: 'deployed', label: 'Deployed' },
        { value: 'undeployable', label: 'Undeployable' },
        { value: 'pending', label: 'Pending' },
        { value: 'archived', label: 'Archived' }
      ],
      validation: { required: 'Status Type is required' }
    }
  ];

  const supplierFields = [
    {
      name: 'name',
      label: 'Supplier Name',
      type: 'text',
      placeholder: 'Supplier Name',
      required: true,
      maxLength: 100,
      validation: { required: 'Supplier Name is required' }
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Email',
      required: false,
      maxLength: 100
    },
    {
      name: 'phone_number',
      label: 'Phone Number',
      type: 'text',
      placeholder: 'Phone Number',
      required: false,
      maxLength: 20
    }
  ];

  const locationFields = [
    {
      name: 'city',
      label: 'City',
      type: 'text',
      placeholder: 'City Name',
      required: true,
      maxLength: 50,
      validation: { required: 'City is required' }
    }
  ];

  // Modal save handlers
  const handleSaveStatus = async (data) => {
    try {
      const newStatus = await createStatus(data);
      setStatuses([...statuses, newStatus]);
      setShowStatusModal(false);
      setErrorMessage("");
    } catch (error) {
      console.error('Error creating status:', error);
      setErrorMessage("Failed to create status");
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
      console.error('Error creating supplier:', error);
      setErrorMessage("Failed to create supplier");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const handleSaveLocation = async (data) => {
    try {
      // For now, just add to local state (location API not available)
      console.log('Creating location:', data);
      const newLocation = await createLocation(data);
      setLocations(prev => [...prev, newLocation]);
      setShowLocationModal(false);
    } catch (error) {
      console.error('Error creating location:', error);
      setErrorMessage("Failed to create location");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const onSubmit = async (data) => {
    setErrorMessage("");

    // Determine if this is an edit (id present and not cloning) or create (new or clone)
    const isUpdate = id && !isClone;

    try {
      const formData = new FormData();

      // Append asset data to FormData object - only include non-empty values
      // Send asset_id only on create (new or clone), not on update
      if (!isUpdate && data.assetId) formData.append('asset_id', data.assetId);
      if (data.product) formData.append('product', data.product);
      if (data.status) formData.append('status', data.status);
      if (data.supplier) formData.append('supplier', data.supplier);
      if (data.location) formData.append('location', data.location);
      if (data.assetName) formData.append('name', data.assetName);
      if (data.serialNumber) formData.append('serial_number', data.serialNumber);
      if (data.warrantyExpiration) formData.append('warranty_expiration', data.warrantyExpiration);
      if (data.orderNumber) formData.append('order_number', data.orderNumber);
      if (data.purchaseDate) formData.append('purchase_date', data.purchaseDate);
      if (data.purchaseCost) formData.append('purchase_cost', data.purchaseCost);
      // Notes can be empty string
      formData.append('notes', data.notes || '');

      // Handle image upload
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      // Handle image removal (only for edit mode)
      if (removeImage && isUpdate) {
        formData.append('remove_image', 'true');
        console.log("Removing image: remove_image flag set to true");
      }

      console.log("Form data before submission:");
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }
      console.log("isUpdate:", isUpdate, "id:", id, "isClone:", isClone);

      let result;

      if (isUpdate) {
        // Update existing asset
        result = await updateAsset(id, formData);
      } else {
        // Create new asset (registration or clone)
        result = await createAsset(formData);
      }

      if (!result) {
        throw new Error(`Failed to ${isUpdate ? 'update' : 'create'} asset.`);
      }

      const action = isClone ? 'cloned' : (isUpdate ? 'updated' : 'created');
      console.log(`${action} asset:`, result);
      navigate('/assets', {
        state: {
          successMessage: `Asset has been ${action} successfully!`
        }
      });
    } catch (error) {
      const action = isClone ? 'cloning' : (id && !isClone ? 'updating' : 'creating');
      console.error(`Error ${action} asset:`, error);

      let message = `An error occurred while ${action} the asset`;

      if (error.response && error.response.data) {
        const errorData = error.response.data;

        // Extract the first message from the first key
        if (typeof errorData === "object") {
          const firstKey = Object.keys(errorData)[0];
          if (Array.isArray(errorData[firstKey]) && errorData[firstKey].length > 0) {
            message = errorData[firstKey][0];
          }
        }
      }

      setErrorMessage(message);
    }
  };



  // Handle product selection to auto-fill default values from products list
  // Only apply defaults when the product is actually changed from the original
  const handleProductChange = (event) => {
    const productId = event.target.value;
    setValue('product', productId);

    // Only apply product defaults if:
    // 1. A product is selected AND
    // 2. It's either a new registration OR the product is different from the original asset's product
    const originalProductId = asset?.product;
    const isProductChanged = !originalProductId || parseInt(productId) !== originalProductId;

    if (productId && isProductChanged) {
      // Find the product from the already-loaded products list
      const product = products.find(p => p.id === parseInt(productId));

      if (product) {
        console.log("Product changed, applying defaults:", product);

        // Set purchase cost if available
        if (product.default_purchase_cost) {
          setValue('purchaseCost', product.default_purchase_cost);
        }

        // Set supplier if available
        if (product.default_supplier) {
          setValue('supplier', String(product.default_supplier));
        }
      }
    }
  };

  if (isLoading) {
    console.log("isLoading triggered — showing loading screen");
    return <SystemLoading />;
  }

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      <section className="page-layout-registration">
        <NavBar />
        <main className="registration">
        <section className="top">
          <TopSecFormPage
            root="Assets"
            currentPage={isClone ? "Clone Asset" : (id ? "Edit Asset" : "New Asset")}
            rootNavigatePage="/assets"
            title={isClone ? `Clone ${asset?.name || 'Asset'}` : (id ? `Edit ${asset?.name || 'Asset'}` : 'New Asset')}
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

        <section className="registration-form">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Asset ID */}
            <fieldset>
              <label htmlFor='asset-id'>Asset ID <span style={{color: 'red'}}>*</span></label>
              <input
                type='text'
                readOnly
                className={errors.assetId ? 'input-error' : ''}
                {...register('assetId', { required: 'Asset ID is required' })}
                maxLength='20'
                placeholder='Asset ID'
              />
              {errors.assetId && <span className='error-message'>{errors.assetId.message}</span>}
            </fieldset>

            {/* Product Dropdown */}
            <fieldset>
              <label htmlFor='product'>Product <span style={{color: 'red'}}>*</span></label>
              <select
                id="product"
                {...register("product", { required: "Product is required" })}
                onChange={handleProductChange}
                className={errors.product ? 'input-error' : ''}
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              {errors.product && <span className='error-message'>{errors.product.message}</span>}
            </fieldset>

            {/* Status Dropdown with + button */}
            <fieldset>
              <label htmlFor='status'>Status <span style={{color: 'red'}}>*</span></label>
              <div className="dropdown-with-add">
                <select
                  id="status"
                  {...register("status", { required: "Status is required" })}
                  className={errors.status ? 'input-error' : ''}
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
              {errors.status && <span className='error-message'>{errors.status.message}</span>}
            </fieldset>

            {/* Supplier Dropdown with + button */}
            <fieldset>
              <label htmlFor='supplier'>Supplier</label>
              <div className="dropdown-with-add">
                <select
                  id="supplier"
                  {...register("supplier")}
                  className={errors.supplier ? 'input-error' : ''}
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

            {/* Location Dropdown with + button */}
            <fieldset>
              <label htmlFor='location'>Location</label>
              <div className="dropdown-with-add">
                <select
                  id="location"
                  {...register("location")}
                  className={errors.location ? 'input-error' : ''}
                >
                  <option value="">Select Location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.city}
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
            <fieldset>
              <label htmlFor='asset-name'>Asset Name</label>
              <input
                type='text'
                className={errors.assetName ? 'input-error' : ''}
                {...register('assetName')}
                maxLength='100'
                placeholder='Asset Name'
              />
              {errors.assetName && <span className='error-message'>{errors.assetName.message}</span>}
            </fieldset>

            {/* Serial Number */}
            <fieldset>
              <label htmlFor='serial-number'>Serial Number</label>
              <input
                type='text'
                {...register('serialNumber')}
                maxLength='50'
                placeholder='Serial Number'
              />
            </fieldset>

            {/* Warranty Expiration Date */}
            <fieldset>
              <label htmlFor='warranty-expiration'>Warranty Expiration Date</label>
              <input
                type='date'
                {...register('warrantyExpiration')}
                min={!id ? currentDate : undefined}
              />
            </fieldset>

            {/* Order Number */}
            <fieldset>
              <label htmlFor='order-number'>Order Number</label>
              <input
                type='text'
                {...register('orderNumber')}
                maxLength='50'
                placeholder='Order Number'
              />
            </fieldset>

            {/* Purchase Date */}
            <fieldset>
              <label htmlFor='purchase-date'>Purchase Date</label>
              <input
                type='date'
                {...register('purchaseDate')}
                min={!id ? currentDate : undefined}
              />
            </fieldset>

            {/* Purchase Cost */}
            <fieldset className="cost-field">
              <label htmlFor="purchaseCost">Purchase Cost</label>
              <div className="cost-input-group">
                <span className="cost-addon">PHP</span>
                <input
                  type="number"
                  id="purchaseCost"
                  name="purchaseCost"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  {...register("purchaseCost", { valueAsNumber: true })}
                />
              </div>
            </fieldset>

            {/* Notes */}
            <fieldset>
              <label htmlFor='notes'>Notes</label>
              <textarea
                {...register('notes')}
                maxLength='500'
                placeholder='Notes...'
              />
            </fieldset>

            {/* Image Upload */}
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

            <button type="submit" className="primary-button" disabled={!isValid}>Save</button>
          </form>
        </section>
      </main>
      <Footer />
      </section>

      {/* Modals */}
      <AddEntryModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSave={handleSaveStatus}
        title="New Status Label"
        fields={statusFields}
        type="status"
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
}