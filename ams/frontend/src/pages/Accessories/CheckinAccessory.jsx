import "../../styles/custom-colors.css";
import "../../styles/CheckinAccessory.css";
import NavBar from "../../components/NavBar";
import TopSecFormPage from "../../components/TopSecFormPage";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";

export default function CheckinAccessory() {
  const location = useLocation();
  const { data } = location.state || {}; // Retrieve the data that pass from the previous page. Set this empty if the data state is undefined or null.
  const [currentDate, setCurrentDate] = useState("");
  const [previewImages, setPreviewImages] = useState([]);

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

  return (
    <>
      <nav>
        <NavBar />
      </nav>
      <main className="checkin-accessory-page">
        <section className="top">
          <TopSecFormPage
            root="Accessories"
            currentPage="Checkin Accessory"
            rootNavigatePage="/accessories"
            title={data}
          />
        </section>
        <section className="middle">
          <section className="recent-checkout-info">
            <h2>Most Recent Check-Out</h2>
            <fieldset>
              <label htmlFor="check-out-to">Check-Out to:</label>
              <p>Mary Grace Piattos</p>
            </fieldset>
            <fieldset>
              <label htmlFor="check-out-date">Check-Out Date:</label>
              <p>April 19, 2025, 2025</p>
            </fieldset>
            <fieldset>
              <label htmlFor="expected-return-date">
                Expected Return Date:
              </label>
              <p>July 10, 2025</p>
            </fieldset>
            <fieldset>
              <label htmlFor="condition">Condition:</label>
              <p>Good</p>
            </fieldset>
            <fieldset>
              <label htmlFor="notes">Notes:</label>
              <p>-</p>
            </fieldset>
            <fieldset>
              <label htmlFor="confirm-email-notes">
                Confirmation Email Notes:
              </label>
              <p>-</p>
            </fieldset>
          </section>
          <section className="checkin-form">
            <h2>Check-In Form</h2>
            <form action="" method="post">
              <fieldset>
                <label htmlFor="checkin-date">Check-In Date *</label>
                <input
                  type="date"
                  name="checkin-date"
                  id="checkin-date"
                  defaultValue={currentDate}
                  max={currentDate}
                  required
                />
              </fieldset>
              <fieldset>
                <label htmlFor="status">Status *</label>
                <select name="status" id="status" required>
                  <option value="option1">Option 1</option>
                  <option value="option2">Option 2</option>
                  <option value="option3">Option 3</option>
                </select>
              </fieldset>
              <fieldset>
                <label htmlFor="condition">Condition *</label>
                <select name="condition" id="condition" required>
                  <option value="option1">Option 1</option>
                  <option value="option2">Option 2</option>
                  <option value="option3">Option 3</option>
                </select>
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
              <fieldset>
                <label htmlFor="notes">Notes</label>
                <textarea name="notes" id="notes" maxLength="500"></textarea>
              </fieldset>
              <fieldset>
                <label htmlFor="location">Location *</label>
                <select name="location" id="location" required>
                  <option value="option1">Option 1</option>
                  <option value="option2">Option 2</option>
                  <option value="option3">Option 3</option>
                </select>
              </fieldset>
              <button type="submit" className="save-btn">
                Save
              </button>
            </form>
          </section>
        </section>
      </main>
    </>
  );
}
