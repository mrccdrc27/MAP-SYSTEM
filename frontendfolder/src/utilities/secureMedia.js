/**
 * Utility functions for handling secure media URLs with authentication
 */

/**
 * Generate a secure media URL with authentication token
 * @param {string} filePath - The file path from the media folder (e.g., 'employee_images/profile.jpg')
 * @param {string} token - The JWT access token
 * @returns {string} - The secure media URL with token
 */
export function generateSecureMediaUrl(filePath, token) {
  if (!filePath || !token) {
    return null;
  }

  const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || 'http://localhost:8000/media/';
  
  // Remove leading slash if present
  const cleanFilePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  // Construct the URL with token parameter
  const baseUrl = `${MEDIA_URL}${cleanFilePath}`;
  const urlWithToken = `${baseUrl}?token=${encodeURIComponent(token)}`;
  
  return urlWithToken;
}

/**
 * Get the current access token from localStorage
 * @returns {string|null} - The access token or null if not found
 */
export function getAccessToken() {
  // Try different token storage keys used in the app
  const employeeToken = localStorage.getItem('employee_access_token');
  const adminToken = localStorage.getItem('admin_access_token');
  const generalToken = localStorage.getItem('access_token');
  
  return employeeToken || adminToken || generalToken;
}

/**
 * Generate a secure media URL using the current user's token
 * @param {string} filePath - The file path from the media folder
 * @returns {string|null} - The secure media URL or null if no token
 */
export function getSecureMediaUrl(filePath) {
  const token = getAccessToken();
  return generateSecureMediaUrl(filePath, token);
}

/**
 * Extract file path from a full media URL
 * @param {string} fullUrl - The full media URL
 * @returns {string|null} - The relative file path or null
 */
export function extractFilePathFromUrl(fullUrl) {
  if (!fullUrl) return null;
  
  const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || 'http://localhost:8000/media/';
  
  if (fullUrl.startsWith(MEDIA_URL)) {
    const filePath = fullUrl.replace(MEDIA_URL, '');
    // Remove query parameters if present
    return filePath.split('?')[0];
  }
  
  // Handle cases where the URL might already be a relative path
  if (!fullUrl.startsWith('http')) {
    return fullUrl.split('?')[0];
  }
  
  return null;
}

/**
 * Convert an existing media URL to a secure one
 * @param {string} existingUrl - The existing media URL (with or without token)
 * @returns {string|null} - The secure media URL or null
 */
export function convertToSecureUrl(existingUrl) {
  if (!existingUrl) return null;
  
  // If the URL already starts with http://localhost:8000/api/media/, use it as-is
  if (existingUrl.startsWith('http://localhost:8000/api/media/') || 
      existingUrl.startsWith('http://localhost:8003/api/media/') ||
      existingUrl.startsWith('https://') && existingUrl.includes('/api/media/')) {
    return existingUrl;
  }
  
  // If it starts with /api/media/, prepend the base URL
  if (existingUrl.startsWith('/api/media/')) {
    const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';
    return `${BASE_URL}${existingUrl}`;
  }
  
  // Otherwise, use the old logic for backward compatibility
  const filePath = extractFilePathFromUrl(existingUrl);
  if (!filePath) return null;
  // If filePath includes a leading 'media/' segment (or '/media/'), strip it
  const normalized = filePath.replace(/^\/?media\//, '');
  return getSecureMediaUrl(normalized);
}

/**
 * Create an authenticated fetch request for downloading files
 * @param {string} url - The file URL to download
 * @param {string} filename - Optional filename for download
 * @returns {Promise} - Promise that resolves with the download
 */
export async function downloadSecureFile(url, filename) {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    
    return blob;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Fetch a secure file as a Blob without triggering an automatic download.
 * Returns an object { blob, contentType }
 */
export async function fetchSecureBlob(url) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const contentType = response.headers.get('Content-Type') || blob.type || '';
    return { blob, contentType };
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * Check if a URL is already secure (has token parameter)
 * @param {string} url - The URL to check
 * @returns {boolean} - True if the URL has a token parameter
 */
export function isSecureUrl(url) {
  if (!url) return false;
  return url.includes('token=');
}

/**
 * Refresh the token in a media URL with a new token
 * @param {string} url - The existing media URL
 * @param {string} newToken - The new token to use
 * @returns {string|null} - The URL with updated token
 */
export function refreshTokenInUrl(url, newToken) {
  if (!url || !newToken) return null;
  
  // Remove existing token parameter
  const urlWithoutToken = url.split('?')[0];
  
  // Add new token
  return `${urlWithoutToken}?token=${encodeURIComponent(newToken)}`;
}
