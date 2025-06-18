import { useEffect, useState } from 'react';
import userService_api from './user_service';

const getRoles = () => {
    const [role, setRoles] = useState([]);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      if (true) {
        userService_api.get(`api/role/`)
          .then(res => {
            setRoles(res.data);
          })
          .catch(err => {
            console.error("Failed to fetch tickets:", err);
            setError(err);
          });
      }
    }, []);
  
    return { role, error };
  };
  
  export default getRoles;
  