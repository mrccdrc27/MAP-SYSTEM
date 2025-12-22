import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import "../styles/Settings.css";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("account");

  // Add a class to the body to prevent layout shift when switching tabs
  useEffect(() => {
    // Save the original body padding
    const originalPadding = window.getComputedStyle(document.body).paddingRight;

    // Add a class to the body to prevent scrollbar from affecting layout
    document.body.classList.add('settings-page-open');

    // Clean up when component unmounts
    return () => {
      document.body.classList.remove('settings-page-open');
      document.body.style.paddingRight = originalPadding;
    };
  }, []);

  // Handle tab switching without layout shift
  const handleTabChange = (tab) => {
    // Prevent scrollbar from affecting layout during tab switch
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    setActiveTab(tab);
  };

  return (
    <>
      <NavBar />
      <main className="settings-page">
        <div className="settings-container">
          <h1>Settings</h1>

          <div className="settings-tabs">
            <button
              className={`tab ${activeTab === "account" ? "active" : ""}`}
              onClick={() => handleTabChange("account")}
            >
              Account Details
            </button>
            <button
              className={`tab ${activeTab === "company" ? "active" : ""}`}
              onClick={() => handleTabChange("company")}
            >
              Company Details
            </button>
          </div>

          <div className="settings-content">
            {activeTab === "company" && (
              <div>
                <h2>Company Details</h2>
                <div className="form-grid">
                  <div className="form-section">
                    <h3>Basic Information</h3>
                    <div className="form-group">
                      <label>Company name </label>
                      <input
                        type="text"
                        value="MAP Active"
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label>Industry Type </label>
                      <input
                        type="text"
                        value="Retail"
                        disabled
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Contact Information</h3>
                    <div className="form-group">
                      <label>Contact Person </label>
                      <input
                        type="text"
                        value="Mary Grace Piattos"
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label>Contact Email </label>
                      <input
                        type="email"
                        value="m*********@gmail.com"
                        disabled
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" className="save-changes">
                    Save Changes
                  </button>
              </div>
            )}

            {activeTab === "account" && (
              <div>
                <h2>Account Details</h2>
                <form>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>First name </label>
                      <input
                        type="text"
                        value="Mary Grace"
                        placeholder="Enter your first name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Email Address </label>
                      <input
                        type="email"
                        value="m*********@gmail.com"
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label>Middle name (Optional)</label>
                      <input
                        type="text"
                        placeholder="Enter your middle name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Role </label>
                      <input
                        type="text"
                        value="Admin"
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label>Last name </label>
                      <input
                        type="text"
                        value="Piattos"
                        placeholder="Enter your last name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Contact Number </label>
                      <input
                        type="tel"
                        value="+63 9*******678"
                        disabled
                      />
                    </div>

                    <div className="form-group created-at">
                      <label>Created At </label>
                      <input
                        type="text"
                        value="January 1, 2025 at 12:00 AM"
                        disabled
                      />
                    </div>
                  </div>

                  <button type="submit" className="save-changes">
                    Save Changes
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
