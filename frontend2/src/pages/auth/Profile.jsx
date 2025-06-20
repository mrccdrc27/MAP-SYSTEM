// style
import styles from "./profile.module.css";

// component
import AgentNav from "../../components/navigation/AgentNav";

// react
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  return (
    <>
      <AgentNav />
      <main className={styles.profilePage}>
        <section className={styles.ppHeader}>
          <div className={styles.ppBack} onClick={() => navigate(-1)}>
            <i className="fa fa-chevron-left"></i>
          </div>
          <h1>Profile Settings</h1>
        </section>
        <section className={styles.ppBody}>
          <div className={styles.ppAccountCont}>
            <h3>Account Details</h3>
          </div>
          <div className={styles.ppInfoWrapper}>
            <div className={styles.ppUserInfoCont}>
              <div className={styles.ppItem}>
                <label htmlFor="firstname">
                  First Name <span>*</span>
                </label>
                <input
                  type="text"
                  id="firstname"
                  placeholder="Enter first name"
                />
              </div>
              <div className={styles.ppItem}>
                <label htmlFor="middlename">Middle Name</label>
                <input
                  type="text"
                  id="middlename"
                  placeholder="Enter middle name"
                />
              </div>
              <div className={styles.ppItem}>
                <label htmlFor="lastname">
                  Last Name <span>*</span>
                </label>
                <input
                  type="text"
                  id="lastname"
                  placeholder="Enter last name"
                />
              </div>
              <div className={styles.ppItem}>
                <label htmlFor="suffix">Suffix</label>
                <input type="text" id="suffix" placeholder="Enter suffix" />
              </div>
            </div>
            <div className={styles.ppEmployeeInfoCont}>
              <div className={styles.ppItem}>
                <label htmlFor="email">
                  Email <span>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter email"
                  disabled
                />
              </div>
              <div className={styles.ppItem}>
                <label htmlFor="role">
                  Role <span>*</span>
                </label>
                <input
                  type="role"
                  id="role"
                  placeholder="Enter role"
                  disabled
                />
              </div>

              <div className={styles.ppItem}>
                <label htmlFor="contact">
                  Contact Number <span>*</span>
                </label>
                <input
                  type="contact"
                  id="contact"
                  placeholder="Enter contact"
                  disabled
                />
              </div>
            </div>
          </div>
          <button className={styles.ppButton}>Save Changes</button>
        </section>
      </main>
    </>
  );
}
