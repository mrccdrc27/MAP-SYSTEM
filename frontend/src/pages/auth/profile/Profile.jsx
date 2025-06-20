import styles from "./profile.module.css";
import React, { useEffect } from 'react';
import AgentNav from '../../../components/navigations/agent-nav/AgentNav';
import { useAuth } from '../../../api/AuthContext';

export default function Profile() {
  const { user, loading, logout } = useAuth(); // ✅ Hook at top level

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not found</p>; // ✅ Prevent crashing when user is null

  return (
    <>
      <AgentNav />
      <main className={styles.profilePage}>
        <section className={styles.profilePageWrapper}>
          <section className={styles.leftProfilePage}>
            <h1 className={styles.profileTitle}>Profile</h1>
            <div className={styles.profilePageImageSection}>
              <div className={styles.profilePageImage}>
                <img
                  src={
                    user.profile_picture
                      ? `http://localhost:3000${user.profile_picture}`
                      : "https://i.pinimg.com/736x/e6/50/7f/e6507f42d79520263d8d952633cedcf2.jpg"
                  }
                  alt="Profile"
                />
              </div>
            </div>
            <div className={styles.profilePageInfoSection}>
              <div className={styles.ppInfoName}>
                <h3>{user.first_name} {user.last_name}</h3>
              </div>
              <div className={styles.ppInfoPosition}>
                <span className={styles.infoLabel}>Position:</span>
                <span className={styles.infoValue}>{user.role?.name || 'N/A'}</span>
              </div>
              <div className={styles.ppInfoDepartment}>
                <span className={styles.infoLabel}>Department:</span>
                <span className={styles.infoValue}>IT Support/Help Desk</span>
              </div>
            </div>
          </section>

          <section className={styles.rightProfilePage}>
            <div className={styles.profileSettingsCard}>
              <h3 className={styles.sectionTitle}>Profile Settings</h3>
              <div className={styles.profilePageSettingSection}>
                <div className={styles.ppUserInfoCont}>
                  <div className={styles.ppInfoItem}>
                    <label htmlFor="firstname">First Name</label>
                    <input type="text" id="firstname" placeholder="Enter first name" defaultValue={user.first_name} />
                  </div>
                  <div className={styles.ppInfoItem}>
                    <label htmlFor="middlename">Middle Name</label>
                    <input type="text" id="middlename" placeholder="Enter middle name" defaultValue={user.middle_name} />
                  </div>
                  <div className={styles.ppInfoItem}>
                    <label htmlFor="lastname">Last Name</label>
                    <input type="text" id="lastname" placeholder="Enter last name" defaultValue={user.last_name} />
                  </div>
                  <div className={styles.ppInfoItem}>
                    <label htmlFor="suffix">Suffix</label>
                    <input type="text" id="suffix" placeholder="Enter suffix (if applicable)" />
                  </div>
                </div>

                <div className={styles.ppUserCompanyCont}>
                  <div className={styles.ppInfoItem}>
                    <label htmlFor="company-id">Company ID</label>
                    <input type="text" id="company-id" placeholder="XXX-XXX-XXX" />
                  </div>
                  <div className={styles.ppInfoItem}>
                    <label htmlFor="department">Department</label>
                    <input type="text" id="department" placeholder="XXXXXXXXXX" />
                  </div>
                  <div className={styles.saveButtonContainer}>
                    <button className={styles.saveButton}>SAVE CHANGES</button>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.profileAuthCard}>
              <h3 className={styles.sectionTitle}>Authentication Details</h3>
              <div className={styles.profilePageAuthSection}>
                <div className={styles.ppInfoItem}>
                  <label htmlFor="email">Email Address</label>
                  <input type="email" id="email" placeholder="Email@gmail.com" defaultValue={user.email} />
                </div>
                <div className={styles.ppInfoItem}>
                  <label htmlFor="password">Password</label>
                  <input type="password" id="password" placeholder="-------" />
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
