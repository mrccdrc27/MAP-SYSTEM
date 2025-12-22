import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import NavBar from "../../components/NavBar";
import TopSecFormPage from "../../components/TopSecFormPage";
import CloseIcon from "../../assets/icons/close.svg";
import Footer from "../../components/Footer";
import DeleteModal from "../../components/Modals/DeleteModal";
import { updateCategory, getCategory, contextsBase } from '../../api/contextsApi'
import "../../styles/Registration.css";
import "../../styles/CategoryRegistration.css";

const CategoryEdit = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve the "category" data value passed from the navigation state.
  // If the "category" data is not exist, the default value for this is undefined.
  const category = location.state?.category;

  const [attachmentFile, setAttachmentFile] = useState(null);
  const [initialAttachment, setInitialAttachment] = useState(true);
  const [categoryData, setCategoryData] = useState(category ?? null);
  const [isInUse, setIsInUse] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  console.log("attachment:", attachmentFile);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      categoryName: category?.name ?? '',
      categoryType: category?.type ? category.type.toLowerCase() : '',
    },
    mode: "all",
  });

  const categoryTypes = [
    "Asset",
    "Component",
  ];

  const handleFileSelection = (e) => {
    if (e.target.files && e.target.files[0]) {
      // Check file size (max 5MB)
      if (e.target.files[0].size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        e.target.value = "";
        return;
      }
      setAttachmentFile(e.target.files[0]);
    }
  };

  const onSubmit = (data) => {
    const form = new FormData()
    form.append('name', data.categoryName)
    // type is not editable here, but include for completeness
    form.append('type', data.categoryType)
    if (attachmentFile) form.append('logo', attachmentFile)

    if (category && category.id) {
      updateCategory(category.id, form)
        .then(() => navigate('/More/ViewCategories', { state: { updatedCategory: true } }))
        .catch((err) => {
          console.error('Failed to update category', err)
          alert('Failed to update category: ' + (err?.response?.data?.detail || err.message))
        })
    } else {
      // Fallback: navigate back
      navigate('/More/ViewCategories', { state: { updatedCategory: true } })
    }
  };

  console.log("initial:", initialAttachment);

  const handleDeleteConfirm = () => {
    // Handle category deletion logic here
    console.log("Deleting category:", category.id);
    navigate("/More/ViewCategories");
  };

  // Build an absolute image URL for logos returned as relative paths
  const buildImageUrl = (logoPath) => {
    if (!logoPath) return null
    if (typeof logoPath !== 'string') return null
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) return logoPath
    // Ensure no double-slash when joining
    const base = contextsBase ? contextsBase.replace(/\/$/, '') : ''
    return base + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
  }

  // Fetch fresh category details (including asset/component counts) to decide if type is editable
  useEffect(() => {
    let mounted = true
    const id = category?.id
    if (!id) return
    getCategory(id)
      .then((data) => {
        if (!mounted) return
        setCategoryData(data)
        // reset form values in case we fetched newer values
        reset({
          categoryName: data.name || '',
          categoryType: data.type ? data.type.toLowerCase() : '',
        })
        const assetCount = Number(data.asset_count || 0)
        const compCount = Number(data.component_count || 0)
        setIsInUse(assetCount > 0 || compCount > 0)
      })
      .catch((err) => {
        console.error('Failed to load category details', err)
      })
    return () => { mounted = false }
  }, [category, reset])

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
              root="Categories"
              currentPage="Update Category"
              rootNavigatePage="/More/ViewCategories"
              title={category?.name || "Update Category"}
              buttonType="delete"
              deleteModalOpen={() => setDeleteModalOpen(true)}
            />
          </section>
          <section className="registration-form">
            <form onSubmit={handleSubmit(onSubmit)}>
              <fieldset>
                <label htmlFor="categoryName">
                  Category Name
                  <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Category Name"
                  maxLength="100"
                  className={errors.categoryName ? "input-error" : ""}
                  {...register("categoryName", {
                    required: "Category Name is required",
                  })}
                />
                {errors.categoryName && (
                  <span className="error-message">
                    {errors.categoryName.message}
                  </span>
                )}
              </fieldset>

              <fieldset>
                <label htmlFor="categoryType">
                  Category Type
                  <span className="required-asterisk">*</span>
                </label>
                <select
                  disabled={isInUse}
                  title={isInUse ? "Cannot change category type while category is in use" : ""}
                  className={errors.categoryType ? "input-error" : ""}
                  {...register("categoryType", {
                    required: "Category Type is required",
                  })}
                >
                  <option value="">Select Category Type</option>
                  {categoryTypes.map((type, idx) => (
                    <option key={idx} value={type.toLowerCase()}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.categoryType && (
                  <span className="error-message">
                    {errors.categoryType.message}
                  </span>
                )}
              </fieldset>

              <fieldset>
                <label>Icon</label>
                {(() => {
                  const existingImage = (categoryData?.logo ?? categoryData?.icon ?? category?.logo ?? category?.icon)
                  const imageSrc = attachmentFile
                    ? URL.createObjectURL(attachmentFile)
                    : (initialAttachment ? buildImageUrl(existingImage) : null)

                  if (imageSrc) {
                    return (
                      <div className="image-selected">
                        <img src={imageSrc} alt="Selected icon" />
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentFile(null);
                            setInitialAttachment(false);
                          }}
                        >
                          <img src={CloseIcon} alt="Remove" />
                        </button>
                      </div>
                    )
                  }

                  return (
                  <label className="upload-image-btn">
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelection}
                      style={{ display: "none" }}
                    />
                  </label>
                  )
                })()}
                <small className="file-size-info">
                  Maximum file size must be 5MB
                </small>
              </fieldset>

              <button
                type="submit"
                className="primary-button"
                disabled={!isValid}
              >
                Save
              </button>
            </form>
          </section>
        </main>
        <Footer />
      </section>
      {/* <nav>
        <NavBar />
      </nav> */}
    </>
  );
};

export default CategoryEdit;
