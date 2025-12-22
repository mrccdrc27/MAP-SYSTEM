import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import CoordinatorAdminNavBar from '../components/header/CoordinatorAdminNavigationBar';
import SharedLayout from '../../shared/layouts/PageLayout';

const CoordinatorAdminLayout = () => {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <SharedLayout Navbar={CoordinatorAdminNavBar}>
      <Outlet />
    </SharedLayout>
  );
};

export default CoordinatorAdminLayout;
