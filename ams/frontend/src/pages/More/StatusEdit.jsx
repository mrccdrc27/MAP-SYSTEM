import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import NavBar from "../../components/NavBar";
import TopSecFormPage from "../../components/TopSecFormPage";
import Status from "../../components/Status";
import Alert from "../../components/Alert";
import Footer from "../../components/Footer";

import "../../styles/Registration.css";
import "../../styles/CategoryRegistration.css";

const StatusRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState("");

  // Retrieve the "status" data value passed from the navigation state.
  // If the "status" data is not exist, the default value for this is "undifiend".
  const status = location.state?.status;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      statusName: status?.name || "",
      statusCategory: status?.category || "",
      statusType: status?.type || "",
      notes: status?.notes || "",
    },
    mode: "all",
  });

  const statusCategory = watch("statusCategory");

  const statusCategories = [
    { value: "asset", label: "Asset Status" },
    { value: "repair", label: "Repair Status" },
  ];

  const assetStatusTypes = [
    "Archived",
    "Deployable",
    "Deployed",
    "Pending",
    "Undeployable",
  ];

  const onSubmit = (data) => {
    // Here you would typically send the data to your API
    console.log("Form submitted:", data);

    // Optional: navigate back to status view after successful submission
    navigate("/More/ViewStatus", { state: { updatedStatus: true } });
  };

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}

      <section className="page-layout-registration">
        <NavBar />
        <main className="registration">
          <section className="top">
            <TopSecFormPage
              root="Statuses"
              currentPage="Update Status"
              rootNavigatePage="/More/ViewStatus"
              title={status?.name || "Update Status"}
            />
          </section>
          <section className="status-registration-section">
            <section className="registration-form">
              <form onSubmit={handleSubmit(onSubmit)}>
                <fieldset>
                  <label htmlFor="statusName">
                    Status Name
                    <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Status Name"
                    maxLength="100"
                    className={errors.statusName ? "input-error" : ""}
                    {...register("statusName", {
                      required: "Status Name is required",
                    })}
                  />
                  {errors.statusName && (
                    <span className="error-message">
                      {errors.statusName.message}
                    </span>
                  )}
                </fieldset>

                <fieldset>
                  <label htmlFor="statusCategory">
                    Status Category
                    <span className="required-asterisk">*</span>
                  </label>
                  <select
                    className={errors.statusCategory ? "input-error" : ""}
                    {...register("statusCategory", {
                      required: "Status Category is required",
                    })}
                  >
                    <option value="">Select Status Category</option>
                    {statusCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  {errors.statusCategory && (
                    <span className="error-message">
                      {errors.statusCategory.message}
                    </span>
                  )}
                </fieldset>

                {statusCategory === "asset" && (
                  <fieldset>
                    <label htmlFor="statusType">
                      Status Type
                      <span className="required-asterisk">*</span>
                    </label>
                    <select
                      className={errors.statusType ? "input-error" : ""}
                      {...register("statusType", {
                        required: statusCategory === "asset" ? "Status Type is required for asset statuses" : false,
                      })}
                    >
                      <option value="">Select Status Type</option>
                      {assetStatusTypes.map((type, idx) => (
                        <option key={idx} value={type.toLowerCase()}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.statusType && (
                      <span className="error-message">
                        {errors.statusType.message}
                      </span>
                    )}
                  </fieldset>
                )}

                <fieldset>
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    placeholder="Enter any additional notes about this status..."
                    rows="4"
                    maxLength="500"
                    {...register("notes")}
                  />
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
            <section className="status-info-section">
              <h2>About Status Types</h2>
              <section className="deployable-section">
                <Status type={"deployable"} name={"Deployable"} />
                <p>
                  Use this for assets that can be checked out. Once you check
                  them out, they will automatically change status to{" "}
                  <span>
                    <Status type={"deployed"} name={"Deployed"} />.
                  </span>
                </p>
              </section>
              <section className="pending-section">
                <Status type={"pending"} name={"Pending"} />
                <p>
                  Use this for assets that can't be checked out. Useful for
                  assets that are being repaired, and are expected to return to
                  use.
                </p>
              </section>
              <section className="undeployable-section">
                <Status type={"undeployable"} name={"Undeployable"} />
                <p>Use this for assets that can't be checked out to anyone.</p>
              </section>
              <section className="archived-section">
                <Status type={"archived"} name={"Archived"} />
                <p>
                  Use this for assets that can't be checked out to anyone, and
                  have been archived. Useful for keeping information about
                  historical assets and meanwhile keeping them out of daily
                  sight.
                </p>
              </section>
            </section>
          </section>
        </main>
        <Footer />
      </section>
    </>
  );
};

export default StatusRegistration;
