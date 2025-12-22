import "../../styles/AssetViewModal.css";
import CloseIcon from "../../assets/icons/close.svg";
import DefaultProfile from "../../assets/img/profile.jpg";

export default function UserViewModal({ user, closeModal }) {
  const imageSrc = user.photo || DefaultProfile;
  const userName = user.name || "-";
  const userEmail = user.email || "-";
  const userRole = user.role || "-";
  const userStatus = user.status?.name || "-";
  const createdDate = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : "-";
  
  return (
    <main className="asset-view-modal">
      <div className="overlay" onClick={closeModal}></div>
      <div className="content">
        <button onClick={closeModal} className="close-button">
          <img src={CloseIcon} alt="Close" />
        </button>

        <fieldset className="header-fieldset">
          <img 
            src={imageSrc} 
            alt="User Profile" 
            onError={(e) => { e.target.src = DefaultProfile; }}
            style={{ borderRadius: '50%', width: '80px', height: '80px', objectFit: 'cover' }}
          />
          <h2>{userName}</h2>
        </fieldset>

        <div className="details-container">
          <section className="left-content">
            <fieldset className="detail-item">
              <label>User ID</label>
              <p>{user.id}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Full Name</label>
              <p>{userName}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Email Address</label>
              <p>{userEmail}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Role</label>
              <p>{userRole}</p>
            </fieldset>
          </section>

          <section className="right-content">
            <fieldset className="detail-item">
              <label>Status</label>
              <p>{userStatus}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Created Date</label>
              <p>{createdDate}</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Last Login</label>
              <p>-</p>
            </fieldset>

            <fieldset className="detail-item">
              <label>Department</label>
              <p>-</p>
            </fieldset>
          </section>
        </div>
      </div>
    </main>
  );
}
