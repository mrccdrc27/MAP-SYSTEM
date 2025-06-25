export const useAuthFetch = () => {
    const token = localStorage.getItem('accessToken');
  
    const authFetch = (url, options = {}) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    };
  
    return authFetch;
  };
  