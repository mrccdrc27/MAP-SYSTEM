// bms/frontend/src/utils/profileUtils.js

/**
 * Get user's profile picture with intelligent fallback chain:
 * 1. Check JWT token for profile_picture field (future-ready)
 * 2. Check user object for profile_picture (legacy BMS)
 * 3. Fall back to default avatar
 */
export const getProfilePicture = (user) => {
  if (!user) return getDefaultAvatar();
  
  // Priority 1: JWT token might have profile_picture_url (future)
  if (user.profile_picture_url) {
    return user.profile_picture_url;
  }
  
  // Priority 2: JWT token might have profile_picture (current/future)
  if (user.profile_picture) {
    return user.profile_picture;
  }
  
  // Priority 3: JWT token might have avatar (alternative naming)
  if (user.avatar) {
    return user.avatar;
  }
  
  // Priority 4: Legacy BMS field
  if (user.profile_image) {
    return user.profile_image;
  }
  
  // Final fallback: Default avatar
  return getDefaultAvatar();
};

/**
 * Get default avatar based on user's name initials or role
 * This creates a consistent experience even without uploaded photos
 */
export const getDefaultAvatar = (user = null) => {
  // Default professional avatar
  const defaultUrl = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";
  
  // Future: Could generate avatar based on initials using a service
  // if (user?.first_name && user?.last_name) {
  //   return `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&size=256`;
  // }
  
  return defaultUrl;
};

/**
 * Check if profile picture is a valid URL
 */
export const isValidProfilePicture = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

/**
 * Get full user display info including profile picture
 * Centralizes all user display logic
 */
export const getUserDisplayInfo = (user) => {
  if (!user) {
    return {
      name: 'User',
      avatar: getDefaultAvatar(),
      initials: 'U',
    };
  }
  
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const fullName = user.full_name || `${firstName} ${lastName}`.trim();
  const displayName = fullName || user.username || user.email || 'User';
  
  // Get initials for fallback avatar generation
  const initials = getInitials(displayName);
  
  return {
    name: displayName,
    avatar: getProfilePicture(user),
    initials: initials,
    firstName: firstName,
    lastName: lastName,
  };
};

/**
 * Extract initials from name
 */
const getInitials = (name) => {
  if (!name) return 'U';
  
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};