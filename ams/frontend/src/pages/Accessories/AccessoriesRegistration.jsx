import NavBar from "../../components/NavBar";
import TopSecFormPage from "../../components/TopSecFormPage";
import "../../styles/AccessoriesRegistration.css";
import { useNavigate, useParams } from "react-router-dom";
import DefaultImage from "../../assets/img/default-image.jpg";
import CloseIcon from "../../assets/icons/close.svg";
import NewAccessoryModal from "../../components/Modals/NewAccessoryModal";
import { useEffect, useState } from "react";
import Select from "react-select";
import Alert from "../../components/Alert";
import { useForm } from "react-hook-form";

export default function AccessoriesRegistration() {
  const { id } = useParams();
  const [suppliers, setSuppliers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accessory, setAccessory] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const {
    setValue,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [removeImage, setRemoveImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const initialize = async () => {
      console.log("id:", id);
      await fetchContexts();
      await fetchCategories();

      if (id) {
        try {
          const response = await fetch(
            `http://localhost:8004/accessories/${id}`
          );
          if (!response.ok)
            throw new Error("Failed to fetch accessory details");

          const data = await response.json();
          setAccessory(data);
          console.log("Accessory Details:", data);

          // Set form values
          setValue("accessoryName", data.name);
          setValue("category", data.category);
          setValue("manufacturer", data.manufacturer_id || "");
          setValue("supplier", data.supplier_id || "");
          setValue("location", data.location || "");
          setValue("modelNumber", data.model_number || "");
          setValue("orderNumber", data.order_number || "");
          setValue("purchaseDate", data.purchase_date || "");
          setValue("purchaseCost", data.purchase_cost || "");
          setValue("quantity", data.quantity || "");
          setValue("minimumQuantity", data.minimum_quantity || "");
          setValue("notes", data.notes || "");

          if (data.image) {
            setPreviewImage(`http://localhost:8004${data.image}`);
          }
        } catch (err) {
          console.log(err);
        }
      }
    };

    initialize();
  }, [id, setValue]);

  const fetchContexts = async () => {
    try {
      const response = await fetch("http://localhost:8002/contexts/names/");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to fetch contexts. Status: ${response.status}`);
      }

      setSuppliers(data.suppliers);
      setManufacturers(data.manufacturers);
      console.log("Contexts:", data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        "http://localhost:8004/accessories/categories"
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `Failed to fetch categories. Status: ${response.status}`
        );
      }

      setCategories(data);
      console.log("Categories:", data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleImageSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file); // store the actual file
      setValue("image", file); // optional: sync with react-hook-form

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result); // this is only for display
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();

      formData.append("name", data.accessoryName);
      formData.append("category", data.category);
      formData.append("manufacturer_id", data.manufacturer || "");
      formData.append("supplier_id", data.supplier || "");
      formData.append("location", data.location || "");
      formData.append("model_number", data.modelNumber || "");
      formData.append("order_number", data.orderNumber || "");
      formData.append("purchase_date", data.purchaseDate || "");
      formData.append("purchase_cost", data.purchaseCost || "");
      formData.append("quantity", data.quantity || "");
      formData.append("minimum_quantity", data.minimumQuantity || "");
      formData.append("notes", data.notes);

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      if (removeImage) {
        formData.append("remove_image", "true");
      }

      console.log("Form data:", formData);

      if (id) {
        try {
          const response = await fetch(
            `http://localhost:8004/accessories/${id}`,
            {
              method: "PUT",
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error(
              `Failed to update accessory. Status: ${response.status}`
            );
          }

          const result = await response.json();
          console.log("Updated accessory:", result);
          setSuccessMessage("Accessory has been updated successfully!");
          setErrorMessage("");

          setTimeout(() => {
            setErrorMessage("");
            setSuccessMessage("");
          }, 5000);

          navigate("/accessories");
        } catch (error) {
          console.error("Update error:", error);
          setSuccessMessage("");
          setErrorMessage("Updating accessory failed. Please try again.");

          setTimeout(() => {
            setErrorMessage("");
            setSuccessMessage("");
          }, 5000);
        }
      } else {
        try {
          const response = await fetch(
            "http://localhost:8004/accessories/registration",
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Registration failed:", errorData);
            throw new Error(
              `Failed to register accessory. Status: ${response.status}`
            );
          }

          const result = await response.json();
          console.log("Accessory registered:", result);
          navigate("/accessories", { state: { newAccessoryAdded: true } });
        } catch (error) {
          throw new Error(
            `Failed to submit accessory. Status: ${response.status}`
          );
        }
      }
    } catch (error) {
      console.error("Error submitting/updating accessory:", error);
    }
  };

  const navigate = useNavigate();
  const currentDate = new Date().toISOString().split("T")[0];
  const [isPurchaseCostValid, setPurchaseCostValid] = useState(false);
  const [isQuantityNegative, setQuantityNegative] = useState(false);
  const [isMinQuantityValid, setMinQuantityValid] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isNewCategoryAdded, setNewCategoryAdded] = useState(false);
  const [isFirstRender, setFirstRender] = useState(true);
  // const [countRequiredInput, setCountRequiredInput] = useState(0);

  console.log("new category: ", isNewCategoryAdded);

  useEffect(() => {
    if (isFirstRender) {
      setFirstRender(false);
      return;
    }

    if (!isNewCategoryAdded) {
      setNewCategoryAdded(true);
      setTimeout(() => {
        setNewCategoryAdded(false);
      }, 5000);
    }
  }, [categories]);

  const locationOptions = [
    { value: "makati", label: "Makati" },
    { value: "pasig", label: "Pasig" },
    { value: "marikina", label: "Marikina" },
  ];

  const customStylesDropdown = {
    control: (provided) => ({
      ...provided,
      width: "100%",
      borderRadius: "10px",
      fontSize: "0.875rem",
      padding: "3px 8px",
    }),
    container: (provided) => ({
      ...provided,
      width: "100%",
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      position: "absolute",
      width: "100%",
      backgroundColor: "white",
      border: "1px solid #ccc",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: "200px",
      overflowY: "auto",
      padding: "0",
    }),
    option: (provided, state) => ({
      ...provided,
      color: state.isSelected ? "white" : "grey",
      fontSize: "0.875rem",
      padding: "8px 12px",
      backgroundColor: state.isSelected ? "#007bff" : state.isFocused ? "#f8f9fa" : "white",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: "#f8f9fa",
      },
    }),
  };

  // Validations
  const handlePurchaseCostInput = (event) => {
    const value = event.target.value;

    // Check if input value contains a decimal point
    if (value.includes(".")) {
      // Split the value into integer and decimal parts
      const [integerPart, decimalPart] = value.split(".");

      // Restrict the decimal part to 2 digits
      if (decimalPart.length > 2) {
        // Update the value to only allow 2 decimal places
        event.target.value = `${integerPart}.${decimalPart.slice(0, 2)}`;
      }
    }

    setPurchaseCostValid(value < 0);
  };

  const handleQuantityInput = (event) => {
    const value = event.target.value;
    setQuantityNegative(value < 0);

    if (value > 9999) {
      event.target.value = value.slice(0, 4);
    }
  };

  const handleMinQuantityInput = (event) => {
    const value = event.target.value;
    setMinQuantityValid(value < 0 || value.includes("."));

    if (value > 9999) {
      event.target.value = value.slice(0, 4);
    }
  };

  return (
    <>
      {isModalOpen && (
        <NewAccessoryModal
          save={(name) => {
            categories((prev) => [
              ...prev,
              { value: name.toLowerCase(), label: name },
            ]);
            setModalOpen(false);
          }}
          closeModal={() => setModalOpen(false)}
        />
      )}

      {isNewCategoryAdded && (
        <Alert message="New category added!" type="success" />
      )}

      <nav>
        <NavBar />
      </nav>
      <main
        className={`accessories-registration ${
          isModalOpen ? "hide-scroll" : ""
        }`}
      >
        <section className="top">
          <TopSecFormPage
            root="Accessories"
            currentPage={id ? "Edit Accessory" : "New Accessory"}
            rootNavigatePage="/accessories"
            title={id ? "Edit Accessory" : "New Accessory"}
          />
        </section>

        <section className="registration-form">
          <form onSubmit={handleSubmit(onSubmit)}>
            <fieldset>
              <label htmlFor="accessory-name">Accessory Name *</label>
              <input
                type="text"
                className={errors.accessoryName ? "input-error" : ""}
                {...register("accessoryName", {
                  required: "Accessory Name is required",
                })}
                maxLength="100"
                placeholder="Accessory Name"
              />
              {errors.accessoryName && (
                <span className="error-message">
                  {errors.accessoryName.message}
                </span>
              )}
            </fieldset>

            <fieldset>
              <label htmlFor="category">Category *</label>
              <div className="dropdown-container">
                <select
                  className={errors.category ? "input-error" : ""}
                  {...register("category", {
                    required: "Category is required",
                    valueAsNumber: true,
                  })}
                  defaultValue=""
                >
                  <option value="" disabled hidden>
                    Select Category
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.category && (
                <span className="error-message">{errors.category.message}</span>
              )}
            </fieldset>

            <fieldset>
              <label htmlFor="manufacturer">Manufacturer</label>
              <div>
                <select
                  {...register("manufacturer", { valueAsNumber: true })}
                  defaultValue=""
                >
                  <option value="" disabled hidden>
                    Select Manufacturer
                  </option>
                  {manufacturers.map((manufacturer) => (
                    <option key={manufacturer.id} value={manufacturer.id}>
                      {manufacturer.name}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            <fieldset>
              <label htmlFor="supplier">Supplier</label>
              <div>
                <select
                  {...register("supplier", { valueAsNumber: true })}
                  defaultValue=""
                >
                  <option value="" disabled hidden>
                    Select Supplier
                  </option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            <fieldset>
              <label htmlFor="location">Location</label>
              <div>
                <select {...register("location")} defaultValue="">
                  <option value="" disabled hidden>
                    Select Location
                  </option>
                  {locationOptions.map((location) => (
                    <option key={location.value} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            <fieldset>
              <label htmlFor="model-number">Model Number</label>
              <input
                type="text"
                name="model-number"
                {...register("modelNumber")}
                maxLength="50"
                placeholder="Model Number"
              />
            </fieldset>

            <fieldset>
              <label htmlFor="order-number">Order Number</label>
              <input
                type="text"
                name="order-number"
                {...register("orderNumber")}
                maxLength="30"
                placeholder="Order Number"
              />
            </fieldset>

            <fieldset>
              <label htmlFor="purchase-date">Purchase Date</label>
              <input
                type="date"
                name="purchase-date"
                id="purchase-date"
                {...register("purchaseDate")}
                max={currentDate}
              />
            </fieldset>

            <fieldset>
              <label htmlFor="purchase-cost">Purchase Cost *</label>
              {isPurchaseCostValid && <span>Must not a negative value.</span>}
              <div className="purchase-cost-container">
                <p>PHP</p>
                <input
                  type="number"
                  name="purchase-cost"
                  id="purchase-cost"
                  step="0.01"
                  min="0"
                  onChange={handlePurchaseCostInput}
                  {...register("purchaseCost", { valueAsNumber: true })}
                  placeholder="Purchase Cost"
                />
              </div>
            </fieldset>

            <fieldset>
              <label htmlFor="quantity">Quantity *</label>
              {isQuantityNegative && <span>Must not be a negative value.</span>}
              <input
                type="number"
                name="quantity"
                id="quantity"
                min="1"
                max="9999"
                onChange={handleQuantityInput}
                className={errors.quantity ? "input-error" : ""}
                {...register("quantity", { required: "Quantity is required" })}
                placeholder="Quantity"
              />
              {errors.accessoryName && (
                <span className="error-message">
                  {errors.accessoryName.message}
                </span>
              )}
            </fieldset>

            <fieldset>
              <label htmlFor="minimum-quantity">Min Quantity *</label>
              {isMinQuantityValid && (
                <span>Must not be a negative value or has decimal.</span>
              )}
              <input
                type="number"
                name="min-quantity"
                id="min-quantity"
                min="0"
                max="9999"
                defaultValue="0"
                onChange={handleMinQuantityInput}
                {...register("minimumQuantity", { valueAsNumber: true })}
                placeholder="Minimum Quantity"
              />
            </fieldset>

            <fieldset>
              <label htmlFor="notes">Notes</label>
              <textarea
                name="notes"
                id="notes"
                maxLength="500"
                rows="3"
                {...register("notes")}
                placeholder="Notes..."
              ></textarea>
            </fieldset>

            <fieldset>
              <label htmlFor="upload-image">Image</label>
              <div>
                {previewImage ? (
                  <div className="image-selected">
                    <img src={previewImage} alt="Preview" />
                    <button
                      onClick={(event) => {
                        event.preventDefault();
                        setPreviewImage(null);
                        setValue("image", null);
                        document.getElementById("image").value = "";
                        setRemoveImage(true);
                      }}
                    >
                      <img src={CloseIcon} alt="Remove" />
                    </button>
                  </div>
                ) : (
                  <img
                    src={DefaultImage}
                    alt="Default Preview"
                    className="image-selected"
                  />
                )}
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageSelection}
                  style={{ display: "none" }}
                />
              </div>
              <label htmlFor="image" className="upload-image-btn">
                {!previewImage ? "Choose Image" : "Change Image"}
              </label>
            </fieldset>
            <button type="submit" className="save-btn">
              Save
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
