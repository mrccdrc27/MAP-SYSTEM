import React from "react";
import { useLocation } from "react-router-dom";
import NavBar from "../components/NavBar";
import ViewPage from "../components/View/Viewpage";
import Status from "../components/Status";
import DefaultProfile from "../assets/img/default-profile.svg";
import "../styles/DetailedViewPage.css";
import "../styles/UserManagement/UserManagement.css";

export default function UserManagementViewPage() {
  const location = useLocation();
  const user = location.state?.user;

  if (!user) {
    return (
      <>
        <NavBar />
        <main className="view-page-layout">
          <section className="view-title-section">
            <h1>User not found</h1>
          </section>
        </main>
      </>
    );
  }

  const formattedLastLogin = user.lastLogin
    ? new Date(user.lastLogin).toLocaleString()
    : "—";

  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleString()
    : "—";
  return (
    <>
      <NavBar />
      <ViewPage
        breadcrumbRoot="User Management"
        breadcrumbCurrent="User Details"
        breadcrumbRootPath="/user-management"
        title={user.name || "User Details"}
      >
        <div className="user-management-view-content">
          <div className="asset-details-section">
            <h3 className="section-header">User Management Details</h3>
            <div className="asset-details-grid">
              <div className="detail-row">
                <label>Profile Picture</label>
                <span>
                  <img
                    src={user.photo || DefaultProfile}
                    alt={user.name}
                    className="user-profile-avatar"
                    onError={(e) => {
                      e.target.src = DefaultProfile;
                    }}
                  />
                </span>
              </div>
              <div className="detail-row">
                <label>Full Name</label>
                <span>{user.name || "N/A"}</span>
              </div>
              <div className="detail-row">
                <label>Email</label>
                <span>{user.email || "N/A"}</span>
              </div>
              <div className="detail-row">
                <label>Role</label>
                <span>{user.role || "N/A"}</span>
              </div>
              <div className="detail-row">
                <label>Phone Number</label>
                <span>{user.phoneNumber || "N/A"}</span>
              </div>
              <div className="detail-row">
                <label>Company</label>
                <span>{user.company || "N/A"}</span>
              </div>
              <div className="detail-row">
                <label>Phone</label>
                <span>{user.phone || "N/A"}</span>
              </div>
              <div className="detail-row">
                <label>Status</label>
                <span>
                  <Status type={user.status?.type} name={user.status?.name} />
                </span>
              </div>
              <div className="detail-row">
                <label>Last Login</label>
                <span>{formattedLastLogin}</span>
              </div>
            </div>
          </div>

          <div className="additional-fields-section">
            <h3 className="section-header">Additional Fields</h3>
            <div className="asset-details-grid">
              <div className="detail-row">
                <label>Notes</label>
                <span>{user.notes || "N/A"}</span>
              </div>
              <div className="detail-row">
                <label>Created At</label>
                <span>{createdAt}</span>
              </div>
              <div className="detail-row">
                <label>Updated At</label>
                <span>{user.updated_at || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </ViewPage>
    </>
  );
}

