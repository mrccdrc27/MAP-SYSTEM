import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import styles from './manage-profile.module.css';
import { useAuth } from '../../../context/AuthContext';
import authService from '../../../utilities/service/authService';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import { API_CONFIG } from '../../../config/environment';
import { backendEmployeeService } from '../../../services/backend/employeeService';
import { resolveMediaUrl } from '../../../utilities/helpers/mediaUrl';

export default function EmployeeSettings({ editingUserId = null }) {
  const navigate = useNavigate();
  const { user: authUser, setUser: setAuthUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileUrlRef = useRef(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const verifyTimerRef = useRef(null);

  // Password validation helper copied from create-account logic
  const getPasswordErrorMessage = (password) => {
    if (!password || password.trim() === "") {
      return "Password must be at least 8 characters long and include uppercase, number, and special character.";
    }
    const hasMinLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>`~\-_=\\/;\'\[\]]/.test(password);

    const missing = {
      upper: !hasUpper,
      lower: !hasLower,
      digit: !hasDigit,
      special: !hasSpecial,
    };

    const missingKeys = Object.entries(missing)
      .filter(([_, isMissing]) => isMissing)
      .map(([key]) => key);

    const descriptors = {
      upper: "uppercase",
      lower: "lowercase",
      digit: "number",
      special: "special character",
    };

    const buildList = (items) => {
      if (items.length === 1) return descriptors[items[0]];
      if (items.length === 2)
        return `${descriptors[items[0]]} and ${descriptors[items[1]]}`;
      return (
        items
          .slice(0, -1)
          .map((key) => descriptors[key])
          .join(", ") +
        ", and " +
        descriptors[items[items.length - 1]]
      );
    };

    if (!hasMinLength && missingKeys.length) {
      return `Password must be at least 8 characters long and include ${buildList(missingKeys)}.`;
    } else if (!hasMinLength) {
      return "Password must be at least 8 characters long.";
    } else if (missingKeys.length) {
      return `Password must include ${buildList(missingKeys)}.`;
    }

    return null;
  };

  useEffect(() => {
    // Simulate loading delay; prefer freshest data from backend when authenticated
    const timer = setTimeout(() => {
  const cached = authUser || (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; } })();
      const token = localStorage.getItem('access_token');

      if (token) {
        // Try to fetch latest employee profile from backend; fall back to cached user
        backendEmployeeService.getCurrentEmployee()
          .then((data) => {
            // Server may return snake_case or camelCase keys; merge with cached for any missing values
            const merged = { ...(cached || {}), ...(data || {}) };

            // Resolve image URL similarly to the navbar logic so relative media paths work
            const imgCandidate = merged.profile_image || merged.image || merged.profileImage || merged.image_url || merged.imageUrl;
            const resolved = resolveMediaUrl(imgCandidate);
            if (resolved) merged.profileImage = resolved;

      setUser(merged);
      // keep AuthContext in sync if we have an auth context setter
      try { if (setAuthUser) setAuthUser(merged); } catch (e) {}
            setLoading(false);
          })
          .catch((_) => {
            setUser(cached);
            setLoading(false);
          });
      } else {
        setUser(cached);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Cleanup any blob URLs on unmount
  useEffect(() => {
    return () => {
      if (fileUrlRef.current) {
        try { URL.revokeObjectURL(fileUrlRef.current); } catch (e) {}
        fileUrlRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = (file) => {
    setSelectedFile(file || null);
    if (file) {
      try {
        if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      } catch (e) {}
      const url = URL.createObjectURL(file);
      fileUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      try {
        if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      } catch (e) {}
      fileUrlRef.current = null;
      setPreviewUrl(null);
    }
  };

  const handleSaveChanges = async () => {
    // Only change currently supported: profile image upload
    if (!selectedFile) {
      // No file selected; nothing to save
      return;
    }
    setUploading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const res = await backendEmployeeService.uploadEmployeeImage(null, selectedFile);
        const newImageUrl = res?.image_url || res?.image || res?.imageUrl || previewUrl;
        // Resolve to an absolute URL so listeners (navbars) can update immediately
        const resolvedImageUrl = resolveMediaUrl(newImageUrl) || newImageUrl || previewUrl;
        // Append a cache-busting query param so browsers load the updated file
        const addCacheBuster = (u) => {
          try {
            if (!u || typeof u !== 'string') return u;
            if (u.startsWith('data:') || u.startsWith('blob:')) return u;
            const sep = u.includes('?') ? '&' : '?';
            return `${u}${sep}v=${Date.now()}`;
          } catch (e) { return u; }
        };
        const resolvedWithCache = addCacheBuster(resolvedImageUrl);

        // Update local user cache for immediate UI feedback
        setUser((prev) => ({ ...(prev || {}), profileImage: resolvedWithCache, image: resolvedWithCache }));
        try {
          const cached = authUser || (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; } })();
          // Only overwrite the global `loggedInUser` if we're updating the authenticated user's own profile
          const cachedId = cached?.id || cached?.companyId || cached?.company_id;
            // Determine which profile id we're editing. Allow parent to override
            // via `editingUserId` when this settings component is used by admin.
            const profileId = editingUserId || (user && (user.id || user.companyId || user.company_id)) || null;
            if (cached && profileId && String(cachedId) === String(profileId)) {
              const updated = { ...cached, profileImage: resolvedWithCache, image: resolvedWithCache };
              try { localStorage.setItem('user', JSON.stringify(updated)); } catch (e) {}
              try { localStorage.setItem('loggedInUser', JSON.stringify(updated)); } catch (e) {}
              try { if (setAuthUser) setAuthUser(updated); } catch (e) {}
            }
        } catch (e) {
          // ignore storage errors
        }

        // Notify user and other UI pieces (navbar, modals) that profile image changed
        try { toast.success('Profile image updated successfully.'); } catch (e) {}
        try {
          const profileId = editingUserId || (user && (user.id || user.companyId || user.company_id)) || null;
          window.dispatchEvent(new CustomEvent('profile:updated', { detail: { profileImage: resolvedWithCache, userId: profileId } }));
        } catch (e) {}
      } else {
        // Fallback: no backend token; store preview in local profile
        setUser((prev) => ({ ...(prev || {}), profileImage: previewUrl }));
        try {
          const cached = authUser || (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; } })();
          if (cached) {
            const updated = { ...cached, profileImage: previewUrl };
            try { localStorage.setItem('user', JSON.stringify(updated)); } catch (e) {}
            try { localStorage.setItem('loggedInUser', JSON.stringify(updated)); } catch (e) {}
            try { if (setAuthUser) setAuthUser(updated); } catch (e) {}
          }
        } catch (e) {}
        try { toast.success('Profile image updated successfully.'); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('profile:updated', { detail: { profileImage: previewUrl } })); } catch (e) {}
      }
    } catch (err) {
      console.error('Save profile changes failed:', err);
      try { toast.error(err?.message || 'Failed to upload profile image'); } catch (e) {}
    } finally {
      setUploading(false);
    }
  };

  // Verify current password with backend (debounced on input)
  const verifyCurrentPassword = (pwd) => {
    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    // reset state
    setIsPasswordVerified(false);
    setPasswordError('');
    if (!pwd || pwd.length === 0) return;
    setVerifyingPassword(true);
    verifyTimerRef.current = setTimeout(async () => {
      try {
        await backendEmployeeService.verifyCurrentPassword(pwd);
        setIsPasswordVerified(true);
        setPasswordError('');
      } catch (err) {
        setIsPasswordVerified(false);
        setPasswordError('Incorrect current password');
      } finally {
        setVerifyingPassword(false);
      }
    }, 500); // 500ms debounce
  };

  const handleCurrentPasswordChange = (e) => {
    const v = e.target.value;
    setCurrentPassword(v);
    // reset new/confirm on change
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordVerified(false);
    setPasswordError('');
    verifyCurrentPassword(v);
  };

  const canSaveNewPassword = () => {
    return isPasswordVerified && newPassword.length >= 8 && newPassword === confirmPassword;
  };

  const handleClearPasswords = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordVerified(false);
    setPasswordError('');
  };

  const handleSaveNewPassword = async () => {
    if (!canSaveNewPassword()) return;
    try {
      // Use explicit change-password endpoint which expects current + new password
      await backendEmployeeService.changePassword(currentPassword, newPassword);
      // Reset fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordVerified(false);
      setPasswordError('');
      // Show success toast
      toast.success('Password changed successfully.');
    } catch (err) {
      // Try to extract a readable message from backend validation responses
      let msg = err?.message || 'Failed to update password';
      try {
        // Some backends return a JSON object like { field: ["message"] }
        const parsed = JSON.parse(msg);
        if (parsed && typeof parsed === 'object') {
          const firstKey = Object.keys(parsed)[0];
          const firstVal = parsed[firstKey];
          if (Array.isArray(firstVal) && firstVal.length > 0) {
            msg = firstVal[0];
          } else if (typeof firstVal === 'string') {
            msg = firstVal;
          } else {
            msg = JSON.stringify(parsed);
          }
        }
      } catch (e) {
        // not JSON — leave msg as-is
      }
      setPasswordError(msg);
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <main className={styles.manageProfilePage}>
        <div className={styles.manageProfileContainer}>
          <h1>Manage Profile</h1>
          <div className={styles.profileContent}>
            <div className={styles.profileLeft}>
              <div className={styles.profileCard}>
                <Skeleton width="120px" height="120px" borderRadius="50%" />
                <Skeleton width="200px" height="20px" style={{ marginTop: '12px' }} />
              </div>
            </div>
            <div className={styles.profileRight}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ marginBottom: '24px' }}>
                  <Skeleton width="150px" height="18px" />
                  {[1, 2].map(j => (
                    <Skeleton key={j} width="100%" height="36px" style={{ marginTop: '8px' }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className={styles.manageProfilePage}>
        <div className={styles.manageProfileContainer}>
          <h1>Manage Profile</h1>

          <div className={styles.profileContent}>
            <div className={styles.profileLeft}>
              <div className={styles.profileCard}>
                <div className={styles.profileImageSection}>
                  <div className={styles.profileImageContainer}>
                    <img
                      src={previewUrl || user?.profileImage || user?.profile_picture || 'https://i.pinimg.com/736x/8b/16/7a/8b167af653c2399dd93b952a48740620.jpg'}
                      alt="Profile"
                      className={styles.profileImage}
                    />
                  </div>
                  <input
                    type="file"
                    id="profile-image-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      handleFileSelect(f);
                    }}
                  />
                  <label htmlFor="profile-image-input" className={styles.changeImageBtn}>
                    {selectedFile ? 'Change Photo (selected)' : 'Change Photo'}
                  </label>
                </div>

                <div className={styles.profileInfo}>
                  <h3>
                    {user?.firstName || user?.first_name} {user?.lastName || user?.last_name}
                  </h3>
                  <div className={styles.profileDetails}>
                    <p>
                      <strong>Position:</strong>
                    </p>
                    <p>{user?.position || user?.role || 'Not specified'}</p>
                    <p>
                      <strong>Department:</strong>
                    </p>
                    <p>{user?.department || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.profileRight}>
              <form>
                {/* Personal Information (restored fields) */}
                <div className={styles.profileSettingsCard}>
                  <h2>Personal Information</h2>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Last Name</label>
                      <input type="text" value={user?.lastName || user?.last_name || ''} readOnly />
                    </div>

                    <div className={styles.formGroup}>
                      <label>First Name</label>
                      <input type="text" value={user?.firstName || user?.first_name || ''} readOnly />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Middle Name</label>
                      <input type="text" value={user?.middleName || user?.middle_name || ''} readOnly />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Suffix</label>
                      <input type="text" value={user?.suffix || ''} readOnly />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Company ID</label>
                      <input type="text" value={user?.companyId || user?.company_id || ''} readOnly />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Department</label>
                      <input type="text" value={user?.department || ''} readOnly />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Role</label>
                      <input type="text" value={user?.role || ''} readOnly />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Email</label>
                      <input type="email" value={user?.email || ''} readOnly />
                    </div>

                    {/* Upload Profile Picture input removed from Personal Information per request */}
                  </div>

                  <button className={`${styles.changeImageBtn} ${styles.alignRight}`} type="button" onClick={handleSaveChanges} disabled={uploading}>{uploading ? 'Saving...' : 'Save Changes'}</button>
                </div>

                {/* Security Section (restored) */}
                <div className={styles.authenticationCard}>
                  <h2>Security</h2>

                  <div className={styles.formGroup}>
                    <label>
                      <span>Current Password</span>
                      <span className={styles.pwIndicatorWrapper} aria-hidden="true">
                        <span className={`${styles.pwIndicator} ${verifyingPassword ? styles.loading : isPasswordVerified ? styles.success : passwordError ? styles.error : ''}`}></span>
                      </span>
                    </label>
                    <input type="password" value={currentPassword} onChange={handleCurrentPasswordChange} placeholder="Enter current password" />
                  </div>

                  <div className={styles.formGroup}>
                    <label>New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={!isPasswordVerified} placeholder={isPasswordVerified ? 'Enter new password' : ''} />
                    {/* Validation message for new password */}
                    {/* Show error only when user starts typing; no positive message */}
                    {newPassword.length > 0 && (() => {
                      const msg = getPasswordErrorMessage(newPassword);
                      return msg ? <small style={{ color: 'red' }}>{msg}</small> : null;
                    })()}
                  </div>

                  <div className={styles.formGroup}>
                    <label>Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={!isPasswordVerified} placeholder={isPasswordVerified ? 'Confirm new password' : ''} />
                    {confirmPassword && confirmPassword !== newPassword && <small style={{ color: 'red' }}>Password did not match.</small>}
                  </div>

                  <div className={styles.buttonRow}>
                    <button type="button" className={styles.clearBtn} onClick={handleClearPasswords}>Clear</button>
                    <button className={`${styles.changeImageBtn}`} type="button" disabled={!canSaveNewPassword()} onClick={handleSaveNewPassword}>Save New Password</button>
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
