import { useState, useEffect } from 'react';
import {
  ASSET_REQUEST_SUB_CATEGORIES,
  ASSET_CATEGORIES
} from '../../../shared/constants/ticketCategories';

// Mock product data - In production, fetch from AMS API
const mockProducts = [
  {
    id: 1,
    name: 'Lenovo ThinkPad X1 Carbon',
    model_number: '20U9005MUS',
    category: 'Laptops',
    manufacturer: 'Lenovo',
    supplier: 'Tech Distributors Inc.',
    specs: {
      cpu: 'i7-10510U',
      gpu: 'Intel UHD Graphics',
      os: 'Windows 11 Pro',
      ram: '16GB',
      screen_size: '14 inches',
      storage: '512GB SSD'
    },
    default_purchase_cost: 85000,
    end_of_life: '2028-12-31',
    depreciation_months: 36
  },
  {
    id: 2,
    name: 'Dell XPS 15',
    model_number: 'XPS-15-9520',
    category: 'Laptops',
    manufacturer: 'Dell',
    supplier: 'Dell Philippines',
    specs: {
      cpu: 'i7-12700H',
      gpu: 'NVIDIA GeForce RTX 3050',
      os: 'Windows 11 Pro',
      ram: '32GB',
      screen_size: '15.6 inches',
      storage: '1TB SSD'
    },
    default_purchase_cost: 120000,
    end_of_life: '2029-06-30',
    depreciation_months: 48
  },
  {
    id: 3,
    name: 'HP LaserJet Pro M404dn',
    model_number: 'W1A53A',
    category: 'Printers',
    manufacturer: 'HP',
    supplier: 'Office Solutions Corp.',
    specs: {
      print_speed: '40 ppm',
      connectivity: 'Ethernet, USB'
    },
    default_purchase_cost: 25000,
    end_of_life: '2027-12-31',
    depreciation_months: 24
  }
];

export default function AssetRequestForm({ formData, onChange, onBlur, errors, FormField, setFormData }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customProduct, setCustomProduct] = useState(false);

  // Filter products by selected category
  const filteredProducts = formData.assetCategory
    ? mockProducts.filter(p => p.category === formData.assetCategory)
    : mockProducts;

  // When product is selected, auto-fill fields
  useEffect(() => {
    if (selectedProduct) {
      setFormData(prev => ({
        ...prev,
        productName: selectedProduct.name,
        modelNumber: selectedProduct.model_number,
        manufacturer: selectedProduct.manufacturer,
        supplier: selectedProduct.supplier,
        specs: selectedProduct.specs,
        unitCost: selectedProduct.default_purchase_cost,
        eolDate: selectedProduct.end_of_life,
        depreciationMonths: selectedProduct.depreciation_months
      }));
    }
  }, [selectedProduct, setFormData]);

  const handleProductChange = (e) => {
    const productId = parseInt(e.target.value);
    if (productId === -1) {
      setCustomProduct(true);
      setSelectedProduct(null);
      setFormData(prev => ({
        ...prev,
        productName: '',
        modelNumber: '',
        manufacturer: '',
        supplier: '',
        specs: {},
        unitCost: '',
        eolDate: '',
        depreciationMonths: ''
      }));
    } else {
      setCustomProduct(false);
      const product = mockProducts.find(p => p.id === productId);
      setSelectedProduct(product);
    }
  };

  const handleQuantityChange = (e) => {
    const qty = parseInt(e.target.value) || 1;
    setQuantity(qty);
    onChange('quantity')({ target: { value: qty } });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(Number(amount || 0));
  };

  const formatDepreciation = (months) => {
    if (!months) return '';
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years > 0 && remainingMonths > 0) {
      return `${years} Year(s) ${remainingMonths} Month(s)`;
    } else if (years > 0) {
      return `${years} Year(s)`;
    } else {
      return `${remainingMonths} Month(s)`;
    }
  };

  const totalCost = (formData.unitCost || 0) * quantity;

  return (
    <>
      {/* Asset Category */}
      <FormField
        id="assetCategory"
        label="Asset Category"
        required
        error={errors.assetCategory}
        render={() => (
          <select
            value={formData.assetCategory || ''}
            onChange={onChange('assetCategory')}
            onBlur={onBlur('assetCategory')}
          >
            <option value="">Select Category</option>
            {ASSET_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      />

      {/* Product Selection */}
      <FormField
        id="productSelection"
        label="Asset Model Item"
        required
        error={errors.productName}
        render={() => (
          <select
            value={selectedProduct?.id || (customProduct ? -1 : '')}
            onChange={handleProductChange}
          >
            <option value="">Select Product from Catalog</option>
            {filteredProducts.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} - {product.model_number}
              </option>
            ))}
            <option value={-1}>[ Enter Custom Product ]</option>
          </select>
        )}
      />

      {/* Custom Product Name (if not from catalog) */}
      {customProduct && (
        <FormField
          id="productName"
          label="Product Name"
          required
          error={errors.productName}
          render={() => (
            <input
              type="text"
              placeholder="Enter product name"
              value={formData.productName || ''}
              onChange={onChange('productName')}
              onBlur={onBlur('productName')}
            />
          )}
        />
      )}

      {/* Model Number */}
      <FormField
        id="modelNumber"
        label="Model"
        render={() => (
          <input
            type="text"
            placeholder={customProduct ? "Enter model number" : "Auto-filled from catalog"}
            value={formData.modelNumber || ''}
            onChange={onChange('modelNumber')}
            readOnly={!customProduct}
            style={!customProduct ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
          />
        )}
      />

      {/* Manufacturer */}
      <FormField
        id="manufacturer"
        label="Manufacturer"
        render={() => (
          <input
            type="text"
            placeholder={customProduct ? "Enter manufacturer" : "Auto-filled from catalog"}
            value={formData.manufacturer || ''}
            onChange={onChange('manufacturer')}
            readOnly={!customProduct}
            style={!customProduct ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
          />
        )}
      />

      {/* Supplier */}
      <FormField
        id="supplier"
        label="Supplier"
        render={() => (
          <input
            type="text"
            placeholder={customProduct ? "Enter supplier" : "Auto-filled from catalog"}
            value={formData.supplier || ''}
            onChange={onChange('supplier')}
            readOnly={!customProduct}
            style={!customProduct ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
          />
        )}
      />

      {/* Specs Section */}
      {(selectedProduct?.specs || customProduct) && (
        <fieldset style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
          <legend style={{ fontWeight: 'bold', padding: '0 10px' }}>Specifications</legend>
          
          {selectedProduct?.specs ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {selectedProduct.specs.cpu && <div><strong>CPU:</strong> {selectedProduct.specs.cpu}</div>}
              {selectedProduct.specs.gpu && <div><strong>GPU:</strong> {selectedProduct.specs.gpu}</div>}
              {selectedProduct.specs.os && <div><strong>OS:</strong> {selectedProduct.specs.os}</div>}
              {selectedProduct.specs.ram && <div><strong>RAM:</strong> {selectedProduct.specs.ram}</div>}
              {selectedProduct.specs.screen_size && <div><strong>Screen Size:</strong> {selectedProduct.specs.screen_size}</div>}
              {selectedProduct.specs.storage && <div><strong>Storage:</strong> {selectedProduct.specs.storage}</div>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="text" placeholder="CPU" onChange={(e) => onChange('specCpu')({ target: { value: e.target.value } })} />
              <input type="text" placeholder="GPU" onChange={(e) => onChange('specGpu')({ target: { value: e.target.value } })} />
              <input type="text" placeholder="OS" onChange={(e) => onChange('specOs')({ target: { value: e.target.value } })} />
              <input type="text" placeholder="RAM" onChange={(e) => onChange('specRam')({ target: { value: e.target.value } })} />
              <input type="text" placeholder="Screen Size" onChange={(e) => onChange('specScreenSize')({ target: { value: e.target.value } })} />
              <input type="text" placeholder="Storage" onChange={(e) => onChange('specStorage')({ target: { value: e.target.value } })} />
            </div>
          )}
        </fieldset>
      )}

      {/* Justification / Notes */}
      <FormField
        id="justification"
        label="Justification / Notes"
        render={() => (
          <textarea
            rows={3}
            placeholder="Enter justification for the asset request (optional)"
            value={formData.justification || ''}
            onChange={onChange('justification')}
          />
        )}
      />

      {/* Unit Cost */}
      <FormField
        id="unitCost"
        label="Default / Unit Cost (PHP)"
        required
        error={errors.unitCost}
        render={() => (
          <input
            type="number"
            placeholder="Enter unit cost"
            value={formData.unitCost || ''}
            onChange={onChange('unitCost')}
            onBlur={onBlur('unitCost')}
            readOnly={!customProduct && selectedProduct}
            style={!customProduct && selectedProduct ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
            min="0"
          />
        )}
      />

      {/* Quantity */}
      <FormField
        id="quantity"
        label="Quantity"
        required
        error={errors.quantity}
        render={() => (
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={handleQuantityChange}
          />
        )}
      />

      {/* Total Request */}
      <FormField
        id="totalRequest"
        label="Total Request"
        render={() => (
          <input
            type="text"
            value={formatCurrency(totalCost)}
            readOnly
            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed', fontWeight: 'bold' }}
          />
        )}
      />

      {/* EOL Date */}
      <FormField
        id="eolDate"
        label="EOL Date"
        render={() => (
          <input
            type="date"
            value={formData.eolDate || ''}
            onChange={onChange('eolDate')}
            readOnly={!customProduct && selectedProduct}
            style={!customProduct && selectedProduct ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
          />
        )}
      />

      {/* Depreciation */}
      <FormField
        id="depreciationMonths"
        label="Depreciation Period"
        render={() => (
          <input
            type="text"
            value={formData.depreciationMonths ? formatDepreciation(formData.depreciationMonths) : ''}
            placeholder={customProduct ? "Enter months (e.g., 36)" : "Auto-filled from catalog"}
            readOnly={!customProduct && selectedProduct}
            style={!customProduct && selectedProduct ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
            onChange={customProduct ? onChange('depreciationMonths') : undefined}
          />
        )}
      />
    </>
  );
}
