import { useState, useEffect } from 'react';

// API URL for fetching locations from HDTS backend
const HDTS_API_URL = import.meta.env.VITE_HDTS_BACKEND_URL || 'http://165.22.247.50:5001';

export default function AssetCheckOutForm({ formData, onChange, onBlur, errors, FormField, onAssetSelect, prefetchedCategories = [], prefetchLoading = false }) {
  // Use categories passed from parent (prefetched on page load)
  const categories = prefetchedCategories;
  const loadingCategories = prefetchLoading;
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  // Locations state - fetched from API
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Fetch locations from HDTS API on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      try {
        const response = await fetch(`${HDTS_API_URL}/api/locations/`);
        const data = await response.json();
        if (data.success && Array.isArray(data.locations)) {
          setLocations(data.locations);
        } else {
          console.error('Invalid locations response:', data);
          setLocations([]);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        // Fallback to empty - no hardcoded locations
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  // Derive assets from the fetched registration/categories payload when subCategory changes
  useEffect(() => {
    const deriveAssets = async () => {
      if (!formData.subCategory) {
        setAssets([]);
        return;
      }

      try {
        setLoadingAssets(true);

        // Find matching category object by several possible keys
        let selected = null;
        if (Array.isArray(categories)) {
          selected = categories.find(c => (
            (c.name && c.name === formData.subCategory) ||
            (c.title && c.title === formData.subCategory) ||
            (String(c.id) === String(formData.subCategory))
          ));
        }

        // Support cases where categories is an object mapping names to arrays
        let items = [];
        if (selected) {
          items = selected.assets || selected.items || selected.children || selected.assets_list || selected.asset_list || selected.assetNames || selected.assetsNames || [];
        } else if (categories && !Array.isArray(categories) && (categories[formData.subCategory] || categories[formData.subCategory.toLowerCase()])) {
          items = categories[formData.subCategory] || categories[formData.subCategory.toLowerCase()];
        }

        // Normalize to empty array if not found
        if (!Array.isArray(items)) items = [];

        setAssets(items);
      } catch (error) {
        console.error('Error deriving assets from registration payload:', error);
        setAssets([]);
      } finally {
        setLoadingAssets(false);
      }
    };

    deriveAssets();
  }, [formData.subCategory, categories]);

  // Handle asset selection - auto-populate serial number
  const handleAssetChange = (e) => {
    const selectedAssetName = e.target.value;

    // Call the parent onChange for assetName
    onChange('assetName')(e);

    // Find selected asset by a variety of name keys
    const selectedAsset = assets.find(asset => (
      (asset.name && asset.name === selectedAssetName) ||
      (asset.asset_name && asset.asset_name === selectedAssetName) ||
      (asset.title && asset.title === selectedAssetName) ||
      (asset.label && asset.label === selectedAssetName)
    ));

    if (selectedAsset && onAssetSelect) {
      // Normalize returned asset object so parent gets consistent keys
      const normalized = {
        id: selectedAsset.id || selectedAsset.asset_id || selectedAsset.assetId || null,
        name: selectedAsset.name || selectedAsset.asset_name || selectedAsset.title || selectedAsset.label || '',
        asset_id: selectedAsset.asset_id || selectedAsset.assetId || selectedAsset.id || '',
        serial_number: selectedAsset.serial_number || selectedAsset.serialNumber || selectedAsset.serial || ''
      };
      onAssetSelect(normalized);
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
      const d = new Date(formData.checkOutDate);
      d.setDate(d.getDate() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    // Default to today + 1 day
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Get minimum check out date: today + 2 days
  const getMinCheckOutDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 2);
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
            value={formData.location?.id || formData.location || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              const selectedLocation = locations.find(loc => String(loc.id) === String(selectedId));
              // Store location object with id and city (as name)
              if (selectedLocation) {
                onChange('location')({ target: { value: { id: selectedLocation.id, name: selectedLocation.city } } });
              } else {
                onChange('location')({ target: { value: '' } });
              }
            }}
            onBlur={onBlur('location')}
            disabled={loadingLocations}
          >
            <option value="">
              {loadingLocations ? 'Loading locations...' : 'Select Location'}
            </option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.city}
              </option>
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
              min={getMinCheckOutDate()}
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
