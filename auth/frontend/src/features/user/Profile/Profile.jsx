import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getProfile, updateProfile } from '../../../services/userService';
import { useToast, Button, Input, Card, Badge } from '../../../components/common';
import ImageCropperModal from '../../../components/ImageCropperModal/ImageCropperModal';
import styles from './Profile.module.css';

const defaultProfileImage = 'https://i.pinimg.com/1200x/a9/a8/c8/a9a8c8258957c8c7d6fcd320e9973203.jpg';

const Profile = () => {
  const navigate = useNavigate();
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
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState(null);

  useEffect(() => { fetchProfile(); }, []);

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
        if (response.data.profile_picture) setProfilePreview(response.data.profile_picture);
        updateUser(response.data);
      }
    } catch (err) { error('Error', 'Failed to load profile'); }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    if (!profilePicture) {
      // No changes to save (only profile picture can be edited)
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      // Only send profile picture - personal info fields are not editable
      const data = new FormData();
      data.append('profile_picture', profilePicture);
      
      const response = await updateProfile(data, true);
      if (response.ok) {
        success('Success', 'Profile picture updated');
        setProfileData(response.data);
        updateUser(response.data);
        if (response.data.profile_picture) {
          setProfilePreview(response.data.profile_picture);
        }
        setIsEditing(false);
        setHasChanges(false);
        setProfilePicture(null);
      } else {
        // Handle validation errors
        const errors = response.data;
        if (errors.profile_picture) {
          error('Profile Picture Error', errors.profile_picture.join(' '));
        } else if (errors.detail) {
          error('Error', errors.detail);
        } else {
          const firstError = Object.values(errors)[0];
          error('Error', Array.isArray(firstError) ? firstError[0] : firstError);
        }
      }
    } catch (err) {
      error('Error', 'Failed to update profile');
    } finally { setIsSaving(false); }
  };

  const handleProfilePictureSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Read file as data URL and open cropper
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImageForCrop(event.target.result);
        setShowCropper(true);
      };
      reader.onerror = () => {
        error('Error', 'Failed to read file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropperSave = (croppedFile) => {
    setProfilePicture(croppedFile);
    setProfilePreview(URL.createObjectURL(croppedFile));
    setHasChanges(true);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', { 
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  }) : 'Never';

  if (isLoading) return <div className={styles.loadingOverlay}><div className={styles.loadingSpinner}></div></div>;

  return (
    <div className="page-wrapper">
      <ToastContainer />

      <ImageCropperModal
        isOpen={showCropper}
        onClose={() => {
          setShowCropper(false);
          setSelectedImageForCrop(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        onSave={handleCropperSave}
        initialImage={selectedImageForCrop}
      />
      
      <header className="page-header">
        <div className="page-title-section">
          <h1>Account Information</h1>
          <p className="page-subtitle">View and manage your personal and professional profile details.</p>
        </div>
        <div className="page-actions">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} icon={<i className="fa-solid fa-user-pen"></i>}>Edit Profile</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)} icon={<i className="fa-solid fa-xmark"></i>}>Cancel</Button>
              <Button onClick={handleSave} isLoading={isSaving} icon={<i className="fa-solid fa-check"></i>}>Save Changes</Button>
            </>
          )}
        </div>
      </header>

      <div className="page-content">
        <div className={styles.profileGrid}>
          {/* Left Column: Unified Sidebar Card */}
          <Card className={styles.profileSidebarCard} flat>
            <div className={styles.avatarContainer} onClick={() => isEditing && fileInputRef.current?.click()}>
              <img src={profilePreview} alt="Profile" className={styles.avatarImg} onError={e => e.target.src = defaultProfileImage} />
              {isEditing && <div className={styles.avatarOverlay}><i className="fa fa-camera"></i></div>}
            </div>
            <input type="file" ref={fileInputRef} className={styles.hiddenInput} accept="image/*" onChange={handleProfilePictureSelect} />
            
            <div className={styles.basicInfo}>
              <h3>{profileData?.first_name} {profileData?.middle_name ? `${profileData.middle_name} ` : ''}{profileData?.last_name}</h3>
              <p>@{profileData?.username}</p>
              <div className={styles.badgeGroup}>
                {profileData?.is_superuser && <Badge variant="danger">Superuser</Badge>}
                {profileData?.is_staff && <Badge variant="info">Staff</Badge>}
                <Badge variant={profileData?.status === 'Approved' ? 'success' : 'warning'}>{profileData?.status || 'Pending'}</Badge>
              </div>
            </div>

            <div className={styles.sidebarMeta}>
              <div className={styles.metaItem}>
                <i className="fa-solid fa-envelope"></i>
                <span>{profileData?.email}</span>
              </div>
              <div className={styles.metaItem}>
                <i className="fa-solid fa-building"></i>
                <span>{profileData?.department || 'IT Department'}</span>
              </div>
              <div className={styles.metaItem}>
                <i className="fa-solid fa-id-badge"></i>
                <span>ID: {profileData?.company_id || 'N/A'}</span>
              </div>
            </div>

            <div className={styles.sidebarDivider}></div>

            <div className={styles.activitySection}>
              <h4>Account Activity</h4>
              <div className={styles.activityItem}>
                <label>Date Joined</label>
                <span>{formatDate(profileData?.date_joined)}</span>
              </div>
              <div className={styles.activityItem}>
                <label>Last Logged On</label>
                <span>{formatDate(profileData?.last_login)}</span>
              </div>
            </div>
          </Card>

          {/* Right Column: Detailed Information */}
          <div className={styles.profileMain}>
            <Card title="Personal Information" flat>
              <div className={styles.formGrid}>
                <Input label="First Name" value={formData.first_name} disabled />
                <Input label="Middle Name" value={formData.middle_name} disabled />
                <Input label="Last Name" value={formData.last_name} disabled />
                <Input label="Suffix" value={formData.suffix} placeholder="Jr, Sr, etc." disabled />
                <Input label="Username" value={formData.username} disabled />
                <Input label="Phone Number" value={formData.phone_number} disabled />
              </div>
            </Card>

            <Card title="System Access & Roles" flat>
              {profileData?.system_roles && profileData.system_roles.length > 0 ? (
                <div className={styles.rolesList}>
                  {profileData.system_roles.map((role, idx) => (
                    <div key={idx} className={styles.roleItem}>
                      <div className={styles.roleSystem}>{role.system_slug?.toUpperCase()}</div>
                      <Badge variant="primary">{role.role_name}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noDataText}>No system roles assigned yet.</p>
              )}
            </Card>

            <Card title="Organization Information" flat>
              <div className={styles.formGrid}>
                <Input label="Employment Email" value={profileData?.email} disabled hint="Managed by organization." />
                <Input label="Company ID" value={profileData?.company_id || 'N/A'} disabled />
                <Input label="Assigned Department" value={profileData?.department || 'N/A'} disabled />
                <Input label="Account Status" value={profileData?.status || 'Pending'} disabled />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;