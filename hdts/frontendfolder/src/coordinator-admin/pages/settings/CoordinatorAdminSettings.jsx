import EmployeeSettings from '../../../employee/pages/settings/EmployeeSettings';
import { useAuth } from '../../../context/AuthContext';

// Wrap EmployeeSettings so admin can pass the authenticated user id as the
// editing target. This ensures uploads/updates performed on /admin/settings
// are treated as the admin's own profile and don't accidentally overwrite
// other users' cached `loggedInUser` data.
export default function CoordinatorAdminSettings() {
	const { user: current } = useAuth();
	const currentId = current?.id || current?.companyId || current?.company_id || null;
	return <EmployeeSettings editingUserId={currentId} />;
}
