// TODO: Reformat the Role to be frontend friendly

import { useState, useEffect } from "react";
import "./ManageProfile.css";
import { updateProfile } from "../../API/authAPI";
import { useAuth } from "../../context/AuthContext";

export default function ManageProfile({ onClose }) {
  const { user, logout, getBmsRole, updateUserContext } = useAuth(); // Get user and the function to update the context
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    // Read-only fields for display
    email: "",
    department_name: "",
    role: "",
  });



  const [isSubmitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);

  // Pre-fill the form with user data when the component loads
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone_number: user.phone_number || "",
        email: user.email || "",
        department_name: user.department_name || "",
        role: user.role_display || user.role || "User", // Prefer role_display
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setApiError(null);
    setApiSuccess(null);

    // Only send the fields that are allowed to be updated
    const dataToSubmit = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone_number: formData.phone_number,
    };

    try {
      const updatedUserData = await updateProfile(dataToSubmit);
      // Update the global context so the whole app sees the change
      updateUserContext(updatedUserData);
      setApiSuccess("Profile updated successfully!");
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || "An error occurred. Please try again.";
      setApiError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      <main className="manageProfilePage">
        <div className="manageProfileContainer">
          <div className="profileContent">
            <div className="profileLeft">
              <div className="profileHeaderSection">
                <div className="manageProfileHeader">
                  <button className="backButton" onClick={handleBackClick}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15 18L9 12L15 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <h1>Manage Profile</h1>
                </div>
              </div>

              <div className="profileCard">
                <div className="profileImageSection">
                  <div className="profileImageContainer">
                    <img
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt="Profile"
                      className="profileImage"
                    />
                  </div>
                  {/* Image change functionality can be added later */}
                </div>

                <div className="profileInfo">
                  <h3>
                    {user?.first_name} {user?.last_name}
                  </h3>
                  <div className="profileDetails">
                    <p>
                      <strong>Position:</strong>
                    </p>
                    <p>{formData.role}</p>
                    <p>
                      <strong>Department:</strong>
                    </p>
                    <p>{formData.department_name}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="profileRight">
              <form onSubmit={handleSubmit}>
                <div className="profileSettingsCard">
                  <h2>Profile Settings</h2>

                  {/* API Messages */}
                  {apiError && (
                    <div className="api-error-message">{apiError}</div>
                  )}
                  {apiSuccess && (
                    <div className="api-success-message">{apiSuccess}</div>
                  )}

                  <div className="formGrid">
                    <div className="formGroup">
                      <label>First Name</label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        required
                      />
                    </div>

                    <div className="formGroup">
                      <label>Last Name</label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        required
                      />
                    </div>

                    <div className="formGroup">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        placeholder="e.g., +639123456789"
                      />
                    </div>

                    <div className="formGroup">
                      <label>Department</label>
                      <input
                        type="text"
                        name="department_name"
                        value={formData.department_name}
                        readOnly
                        className="read-only-input"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="saveChangesBtn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                </div>

                <div className="authenticationCard">
                  <h2>Authentication Details</h2>

                  <div className="formGroup">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      readOnly
                      className="read-only-input"
                    />
                  </div>

                  <div className="formGroup">
                    <label>Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value="password123" // Demo value
                      readOnly
                      className="read-only-input"
                    />
                    <small
                      style={{
                        color: "#666",
                        fontSize: "12px",
                        marginTop: "5px",
                      }}
                    >
                      Password cannot be changed from this page.
                    </small>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
