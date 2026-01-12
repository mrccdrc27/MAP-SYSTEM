import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AMS_REGISTRATION_URL = 'https://ams-contexts.up.railway.app/categories/hd/registration/';

const AmsContext = createContext({
  categories: [],
  loading: false,
  fetched: false,
  prefetch: () => {},
});

/**
 * Process raw AMS payload to filter out sub-categories with no assets.
 */
const processCategories = (payload) => {
  if (Array.isArray(payload)) {
    return payload.filter(c => {
      const items = c.assets || c.items || c.children || c.assets_list || c.asset_list || c.assetNames || c.assetsNames || [];
      return Array.isArray(items) && items.length > 0;
    });
  }
  if (payload && typeof payload === 'object') {
    const out = {};
    Object.keys(payload).forEach(k => {
      const v = payload[k];
      if (Array.isArray(v) && v.length > 0) out[k] = v;
    });
    return out;
  }
  return [];
};

export function AmsProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const prefetch = useCallback(async () => {
    // If already fetched or currently fetching, skip
    if (fetched || loading) return;

    setLoading(true);
    try {
      const response = await fetch(AMS_REGISTRATION_URL);
      if (response.ok) {
        const data = await response.json();
        setCategories(processCategories(data));
      }
    } catch (err) {
      console.error('Error prefetching AMS categories:', err);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [fetched, loading]);

  return (
    <AmsContext.Provider value={{ categories, loading, fetched, prefetch }}>
      {children}
    </AmsContext.Provider>
  );
}

export function useAms() {
  return useContext(AmsContext);
}

export default AmsContext;
