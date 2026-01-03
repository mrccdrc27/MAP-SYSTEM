import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProfile, updateProfile } from '../../api/auth';
import { useToast } from '../../components/Toast';
import Enable2FAModal from '../../components/Enable2FAModal';
import Disable2FAModal from '../../components/Disable2FAModal';
import styles from './Profile.module.css';

const defaultProfileImage = 'https://i.pinimg.com/1200x/a9/a8/c8/a9a8c8258957c8c7d6fcd320e9973203.jpg';

const Profile = () => {
  const { updateUser } = useAuth();
  const { ToastContainer, success, error } = useToast();
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({});
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePreview, setProfilePreview] = useState(defaultProfileImage);
  const [hasChanges, setHasChanges] = useState(false);
  const [showEnable2FA, setShowEnable2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await getProfile();
      if (response.ok) {
        setProfileData(response.data);
        setFormData({
          first_name: response.data.first_name || '',
          middle_name: response.data.middle_name || '',
          last_name: response.data.last_name || '',
          suffix: response.data.suffix || '',
          username: response.data.username || '',
          phone_number: response.data.phone_number || '',
        });
        if (response.data.profile_picture) {
          setProfilePreview(response.data.profile_picture);
        }
        updateUser(response.data);
      } else {
        error('Error', 'Failed to load profile data');
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      error('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setHasChanges(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setProfilePreview(URL.createObjectURL(file));
      setHasChanges(true);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setHasChanges(false);
    setProfilePicture(null);
    // Reset form data
    setFormData({
      first_name: profileData?.first_name || '',
      middle_name: profileData?.middle_name || '',
      last_name: profileData?.last_name || '',
      suffix: profileData?.suffix || '',
      username: profileData?.username || '',
      phone_number: profileData?.phone_number || '',
    });
    if (profileData?.profile_picture) {
      setProfilePreview(profileData.profile_picture);
    } else {
      setProfilePreview(defaultProfileImage);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let updateData;
      let isFormDataRequest = false;

      if (profilePicture) {
        // Use FormData for file upload
        updateData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            updateData.append(key, value);
          }
        });
        updateData.append('profile_picture', profilePicture);
        isFormDataRequest = true;
      } else {
        updateData = formData;
      }

      const response = await updateProfile(updateData, isFormDataRequest);

      if (response.ok) {
        success('Success', 'Profile updated successfully!');
        setProfileData(response.data);
        updateUser(response.data);
        setIsEditing(false);
        setHasChanges(false);
        setProfilePicture(null);
        if (response.data.profile_picture) {
          setProfilePreview(response.data.profile_picture);
        }
      } else {
        const errorMsg = response.data?.detail || Object.values(response.data || {})[0]?.[0] || 'Failed to update profile';
        error('Error', errorMsg);
      }
    } catch (err) {
      console.error('Profile update error:', err);
      error('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFullName = () => {
    if (!profileData) return 'Loading...';
    const parts = [
      profileData.first_name,
      profileData.middle_name,
      profileData.last_name,
      profileData.suffix
    ].filter(Boolean);
    return parts.join(' ') || 'No Name';
  };

  if (isLoading) {
    return (
      <main className={styles.profilePage}>
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.profilePage}>
      <ToastContainer />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Manage Profile</h2>
        </div>

        <div className={styles.profileContent}>
          {/* Left Side - Profile Card */}
          <div className={styles.profileLeft}>
            <div className={styles.profileCard}>
              <div className={styles.profileImageSection}>
                <div 
                  className={styles.profileImageContainer}
                  onClick={() => isEditing && fileInputRef.current?.click()}
                >
                  <img 
                    src={profilePreview} 
                    alt="Profile" 
                    className={styles.profileImage}
                    onError={(e) => { e.target.src = defaultProfileImage; }}
                  />
                  {isEditing && (
                    <div className={styles.profileImageOverlay}>
                      <i className="fa fa-camera"></i>
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  className={styles.fileInput}
                  accept="image/*"
                  onChange={handleFileChange}
                />

                {hasChanges && (
                  <p className={styles.unsavedWarning}>
                    ⚠️ Changes not saved yet
                  </p>
                )}

                <div className={styles.profileInfo}>
                  <h3>{getFullName()}</h3>
                  <div className={styles.profileInfoContainer}>
                    <p><strong>Username:</strong></p>
                    <span>{profileData?.username || '-'}</span>
                  </div>
                  <div className={styles.profileInfoContainer}>
                    <p><strong>Email:</strong></p>
                    <span>{profileData?.email || '-'}</span>
                  </div>
                  <div className={styles.profileInfoContainer}>
                    <p><strong>Company ID:</strong></p>
                    <span>{profileData?.company_id || '-'}</span>
                  </div>
                  <div className={styles.profileInfoContainer}>
                    <p><strong>Department:</strong></p>
                    <span>{profileData?.department || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Settings Form */}
          <div className={styles.profileRight}>
            <div className={styles.profileSettingsCard}>
              <h2>Personal Details</h2>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="first_name">First Name</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="middle_name">Middle Name</label>
                  <input
                    type="text"
                    id="middle_name"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="last_name">Last Name</label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="suffix">Suffix</label>
                  <input
                    type="text"
                    id="suffix"
                    name="suffix"
                    value={formData.suffix}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="phone_number">Phone Number</label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <h2>Organization</h2>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={profileData?.email || ''}
                    disabled
                  />
                  <small>Email cannot be changed directly.</small>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="company_id">Company ID</label>
                  <input
                    type="text"
                    id="company_id"
                    value={profileData?.company_id || ''}
                    disabled
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="department">Department</label>
                  <input
                    type="text"
                    id="department"
                    value={profileData?.department || ''}
                    disabled
                  />
                </div>
              </div>

              <h2>Account & Security</h2>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGroupCheckbox}`}>
                  <input
                    type="checkbox"
                    id="otp_enabled"
                    checked={profileData?.otp_enabled || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowEnable2FA(true);
                      } else {
                        setShowDisable2FA(true);
                      }
                    }}
                  />
                  <label htmlFor="otp_enabled">Two-Factor Authentication</label>
                  {profileData?.otp_enabled ? (
                    <span className={styles.badge2faEnabled}>Enabled</span>
                  ) : (
                    <span className={styles.badge2faDisabled}>Disabled</span>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Last Login</label>
                  <input
                    type="text"
                    value={formatDate(profileData?.last_login)}
                    disabled
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Date Joined</label>
                  <input
                    type="text"
                    value={formatDate(profileData?.date_joined)}
                    disabled
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                {!isEditing ? (
                  <>
                    <button className={styles.editBtn} onClick={handleEdit}>
                      <i className="fa-solid fa-edit"></i>
                      EDIT PROFILE
                    </button>
                    <Link to="/change-password" className={styles.editBtn}>
                      <i className="fa-solid fa-key"></i>
                      CHANGE PASSWORD
                    </Link>
                  </>
                ) : (
                  <>
                    <button 
                      className={styles.saveBtn} 
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <span>Saving...</span>
                          <span className={styles.spinner}></span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-save"></i>
                          SAVE CHANGES
                        </>
                      )}
                    </button>
                    <button className={styles.cancelBtn} onClick={handleCancel}>
                      <i className="fa-solid fa-times"></i>
                      CANCEL
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Modals */}
      <Enable2FAModal
        isOpen={showEnable2FA}
        onClose={() => setShowEnable2FA(false)}
        onSuccess={() => {
          setProfileData(prev => ({ ...prev, otp_enabled: true }));
          updateUser({ otp_enabled: true });
          success('Success', 'Two-factor authentication has been enabled!');
        }}
      />
      <Disable2FAModal
        isOpen={showDisable2FA}
        onClose={() => setShowDisable2FA(false)}
        onSuccess={() => {
          setProfileData(prev => ({ ...prev, otp_enabled: false }));
          updateUser({ otp_enabled: false });
          success('Success', 'Two-factor authentication has been disabled.');
        }}
      />
    </main>
  );
};

export default Profile;
