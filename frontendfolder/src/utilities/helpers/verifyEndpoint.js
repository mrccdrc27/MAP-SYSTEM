/**
 * Verify endpoint is reachable with a quick HEAD request
 * @param {string} url - The URL to verify
 * @param {number} timeout - Timeout in ms (default: 3000)
 * @returns {Promise<boolean>} - True if endpoint is reachable, false otherwise
 */
export const verifyEndpoint = async (url, timeout = 3000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      credentials: 'include',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    // Only accept successful responses (200-299)
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    return false;
  }
};

/**
 * Navigate to endpoint after verifying it's reachable
 * @param {string} url - The full URL to navigate to
 * @param {Function} onClose - Optional callback to close menus before navigation
 */
export const navigateToVerifiedEndpoint = async (url, onClose = null) => {
  try {
    if (onClose) onClose();
    
    const isReachable = await verifyEndpoint(url);
    
    if (isReachable) {
      setTimeout(() => {
        window.location.href = url;
      }, 0);
    } else {
      console.warn('Endpoint not reachable:', url);
      alert('Unable to reach profile settings. Please try again.');
    }
  } catch (error) {
    console.error('Navigation error:', error);
    alert('An error occurred. Please try again.');
  }
};
