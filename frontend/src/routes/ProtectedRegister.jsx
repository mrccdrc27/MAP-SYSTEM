import { useSearchParams, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import UserRegistration from '../pages/auth/UserRegistration';

const ProtectedRegister = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isValid, setIsValid] = useState(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const baseUrl = import.meta.env.VITE_USER_SERVER_API;
        const res = await axios.get(`${baseUrl}/registration/validate-token/?token=${token}`);
        if (res.data.valid) {
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch (err) {
        setIsValid(false);
      }
    };

    if (token) checkToken();
    else setIsValid(false);
  }, [token]);

  if (isValid === null) return <p>Validating token...</p>;
  if (!isValid) return <Navigate to="/unauthorized" />;

  return <UserRegistration token={token} />;
};

export default ProtectedRegister;
