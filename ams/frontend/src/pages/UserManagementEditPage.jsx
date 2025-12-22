import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import TopSecFormPage from "../components/TopSecFormPage";
import Alert from "../components/Alert";
import "../styles/Registration.css";

function buildInitialFormData(user) {
  if (!user) {
    return {
      firstName: "",
      middleName: "",
      lastName: "",
      suffix: "",
      email: "",
      role: "",
      phoneNumber: "",
      company: "",
      phone: "",
      status: "",
    };
  }

  const fullName = user.name || "";
  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ");

  return {
    firstName: firstName || "",
    middleName: "",
    lastName: lastName || "",
    suffix: "",
    email: user.email || "",
    role: user.role || "",
    phoneNumber: user.phoneNumber || "",
    company: user.company || "",
    phone: user.phone || "",
    status: user.status?.name || "",
  };
}

export default function UserManagementEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user || null;

  const [formData, setFormData] = useState(() => buildInitialFormData(user));
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) {
      setErrorMessage("User data not found. Please go back to User Management.");
    } else {
      setFormData(buildInitialFormData(user));
    }
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!user) {
      setErrorMessage("Cannot save changes because user data is missing.");
      return;
    }

    const payload = {
      id: user.id || id,
      ...formData,
    };

    // Placeholder for future API integration
    // eslint-disable-next-line no-console
    console.log("Updated user data:", payload);

    setSuccessMessage("User details have been updated successfully.");

    setTimeout(() => {
      navigate("/user-management", {
        state: {
          successMessage: "User details have been updated successfully.",
        },
      });
    }, 800);
  };

  const isFormValid =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.role.trim();

  const renderForm = () => (
    <section className="page-layout-registration">
      <NavBar />
      <main className="registration">
        <section className="top">
          <TopSecFormPage
            root="User Management"
            currentPage="Edit User"
            rootNavigatePage="/user-management"
            title={user?.name || "Edit User"}
          />
        </section>

        <section className="registration-form">
          <form onSubmit={handleSubmit}>
            <fieldset>
              <label htmlFor="firstName">
                First Name
                <span className="required-asterisk">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                maxLength="100"
                required
              />
            </fieldset>

            <fieldset>
              <label htmlFor="middleName">Middle Name</label>
              <input
                id="middleName"
                name="middleName"
                type="text"
                placeholder="Ronald"
                value={formData.middleName}
                onChange={handleChange}
                maxLength="100"
              />
            </fieldset>

            <fieldset>
              <label htmlFor="lastName">
                Last Name
                <span className="required-asterisk">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Smith"
                value={formData.lastName}
                onChange={handleChange}
                maxLength="100"
                required
              />
            </fieldset>

            <fieldset>
              <label htmlFor="suffix">Suffix</label>
              <input
                id="suffix"
                name="suffix"
                type="text"
                placeholder="Jr., Sr., III"
                value={formData.suffix}
                onChange={handleChange}
                maxLength="20"
              />
            </fieldset>

            <fieldset>
              <label htmlFor="email">
                Email
                <span className="required-asterisk">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="johnsmith@example.com"
                value={formData.email}
                onChange={handleChange}
                maxLength="150"
                required
              />
            </fieldset>

            <fieldset>
              <label htmlFor="role">
                Role
                <span className="required-asterisk">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="">Select Role</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
              </select>
            </fieldset>

            <fieldset>
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="text"
                placeholder="0917 123 4567"
                value={formData.phoneNumber}
                onChange={handleChange}
                maxLength="20"
              />
            </fieldset>

            <fieldset>
              <label htmlFor="company">Company</label>
              <input
                id="company"
                name="company"
                type="text"
                placeholder="MapAMS Solutions Inc."
                value={formData.company}
                onChange={handleChange}
                maxLength="150"
              />
            </fieldset>

            <fieldset>
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                type="text"
                placeholder="+63 2 800 1001"
                value={formData.phone}
                onChange={handleChange}
                maxLength="20"
              />
            </fieldset>

            <fieldset>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="">Select Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </fieldset>

            <button type="submit" className="save-btn" disabled={!isFormValid}>
              Save
            </button>
          </form>
        </section>
      </main>
      <Footer />
    </section>
  );

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}
      {renderForm()}
    </>
  );
}

