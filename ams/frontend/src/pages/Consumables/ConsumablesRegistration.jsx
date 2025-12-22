import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import NavBar from '../../components/NavBar';
import TopSecFormPage from '../../components/TopSecFormPage';
import '../../styles/Registration.css';
import SampleImage from "../../assets/img/dvi.jpeg";

export default function ConsumablesRegistration() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentDate = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      image: SampleImage,
      consumableName: '',
      category: '',
      modelNumber: '',
      manufacturer: '',
      supplier: '',
      location: '',
      orderNumber: '',
      purchaseDate: '',
      purchaseCost: '',
      quantity: '',
      minimumQuantity: '',
      notes: ''
    }
  });

  const consumableData = {
    '1': {
      image: SampleImage,
      consumableName: 'A3 Paper',
      category: 'Printer Paper',
      manufacturer: 'Canon',
      supplier: 'WalMart',
      location: 'Sydney',
      modelNumber: '',
      orderNumber: 'ORD-1001',
      purchaseDate: '2024-01-15',
      purchaseCost: 25.99,
      quantity: 142,
      minimumQuantity: 20,
      notes: 'High quality A3 paper for office printing',
    },
    '2': {
      image: SampleImage,
      consumableName: 'Canon 580 PGBK Ink',
      category: 'Printer Ink',
      manufacturer: 'Canon',
      supplier: 'Staples',
      location: 'New York',
      modelNumber: '580 PGBK',
      orderNumber: 'ORD-1002',
      purchaseDate: '2024-02-10',
      purchaseCost: 45.50,
      quantity: 30,
      minimumQuantity: 5,
      notes: 'Black ink cartridge for Canon printers',
    }
  };

  useEffect(() => {
    if (id && consumableData[id]) {
      const data = consumableData[id];
      Object.keys(data).forEach(key => {
        setValue(key, data[key]);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();

      formData.append("name", data.consumableName);
      formData.append("category", data.category);
      formData.append("manufacturer", data.manufacturer);
      formData.append("supplier", data.supplier);
      formData.append("location", data.location);
      formData.append("model_number", data.modelNumber);
      formData.append("order_number", data.orderNumber);
      formData.append("purchase_date", data.purchaseDate);
      formData.append("purchase_cost", data.purchaseCost);
      formData.append("quantity", data.quantity);
      formData.append("minimum_quantity", data.minimumQuantity);
      formData.append("notes", data.notes);

      if (data.image && data.image[0]) {
        formData.append("image", data.image[0]);
      }

      console.log('Consumable data:', Object.fromEntries(formData));
      
      // Here you would typically send the data to your backend
      // const response = await fetch('/api/consumables', {
      //   method: 'POST',
      //   body: formData
      // });

      alert(id ? 'Consumable updated successfully!' : 'Consumable created successfully!');
      navigate('/consumables');
    } catch (error) {
      console.error('Error saving consumable:', error);
      alert('Error saving consumable. Please try again.');
    }
  };

  return (
    <>
      <nav>
        <NavBar />
      </nav>
      <main className="registration">
        <section className="top">
          <TopSecFormPage
            root="Consumables"
            currentPage={id ? 'Edit Consumable' : 'New Consumable'}
            rootNavigatePage="/consumables"
            title={id ? 'Edit Consumable' : 'New Consumable'}
          />
        </section>
        <section className="registration-form">
          <form onSubmit={handleSubmit(onSubmit)}>
            <fieldset>
              <label htmlFor='consumable-name'>Consumable Name *</label>
              <input
                type='text'
                className={errors.consumableName ? 'input-error' : ''}
                {...register('consumableName', { required: 'Consumable name is required' })}
                maxLength='100'
              />
              {errors.consumableName && <span className='error-message'>{errors.consumableName.message}</span>}
            </fieldset>

            <fieldset>
              <label htmlFor='category'>Category *</label>
              <select
                className={errors.category ? 'input-error' : ''}
                {...register('category', { required: 'Category is required' })}
              >
                <option value="">Select Category</option>
                <option value="Printer Paper">Printer Paper</option>
                <option value="Printer Ink">Printer Ink</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Cleaning Supplies">Cleaning Supplies</option>
                <option value="Cables">Cables</option>
              </select>
              {errors.category && <span className='error-message'>{errors.category.message}</span>}
            </fieldset>

            <fieldset>
              <label htmlFor='manufacturer'>Manufacturer *</label>
              <select
                className={errors.manufacturer ? 'input-error' : ''}
                {...register('manufacturer', { required: 'Manufacturer is required' })}
              >
                <option value="">Select Manufacturer</option>
                <option value="Canon">Canon</option>
                <option value="HP">HP</option>
                <option value="Epson">Epson</option>
                <option value="Brother">Brother</option>
                <option value="Generic">Generic</option>
              </select>
              {errors.manufacturer && <span className='error-message'>{errors.manufacturer.message}</span>}
            </fieldset>

            <fieldset>
              <label htmlFor='supplier'>Supplier</label>
              <select {...register('supplier')}>
                <option value="">Select Supplier</option>
                <option value="WalMart">WalMart</option>
                <option value="Staples">Staples</option>
                <option value="Office Depot">Office Depot</option>
                <option value="Amazon">Amazon</option>
                <option value="Best Buy">Best Buy</option>
              </select>
            </fieldset>

            <fieldset>
              <label htmlFor='location'>Location *</label>
              <input
                type='text'
                className={errors.location ? 'input-error' : ''}
                {...register('location', { required: 'Location is required' })}
                maxLength='100'
              />
              {errors.location && <span className='error-message'>{errors.location.message}</span>}
            </fieldset>

            <fieldset>
              <label htmlFor='model-number'>Model Number</label>
              <input
                type='text'
                {...register('modelNumber')}
                maxLength='50'
              />
            </fieldset>

            <fieldset>
              <label htmlFor='order-number'>Order Number</label>
              <input
                type='text'
                {...register('orderNumber')}
                maxLength='50'
              />
            </fieldset>

            <fieldset>
              <label htmlFor='purchase-date'>Purchase Date</label>
              <input
                type='date'
                {...register('purchaseDate')}
                max={currentDate}
              />
            </fieldset>

            <fieldset>
              <label htmlFor='purchase-cost'>Purchase Cost</label>
              <input
                type='number'
                {...register('purchaseCost')}
                step='0.01'
                min='0'
              />
            </fieldset>

            <fieldset>
              <label htmlFor='quantity'>Quantity *</label>
              <input
                type='number'
                className={errors.quantity ? 'input-error' : ''}
                {...register('quantity', { required: 'Quantity is required' })}
                min='1'
              />
              {errors.quantity && <span className='error-message'>{errors.quantity.message}</span>}
            </fieldset>

            <fieldset>
              <label htmlFor='minimum-quantity'>Minimum Quantity</label>
              <input
                type='number'
                {...register('minimumQuantity')}
                min='0'
              />
            </fieldset>

            <fieldset>
              <label htmlFor='notes'>Notes</label>
              <textarea
                {...register('notes')}
                maxLength='500'
                placeholder='Enter any additional notes...'
              />
            </fieldset>

            <fieldset>
              <label htmlFor='image'>Image</label>
              <label className="upload-image-btn">
                Choose Image
                <input
                  type='file'
                  {...register('image')}
                  accept='image/*'
                  style={{ display: 'none' }}
                />
              </label>
              <small className="file-size-info">Maximum file size must be 5MB</small>
            </fieldset>

            <button type="submit" className="save-btn">
              {id ? 'Update Consumable' : 'Create Consumable'}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
