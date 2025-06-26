import { useState, useEffect } from "react";
import styles from "./manage-profile.module.css";

// components
import AgentNav from "../../components/navigation/AgentNav";

// reacf
import { useAuth } from "../../api/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ManageProfile() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  console.log("User in ManageProfile:", user);

  if (loading) return <p>Loading...</p>;
  return (
    <>
      <AgentNav />
      <main className={styles.manageProfilePage}>
        <div className={styles.manageProfileContainer}>
          <h1>Manage Profile</h1>

          <div className={styles.profileContent}>
            <div className={styles.profileLeft}>
              <div className={styles.profileCard}>
                <div className={styles.profileImageSection}>
                  <div className={styles.profileImageContainer}>
                    <img
                      src={user?.profile_picture || "https://i.pinimg.com/736x/19/de/17/19de17c09737a59c5684e14cbaccdfc1.jpg"}
                      alt="Profile"
                      className={styles.profileImage}
                    />
                  </div>
                  <input
                    type="file"
                    id="profile-image-input"
                    accept="image/*"
                    // onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                  <label
                    htmlFor="profile-image-input"
                    className={styles.changeImageBtn}
                  >
                    Change Photo
                  </label>
                </div>

                <div className={styles.profileInfo}>
                  <h3>
                    {user?.first_name} {user?.last_name}
                  </h3>
                  <div className={styles.profileDetails}>
                    <p>
                      <strong>Position:</strong>
                    </p>
                    <p>{user?.department || "Not specified"}</p>
                    <p>
                      <strong>Department:</strong>
                    </p>
                    <p>{user?.department || "Not specified"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.profileRight}>
              <form>
                <div className={styles.profileSettingsCard}>
                  <h2>Profile Settings</h2>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>First Name</label>
                      <input
                        type="text"
                        name="first_name"
                        value={user?.first_name}
                        // onChange={handleInputChange}
                        placeholder="Enter first name"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Company ID</label>
                      <input
                        type="text"
                        name="company_id"
                        value={user?.company_id}
                        // onChange={handleInputChange}
                        placeholder="XXX-XXX-XXX"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Middle Name</label>
                      <input
                        type="text"
                        name="middle_name"
                        value={user?.middle_name}
                        // onChange={handleInputChange}
                        placeholder="Enter middle name (if applicable)"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Department</label>
                      <input
                        type="text"
                        name="department"
                        value={user?.department}
                        // onChange={handleInputChange}
                        placeholder="XXXXXXXXX"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Last Name</label>
                      <input
                        type="text"
                        name="last_name"
                        value={user?.last_name}
                        // onChange={handleInputChange}
                        placeholder="Enter last name"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Suffix</label>
                      <input
                        type="text"
                        name="suffix"
                        value={user?.suffix}
                        // onChange={handleInputChange}
                        placeholder="Enter suffix (if applicable)"
                      />
                    </div>
                  </div>

                  <button type="submit" className={styles.saveChangesBtn}>
                    SAVE CHANGES
                  </button>
                </div>

                <div className={styles.authenticationCard}>
                  <h2>Authentication Details</h2>

                  <div className={styles.formGroup}>
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={user?.email}
                      // onChange={handleInputChange}
                      placeholder="Email@gmail.com"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Password</label>
                    <input
                      type="password"
                      name="password"
                      value={user?.password}
                      // onChange={handleInputChange}
                      placeholder="••••••••"
                    />
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
