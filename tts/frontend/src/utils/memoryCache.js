// Frontend in-memory cache utility
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  // Generate cache key from URL and parameters
  generateKey(url, params = {}) {
    const paramString = Object.keys(params).length > 0 
      ? JSON.stringify(params) 
      : '';
    return `${url}${paramString}`;
  }

  // Set cache with timestamp
  set(key, data, customDuration = null) {
    const duration = customDuration || this.CACHE_DURATION;
    const cacheItem = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration
    };
    
    this.cache.set(key, cacheItem);
  }

  // Get cache if not expired
  get(key) {
    const cacheItem = this.cache.get(key);
    
    if (!cacheItem) return null;

    // Check if expired
    if (Date.now() > cacheItem.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cacheItem.data;
  }

  // Delete specific cache entry
  delete(key) {
    this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Check if cache exists and is valid
  isValid(key) {
    const cacheItem = this.cache.get(key);
    return cacheItem && Date.now() <= cacheItem.expiry;
  }

  // Get remaining time until expiry (in milliseconds)
  getTimeUntilExpiry(key) {
    const cacheItem = this.cache.get(key);
    if (!cacheItem) return 0;
    return Math.max(0, cacheItem.expiry - Date.now());
  }

  // Get cache statistics
  getStats() {
    const stats = {
      totalItems: this.cache.size,
      validItems: 0,
      expiredItems: 0
    };

    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now <= item.expiry) {
        stats.validItems++;
      } else {
        stats.expiredItems++;
      }
    }

    return stats;
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }
}

// Create a singleton instance
const memoryCache = new MemoryCache();

// Optional: Set up periodic cleanup every minute
setInterval(() => {
  memoryCache.cleanup();
}, 60000); // Clean up expired entries every minute

export default memoryCache;