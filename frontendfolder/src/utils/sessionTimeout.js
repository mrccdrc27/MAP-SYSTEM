/**
 * Inactivity timeout utility (framework-agnostic)
 *
 * This handles INACTIVITY ONLY - it does NOT manage access/refresh token expiry.
 * The backend token refresh logic runs separately.
 *
 * Usage:
 * const session = createSessionTimeout({
 *   timeoutMinutes: 10 / 60, // 10 seconds for testing
 *   onTimeout: () => { (dispatch auth:expired event) }
 * });
 *
 * // Start when user logs in
 * session.start();
 *
 * // Stop when user logs out manually
 * session.stop();
 *
 * The module resets the timer on user input (mousemove, keydown, click, touchstart).
 * If no activity for the timeout period, it clears tokens and dispatches 'auth:expired'.
 */

function noop() {}

function defaultClearStorage(keys = []) {
  try {
    keys.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
      try { sessionStorage.removeItem(k); } catch (e) {}
    });
  } catch (e) {
    // ignore storage errors
  }
}

export default function createSessionTimeout(options = {}) {
  const {
    // Default: 30 minutes inactivity timeout
    timeoutMinutes = 30,
    storageKeys = [
      'admin_access_token', 'employee_access_token', 'access_token', 'token',
      'admin_refresh_token', 'employee_refresh_token', 'refresh_token',
      'user', 'loggedInUser'
    ],
    onTimeout = null, // function(runInfo) called when timeout happens
    onClear = null, // optional hook after clearing storage
    warningMinutes = 0, // optional: minutes before expiry to call onWarn (not implemented UI)
    autoStart = false,
    events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll', 'wheel'],
    throttleMs = 1000 // throttle reset calls to avoid tight loops
  } = options;  const timeoutMs = Math.max(1000, timeoutMinutes * 60 * 1000);

  let timeoutId = null;
  let lastActivity = Date.now();
  let running = false;
  let lastResetCall = 0;

  function handleTimeout() {
    running = false;
    timeoutId = null;

    const message = 'Your session has expired due to inactivity. Please log in again.';

    // Debug log to verify handler was invoked
    try {
      // eslint-disable-next-line no-console
      console.log('[sessionTimeout] INACTIVITY TIMEOUT - user was inactive for', timeoutMinutes * 60, 'seconds');
      console.log('[sessionTimeout] Clearing storage and dispatching auth:expired event');
    } catch (e) {}

    // Clear tokens/session data
    defaultClearStorage(storageKeys);
    if (typeof onClear === 'function') {
      try { onClear(); } catch (e) { /* swallow */ }
    }

    // Signal app-wide auth expiration so `AuthExpiredModal` can show
    try {
      window.dispatchEvent(new CustomEvent('auth:expired', { 
        detail: { reason: 'inactivity', timestamp: new Date().toISOString() } 
      }));
    } catch (e) {
      // fallback: do nothing
    }

    // Call optional callback for additional app-level handling
    if (typeof onTimeout === 'function') {
      try { onTimeout({ message, timestamp: new Date().toISOString() }); } catch (e) { /* swallow */ }
    }

    removeEventListeners();
  }

  function scheduleTimeout() {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(handleTimeout, timeoutMs);
  }

  function resetTimer() {
    const now = Date.now();
    // throttle resets to at most once per throttleMs
    if (now - lastResetCall < throttleMs) return;
    lastResetCall = now;
    lastActivity = now;
    if (running) {
      scheduleTimeout();
    }
  }

  function eventHandler(e) {
    resetTimer();
  }

  function addEventListeners() {
    try {
      events.forEach(ev => window.addEventListener(ev, eventHandler, { passive: true }));
      // Visibility change: consider user coming back to tab as activity
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') resetTimer();
      });
    } catch (e) {
      // ignore
    }
  }

  function removeEventListeners() {
    try {
      events.forEach(ev => window.removeEventListener(ev, eventHandler, { passive: true }));
      window.removeEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') resetTimer();
      });
    } catch (e) {
      // ignore
    }
  }

  function start() {
    if (running) return;
    running = true;
    lastActivity = Date.now();
    addEventListeners();
    scheduleTimeout();
  }

  function stop() {
    running = false;
    clearTimeout(timeoutId);
    timeoutId = null;
    removeEventListeners();
  }

  function getRemainingMs() {
    if (!running || !timeoutId) return 0;
    const elapsed = Date.now() - lastActivity;
    return Math.max(0, timeoutMs - elapsed);
  }

  function isRunning() {
    return running;
  }

  // auto start if requested
  if (autoStart) start();

  return {
    start,
    stop,
    reset: resetTimer,
    getRemainingMs,
    isRunning
  };
}

/**
 * Example integration notes (React)
 *
 * - Call `const session = createSessionTimeout({ onTimeout: () => { (show modal & redirect) } })`
 * - After successful login: session.start();
 * - After manual logout: session.stop(); and clear additional app state.
 */
