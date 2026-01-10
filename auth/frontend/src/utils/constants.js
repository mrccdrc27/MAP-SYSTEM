// User type constants
export const USER_TYPES = {
  STAFF: 'staff',
  EMPLOYEE: 'employee',
};

// System URL configurations - environment-based
export const SYSTEM_URLS = {
  TTS: import.meta.env.VITE_TTS_SYSTEM_URL || 'http://localhost:1000',
  AMS: import.meta.env.VITE_AMS_SYSTEM_URL || 'http://localhost:3000/ams',
  HDTS: import.meta.env.VITE_HDTS_SYSTEM_URL || 'http://localhost:5173/hdts',
  BMS: import.meta.env.VITE_BMS_SYSTEM_URL || 'http://localhost:3000/bms',
};

// System metadata for display
export const SYSTEM_INFO = {
  TTS: {
    name: 'Ticket Tracking System',
    slug: 'tts',
    icon: 'fa-ticket',
    description: 'Track and manage support tickets across departments.',
    url: SYSTEM_URLS.TTS,
  },
  AMS: {
    name: 'Asset Management System',
    slug: 'ams',
    icon: 'fa-boxes-stacked',
    description: 'Manage organizational assets and inventory.',
    url: SYSTEM_URLS.AMS,
  },
  HDTS: {
    name: 'Helpdesk Ticketing System',
    slug: 'hdts',
    icon: 'fa-headset',
    description: 'Submit and track helpdesk requests.',
    url: SYSTEM_URLS.HDTS,
  },
  BMS: {
    name: 'Budget Management System',
    slug: 'bms',
    icon: 'fa-coins',
    description: 'Manage budgets and financial tracking.',
    url: SYSTEM_URLS.BMS,
  },
};

// Get system URL by slug
export const getSystemUrl = (slug) => {
  const upperSlug = slug?.toUpperCase();
  return SYSTEM_URLS[upperSlug] || SYSTEM_INFO[upperSlug]?.url || null;
};
