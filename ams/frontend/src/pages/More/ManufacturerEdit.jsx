import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import '../../styles/Registration.css';
import '../../styles/ManufacturerRegistration.css';
import TopSecFormPage from '../../components/TopSecFormPage';
import MediumButtons from '../../components/buttons/MediumButtons';
import { useForm } from 'react-hook-form';
import CloseIcon from '../../assets/icons/close.svg';
import DeleteModal from '../../components/Modals/DeleteModal';
import Footer from '../../components/Footer';

const ManufacturerEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [logoFile, setLogoFile] = useState(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      manufacturerName: '',
      url: '',
      supportUrl: '',
      supportPhone: '',
      supportEmail: '',
      notes: ''
    }
  });

  // Sample manufacturer data - in a real app, this would come from an API
  const manufacturersData = {
    "1": {
      manufacturerName: 'Canon',
      url: 'https://canon.com',
      supportUrl: 'https://canon.com/support',
      supportPhone: '123-456-7890',
      supportEmail: 'support@canon.com',
      notes: 'Camera and printer manufacturer'
    },
    "2": {
      manufacturerName: 'Dell',
      url: 'https://dell.com',
      supportUrl: 'https://dell.com/support',
      supportPhone: '987-654-3210',
      supportEmail: 'support@dell.com',
      notes: 'Computer manufacturer'
    },
    "3": {
      manufacturerName: 'HP',
      url: 'https://hp.com',
      supportUrl: 'https://hp.com/support',
      supportPhone: '555-123-4567',
      supportEmail: 'support@hp.com',
      notes: 'Printer and computer manufacturer'
    }
  };

  // Load manufacturer data based on ID
  React.useEffect(() => {
    if (id && manufacturersData[id]) {
      const manufacturer = manufacturersData[id];
      Object.entries(manufacturer).forEach(([key, value]) => {
        setValue(key, value);
      });
    }
  }, [id, setValue]);

  const handleFileSelection = (e) => {
    if (e.target.files && e.target.files[0]) {
      // Check file size (max 5MB)
      if (e.target.files[0].size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        e.target.value = '';
        return;
      }
      setLogoFile(e.target.files[0]);
    }
  };

  const onSubmit = (data) => {
    // Here you would typically send the data to your API
    console.log('Form submitted:', data, logoFile);

    // Optional: navigate back to manufacturers view after successful submission
    navigate('/More/ViewManufacturer');
  };

  const handleDeleteConfirm = () => {
    // Handle manufacturer deletion logic here
    console.log("Deleting manufacturer:", id);
    navigate('/More/ViewManufacturer');
  };

  return (
    <>
      {isDeleteModalOpen && (
        <DeleteModal
          closeModal={() => setDeleteModalOpen(false)}
          actionType="delete"
          onConfirm={handleDeleteConfirm}
        />
      )}
      <section className="page-layout-registration">
        <NavBar />
        <main className="registration">
        <section className="top">
          <TopSecFormPage
            root="Manufacturers"
            currentPage="Edit Manufacturer"
            rootNavigatePage="/More/ViewManufacturer"
            title={manufacturersData[id]?.manufacturerName || "Edit Manufacturer"}
            buttonType="delete"
            deleteModalOpen={() => setDeleteModalOpen(true)}
          />
        </section>
        <section className="registration-form">
          <form onSubmit={handleSubmit(onSubmit)}>
            <fieldset>
              <label htmlFor="manufacturerName">Manufacturer Name *</label>
              <input
                type="text"
                placeholder="Manufacturer Name"
                className={errors.manufacturerName ? 'input-error' : ''}
                {...register("manufacturerName", { required: 'Manufacturer Name is required' })}
              />
              {errors.manufacturerName && <span className='error-message'>{errors.manufacturerName.message}</span>}
            </fieldset>

            <fieldset>
              <label htmlFor="url">URL</label>
              <input
                type="url"
                placeholder="URL"
                {...register("url")}
              />
            </fieldset>

            <fieldset>
              <label htmlFor="supportUrl">Support URL</label>
              <input
                type="url"
                placeholder="Support URL"
                {...register("supportUrl")}
              />
            </fieldset>

            <fieldset>
              <label htmlFor="supportPhone">Support Phone</label>
              <input
                type="tel"
                placeholder="Support Phone"
                {...register("supportPhone")}
              />
            </fieldset>

            <fieldset>
              <label htmlFor="supportEmail">Support Email</label>
              <input
                type="email"
                placeholder="Support Email"
                {...register("supportEmail")}
              />
            </fieldset>

            <fieldset>
              <label htmlFor="notes">Notes</label>
              <textarea
                placeholder="Notes"
                rows="4"
                {...register("notes")}
              />
            </fieldset>

            <fieldset>
              <label>Logo</label>
              {logoFile ? (
                <div className="image-selected">
                  <img src={URL.createObjectURL(logoFile)} alt="Selected logo" />
                  <button type="button" onClick={() => setLogoFile(null)}>
                    <img src={CloseIcon} alt="Remove" />
                  </button>
                </div>
              ) : (
                <label className="upload-image-btn">
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelection}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
              <small className="file-size-info">Maximum file size must be 5MB</small>
            </fieldset>

            <button type="submit" className="save-btn">Save</button>
          </form>
        </section>
      </main>
      <Footer />
      </section>
    </>
  );
};
export default ManufacturerEdit;