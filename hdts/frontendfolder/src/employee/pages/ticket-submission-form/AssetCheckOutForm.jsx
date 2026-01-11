import { useState, useEffect } from 'react';

// AMS API endpoints
const AMS_CATEGORIES_URL = 'https://ams-contexts.up.railway.app/categories/names/?type=asset';
const AMS_ASSETS_URL = 'https://ams-assets.up.railway.app/assets/names/';

// Hardcoded locations - will be replaced with API endpoint later
const locations = [
  'Main Office - 1st Floor',
  'Main Office - 2nd Floor',
  'Main Office - 3rd Floor',
  'Branch Office - North',
  'Branch Office - South',
  'Warehouse',
  'Remote/Home Office'
];

export default function AssetCheckOutForm({ formData, onChange, onBlur, errors, FormField, onAssetSelect }) {
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Fetch categories from AMS API on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await fetch(AMS_CATEGORIES_URL);
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        } else {
          console.error('Failed to fetch categories:', response.status);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Find the selected category ID based on the subCategory name
  const getSelectedCategoryId = () => {
    const selectedCategory = categories.find(cat => cat.name === formData.subCategory);
    return selectedCategory ? selectedCategory.id : null;
  };

  // Fetch assets when subCategory changes - filter by category ID
  useEffect(() => {
    const fetchAssets = async () => {
      if (!formData.subCategory) {
        setAssets([]);
        return;
      }

      const categoryId = getSelectedCategoryId();
      if (!categoryId) {
        setAssets([]);
        return;
      }

      try {
        setLoadingAssets(true);
        // Fetch assets filtered by category ID and status (only deployable assets)
        const response = await fetch(`${AMS_ASSETS_URL}?category=${categoryId}&status_type=deployable`);
        if (response.ok) {
          const data = await response.json();
          setAssets(data);
        } else {
          console.error('Failed to fetch assets:', response.status);
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setLoadingAssets(false);
      }
    };

    fetchAssets();
  }, [formData.subCategory, categories]);

  // Handle asset selection - auto-populate serial number
  const handleAssetChange = (e) => {
    const selectedAssetName = e.target.value;
    const selectedAsset = assets.find(asset => asset.name === selectedAssetName);
    
    // Call the parent onChange for assetName
    onChange('assetName')(e);
    
    // Call the callback to update serial number if asset is found
    if (selectedAsset && onAssetSelect) {
      onAssetSelect(selectedAsset);
    }
  };

  // Handle category change - clear asset and serial number
  const handleCategoryChange = (e) => {
    // Call parent onChange for subCategory
    onChange('subCategory')(e);
    
    // Clear asset-related fields when category changes
    if (onAssetSelect) {
      onAssetSelect(null); // Pass null to clear serial number
    }
  };

  // Calculate minimum date for expected return date based on check out date
  const getMinExpectedReturnDate = () => {
    if (formData.checkOutDate) {
      return formData.checkOutDate;
    }
    // Default to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Get today's date for minimum check out date
  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <>
      {/* Sub-Category (Type of Product) */}
      <FormField
        id="subCategory"
        label="Sub-Category (Type of Product)"
        required
        error={errors.subCategory}
        render={() => (
          <select
            value={formData.subCategory}
            onChange={handleCategoryChange}
            onBlur={onBlur('subCategory')}
            disabled={loadingCategories}
          >
            <option value="">
              {loadingCategories ? 'Loading categories...' : 'Select Product Type'}
            </option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      />

      {/* Asset Name */}
      <FormField
        id="assetName"
        label="Asset Name"
        required
        error={errors.assetName}
        render={() => (
          <select
            disabled={!formData.subCategory || loadingAssets}
            value={formData.assetName}
            onChange={handleAssetChange}
            onBlur={onBlur('assetName')}
          >
            <option value="">
              {loadingAssets ? 'Loading assets...' : 'Select Asset'}
            </option>
            {assets.map(asset => (
              <option key={asset.id} value={asset.name}>
                {asset.name}
              </option>
            ))}
          </select>
        )}
      />

      {/* Serial Number (Auto-filled) */}
      <FormField
        id="serialNumber"
        label="Serial Number"
        render={() => (
          <input
            type="text"
            placeholder="Auto-filled when asset is selected"
            readOnly
            value={formData.serialNumber}
            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
          />
        )}
      />

      {/* Location */}
      <FormField
        id="location"
        label="Location"
        required
        error={errors.location}
        render={() => (
          <select
            value={formData.location}
            onChange={onChange('location')}
            onBlur={onBlur('location')}
          >
            <option value="">Select Location</option>
            {locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        )}
      />

      {/* Check Out Date */}
      <FormField
        id="checkOutDate"
        label="Check Out Date"
        required
        error={errors.checkOutDate}
        render={() => (
          <input
            type="date"
            value={formData.checkOutDate || ''}
            onChange={onChange('checkOutDate')}
            onBlur={onBlur('checkOutDate')}
            min={getTodayDate()}
          />
        )}
      />

      {/* Expected Return Date */}
      <FormField
        id="expectedReturnDate"
        label="Expected Return Date"
        required
        error={errors.expectedReturnDate}
        render={() => (
          <input
            type="date"
            value={formData.expectedReturnDate}
            onChange={onChange('expectedReturnDate')}
            onBlur={onBlur('expectedReturnDate')}
            min={getMinExpectedReturnDate()}
            disabled={!formData.checkOutDate}
          />
        )}
      />
    </>
  );
}
