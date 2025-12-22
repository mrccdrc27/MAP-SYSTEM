import NavBar from "../../components/NavBar";
import "../../styles/AccessoriesRegistration.css";
import { useNavigate, useLocation } from "react-router-dom";
import MediumButtons from "../../components/buttons/MediumButtons";
import TopSecFormPage from "../../components/TopSecFormPage";
import CloseIcon from "../../assets/icons/close.svg";
import { useState, useEffect } from "react";
import DeleteModal from "../../components/Modals/DeleteModal";
import Select from "react-select";
import NewAccessoryModal from "../../components/Modals/NewAccessoryModal";
import Alert from "../../components/Alert";

export default function EditAccessories() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentDate = new Date().toISOString().split("T")[0];
  const [previewImage, setPreviewImage] = useState(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleteSuccessFromEdit, setDeleteSucsess] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isNewCategoryAdded, setNewCategoryAdded] = useState(false);
  const [isFirstRender, setFirstRender] = useState(true);

  // Retrieve the "id" value passed from the navigation state.
  // If the "isDeleteSuccessFromEdit" is not exist, the default value for this is "undifiend".
  const id = location.state?.id;

  console.log("delete open: ", isDeleteModalOpen);
  console.log("delete success: ", isDeleteSuccessFromEdit);
  console.log("id: ", id);

  const handleImageSelection = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPreviewImage(URL.createObjectURL(file));
    } else {
      setPreviewImage(null);
    }
  };

  const [categoryOptions, setCategoryOptions] = useState([
    { value: "cable", label: "Cable" },
    { value: "charger", label: "Charger" },
    { value: "keyboard", label: "Keyboard" },
  ]);

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
  }, [categoryOptions]);

  const manufacturerOptions = [
    { value: "apple", label: "Apple" },
    { value: "lenovo", label: "Lenovo" },
    { value: "asus", label: "Asus" },
  ];

  const supplierOptions = [
    { value: "amazon", label: "Amazon" },
    { value: "wsi", label: "WSI" },
    { value: "iontech inc.", label: "Iontech Inc." },
  ];

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

  return (
    <>
      {/* Show the delete modal when the isDeleteModalOpen value is true */}
      {isDeleteModalOpen && (
        <DeleteModal
          closeModal={() => setDeleteModalOpen(false)}
          confirmDelete={() => setDeleteSucsess(true)}
        />
      )}

      {/* Redirect to accessories page and passed the state "isDeleteSuccessFromEdit" */}
      {isDeleteSuccessFromEdit &&
        navigate("/accessories", { state: { isDeleteSuccessFromEdit } })}

      {isModalOpen && (
        <NewAccessoryModal
          save={(name) => {
            setCategoryOptions((prev) => [
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
          isDeleteModalOpen ? "hide-scroll" : ""
        }`}
      >
        <section className="top">
          <TopSecFormPage
            root="Accessories"
            currentPage="Edit Accessory"
            rootNavigatePage="/accessories"
            title={id}
            buttonType="delete"
            deleteModalOpen={() => setDeleteModalOpen(true)}
          />
        </section>
        <section className="registration-form">
          <form action="" method="post">
            <fieldset>
              <label htmlFor="accessory-name">Accessory Name *</label>
              <input
                type="text"
                placeholder="Accessory Name"
                maxLength="100"
                required
              />
            </fieldset>
            <fieldset>
              <label htmlFor="category">Category *</label>
              <div className="dropdown-container">
                <Select
                  options={categoryOptions}
                  styles={customStylesDropdown}
                  placeholder="Select category..."
                  required
                />
                <MediumButtons
                  type="new"
                  deleteModalOpen={() => setModalOpen(true)}
                />
              </div>
            </fieldset>
            <fieldset>
              <label htmlFor="manufacturer">Manufacturer *</label>
              <Select
                options={manufacturerOptions}
                styles={customStylesDropdown}
                placeholder="Select manufacturer..."
                required
              />
            </fieldset>
            <fieldset>
              <label htmlFor="supplier">Supplier</label>
              <Select
                options={supplierOptions}
                styles={customStylesDropdown}
                placeholder="Select supplier..."
              />
            </fieldset>
            <fieldset>
              <label htmlFor="location">Location *</label>
              <Select
                options={locationOptions}
                styles={customStylesDropdown}
                placeholder="Select location..."
                required
              />
            </fieldset>
            <fieldset>
              <label htmlFor="order-number">Order Number</label>
              <input
                type="text"
                name="order-number"
                id="order-number"
                placeholder="Order Number"
                maxLength="30"
              />
            </fieldset>
            <fieldset>
              <label htmlFor="model-number">Model Number</label>
              <input
                type="text"
                name="order-number"
                id="order-number"
                placeholder="Order Number"
                maxLength="50"
              />
            </fieldset>
            <fieldset>
              <label htmlFor="purchase-date">Purchase Date *</label>
              <input
                type="date"
                name="purchase-date"
                id="purchase-date"
                max={currentDate}
                required
              />
            </fieldset>
            <fieldset>
              <label htmlFor="purchase-cost">Purchase Cost *</label>
              <div className="purchase-cost-container">
                <p>PHP</p>
                <input
                  type="number"
                  name="purchase-cost"
                  id="purchase-cost"
                  step="0.01"
                  min="1"
                  required
                />
              </div>
            </fieldset>
            <fieldset>
              <label htmlFor="quantity">Quantity *</label>
              <input
                type="number"
                name="quantity"
                id="quantity"
                min="1"
                max="9999"
                defaultValue="1"
                required
              />
            </fieldset>
            <fieldset>
              <label htmlFor="minimum-quantity">Min Quantity *</label>
              <input
                type="number"
                name="min-quantity"
                id="min-quantity"
                min="0"
                max="9999"
                defaultValue="0"
                required
              />
            </fieldset>
            <fieldset>
              <label htmlFor="notes">Notes</label>
              <textarea name="notes" id="notes" maxLength="500"></textarea>
            </fieldset>
            <fieldset>
              <label htmlFor="upload-image">Image</label>
              <div>
                {previewImage && (
                  <div className="image-selected">
                    <img src={previewImage} alt="" />
                    <button
                      onClick={(event) => {
                        event.preventDefault();
                        setPreviewImage(null);
                        document.getElementById("image").value = "";
                      }}
                    >
                      <img src={CloseIcon} alt="" />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  name="image"
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
            <button
              type="submit"
              className="save-btn"
              onClick={() =>
                navigate("/accessories", { state: { editSuccess: true } })
              }
            >
              Save Changes
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
