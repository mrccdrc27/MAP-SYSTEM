import NavBar from "../../components/NavBar";
import "../../styles/CheckoutAccessories.css";
import TopSecFormPage from "../../components/TopSecFormPage";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import Select from "react-select";
import mockupData from "../../services/mockup-data";

export default function CheckoutAccessory() {
  const location = useLocation();
  const { data } = location.state || {}; // Retrieve the data that pass from the previous page. Set this empty if the data state is undefined or null.
  const [currentDate, setCurrentDate] = useState("");
  const [previewImages, setPreviewImages] = useState([]);
  const [checkoutDate, setCheckoutDate] = useState("");
  const [externalEmployeeList, setExternalEmployeeList] = useState([]);
  const [dropdownLocation, setDropdownLocation] = useState();

  useEffect(() => {
    const today = new Date();
    const options = {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const formatter = new Intl.DateTimeFormat("en-CA", options); // "en-CA" ensures YYYY-MM-DD format
    const formattedDate = formatter.format(today); // Format date in Philippines timezone
    setCurrentDate(formattedDate);
    setCheckoutDate(formattedDate);
  }, []);

  const handleImagesSelection = (event) => {
    const selectedFiles = Array.from(event.target.files); // Convert the FileList to Array
    if (selectedFiles.length > 0) {
      const imagesArray = selectedFiles.map((file) => {
        return URL.createObjectURL(file);
      });

      setPreviewImages(imagesArray);
    } else {
      setPreviewImages([]);
    }
  };

  // Fetch list of external employee from the json file mockup data.
  useEffect(() => {
    const getExternalEmployees = async () => {
      const responseData = await mockupData.fetchExternalEmployee();
      setExternalEmployeeList(responseData); // Store the responseData in the external employee list state.
    };

    getExternalEmployees();
  }, []);

  const employeeOptions = externalEmployeeList.map((employee) => ({
    value: employee.id,
    label: `${employee.firstname} ${employee.lastname}`,
    branch: employee.branch,
  }));

  const conditionOptions = [
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
  ];

  // Set the custom styles for dropdown
  const customStylesDropdown = {
    control: (provided) => ({
      ...provided,
      width: "100%",
      borderRadius: "10px",
      fontSize: "0.875rem",
      padding: "3px 8px",
      cursor: "pointer",
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

  // For debugging only.
  console.log("location:", dropdownLocation);
  console.log("data received:", data);

  return (
    <>
      <nav>
        <NavBar />
      </nav>
      <main className="checkout-accessories-page">
        <section className="top">
          <TopSecFormPage
            root="Accessory"
            currentPage="Checkout Accessory"
            rootNavigatePage="/accessories"
            title={data.accessory_name}
          />
        </section>
        <section className="checkout-form">
          <h2>Check-Out Form</h2>
          <form action="" method="post">
            <fieldset>
              <label htmlFor="checkout-to">Check-Out to *</label>
              <Select
                options={employeeOptions}
                styles={customStylesDropdown}
                placeholder="Select employee..."
                onChange={(option) => {
                  setDropdownLocation(option.branch);
                }}
              />
            </fieldset>
            <fieldset>
              <label htmlFor="location">Location *</label>
              <div className="location">
                {dropdownLocation ? (
                  <p>{dropdownLocation}</p>
                ) : (
                  <p>Select employee to set the location...</p>
                )}
              </div>
            </fieldset>
            <fieldset>
              <label htmlFor="checkout-date">Check-Out Date *</label>
              <input
                type="date"
                name="checkout-date"
                id="checkout-date"
                defaultValue={currentDate}
                required
                onChange={(e) => setCheckoutDate(e.target.value)}
              />
            </fieldset>
            <fieldset>
              <label htmlFor="expected-return-date">Expected Return Date</label>
              <input
                type="date"
                name="expected-return-date"
                id="expected-return-date"
                min={checkoutDate}
              />
            </fieldset>
            <fieldset>
              <label htmlFor="condition">Condition *</label>
              <Select
                options={conditionOptions}
                styles={customStylesDropdown}
                placeholder="Select condition..."
              />
            </fieldset>
            <fieldset>
              <label htmlFor="notes">Notes</label>
              <textarea name="notes" id="notes" maxLength="500"></textarea>
            </fieldset>
            <fieldset>
              <label htmlFor="confirmation-email-notes">
                Confirmation Email Notes
              </label>
              <textarea name="notes" id="notes" maxLength="500"></textarea>
            </fieldset>
            <fieldset>
              <label htmlFor="upload-images">Photos</label>
              <div className="images-container">
                {previewImages &&
                  previewImages.map((image, index) => {
                    return (
                      <div key={image} className="image-selected">
                        <img src={image} alt="" />
                        <button
                          onClick={() =>
                            setPreviewImages(
                              previewImages.filter((e) => e !== image)
                            )
                          }
                        >
                          <img src={CloseIcon} alt="" />
                        </button>
                      </div>
                    );
                  })}
                <input
                  type="file"
                  name="images"
                  id="images"
                  accept="image/*"
                  multiple
                  onChange={handleImagesSelection}
                  style={{ display: "none" }}
                />
              </div>
              <label htmlFor="images" className="upload-image-btn">
                {previewImages.length == 0 ? "Choose Image" : "Change Image"}
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
