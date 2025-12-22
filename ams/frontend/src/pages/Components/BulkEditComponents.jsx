import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import NavBar from "../../components/NavBar";
import TopSecFormPage from "../../components/TopSecFormPage";
import Alert from "../../components/Alert";
import ComponentData from "../../data/mockData/components/component-mockup-data.json";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/Registration.css";
import "../../styles/components/BulkEditComponents.css";

export default function BulkEditComponents() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedIds } = location.state || { selectedIds: [] };

  const [currentSelectedIds, setCurrentSelectedIds] = useState(selectedIds || []);
  const selectedComponents = ComponentData.filter((item) =>
    currentSelectedIds.includes(item.id)
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!selectedIds || selectedIds.length === 0) {
      setErrorMessage("No components selected for bulk edit");
      setTimeout(() => navigate("/components"), 2000);
    }
  }, [selectedIds, navigate]);

  const handleRemoveComponent = (id) => {
    setCurrentSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: {
      category: "",
      manufacturer: "",
      supplier: "",
      location: "",
      purchaseCost: "",
      minimumQuantity: "",
      notes: "",
    },
  });

  const onSubmit = (data) => {
    if (currentSelectedIds.length === 0) {
      setErrorMessage("Please select at least one component to update");
      return;
    }

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) =>
        value !== "" && value !== null && value !== undefined
      )
    );

    if (Object.keys(updateData).length === 0) {
      setErrorMessage("Please select at least one field to update");
      return;
    }

    // Placeholder for API integration
    console.log("Updating components:", currentSelectedIds, "with:", updateData);

    setSuccessMessage(
      `Successfully updated ${currentSelectedIds.length} component(s)`
    );
    setTimeout(() => {
      navigate("/components", {
        state: {
          successMessage: `Updated ${currentSelectedIds.length} component(s)`,
        },
      });
    }, 2000);
  };

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      <section className="page-layout-with-table">
        <NavBar />
        <main className="main-with-table">
          <TopSecFormPage
            root="Components"
            currentPage="Bulk Edit Components"
            rootNavigatePage="/components"
            title="Bulk Edit Components"
          />

          <section className="components-bulk-selected">
            <h3>Selected Components ({currentSelectedIds.length})</h3>
            <div className="components-bulk-tags">
              {selectedComponents.length > 0 ? (
                selectedComponents.map((item) => (
                  <div key={item.id} className="component-bulk-tag">
                    <span className="component-bulk-name">{item.name}</span>
                    <span className="component-bulk-id">#{item.id}</span>
                    <button
                      type="button"
                      className="component-bulk-remove"
                      onClick={() => handleRemoveComponent(item.id)}
                      title="Remove from selection"
                    >
                      <img src={CloseIcon} alt="Remove" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="components-bulk-empty">No components selected</p>
              )}
            </div>
          </section>

          <section className="components-bulk-form-section">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="components-bulk-form"
            >
              <fieldset className="form-field">
                <label htmlFor="category">Category</label>
                <input
                  id="category"
                  type="text"
                  className={`form-input ${errors.category ? "input-error" : ""}`}
                  {...register("category")}
                  maxLength={100}
                  placeholder="Category"
                />
              </fieldset>

              <fieldset className="form-field">
                <label htmlFor="manufacturer">Manufacturer</label>
                <input
                  id="manufacturer"
                  type="text"
                  className={`form-input ${
                    errors.manufacturer ? "input-error" : ""
                  }`}
                  {...register("manufacturer")}
                  maxLength={100}
                  placeholder="Manufacturer"
                />
              </fieldset>

              <fieldset className="form-field">
                <label htmlFor="supplier">Supplier</label>
                <input
                  id="supplier"
                  type="text"
                  className={`form-input ${errors.supplier ? "input-error" : ""}`}
                  {...register("supplier")}
                  maxLength={100}
                  placeholder="Supplier"
                />
              </fieldset>

              <fieldset className="form-field">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  type="text"
                  className={`form-input ${errors.location ? "input-error" : ""}`}
                  {...register("location")}
                  maxLength={100}
                  placeholder="Location"
                />
              </fieldset>

              <fieldset className="form-field cost-field">
                <label htmlFor="purchaseCost">Purchase Cost</label>
                <div className="cost-input-group">
                  <span className="cost-addon">PHP</span>
                  <input
                    id="purchaseCost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={`form-input ${
                      errors.purchaseCost ? "input-error" : ""
                    }`}
                    {...register("purchaseCost", { valueAsNumber: true })}
                  />
                </div>
              </fieldset>

              <fieldset className="form-field">
                <label htmlFor="minimumQuantity">Minimum Quantity</label>
                <input
                  id="minimumQuantity"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Minimum Quantity"
                  className={`form-input ${
                    errors.minimumQuantity ? "input-error" : ""
                  }`}
                  {...register("minimumQuantity", { valueAsNumber: true })}
                />
              </fieldset>

              <fieldset className="form-field notes-field">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  rows="4"
                  maxLength={500}
                  className={`form-input ${errors.notes ? "input-error" : ""}`}
                  {...register("notes")}
                  placeholder="Notes"
                />
              </fieldset>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => navigate("/components")}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update Components
                </button>
              </div>
            </form>
          </section>
        </main>
      </section>
    </>
  );
}

