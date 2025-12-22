import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

// --- Configuration ---

// It's crucial to set withCredentials to true for axios to send cookies.
// This can be set globally for your entire application.
axios.defaults.withCredentials = true;

const API_BASE_URL = import.meta.env.VITE_NOTIFICATION_API || 'http://localhost:8006';

const userEndpoints = {
    my_notifications: {
        all: `${API_BASE_URL}/api/v1/app/my/notifications/`,
        unread: `${API_BASE_URL}/api/v1/app/my/notifications/unread/`,
        read: `${API_BASE_URL}/api/v1/app/my/notifications/read/`,
        mark_all_read: `${API_BASE_URL}/api/v1/app/my/notifications/mark-all-read/`
    },
    my_notification_specific: {
        mark_read: `${API_BASE_URL}/api/v1/app/my/notification/mark-read/`
    }
};


// --- Custom React Hook: useNotifications ---

export const useNotifications = () => {
    const [notifications, setNotifications] = useState({
        all: [],
        unread: [],
        read: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Helper to normalize different API response shapes into an array
    const normalizeResponseToArray = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        // Common paginated shapes
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.data)) return data.data;
        // Fallback: if the response has a single object, wrap it
        return [];
    };

    /**
     * Fetches notifications from a specified endpoint.
     * @param {('all'|'unread'|'read')} type - The type of notifications to fetch.
     */
    const fetchNotifications = useCallback(async (type = 'all') => {
        setLoading(true);
        setError(null);
        try {
            const url = userEndpoints.my_notifications[type];
            if (!url) {
                throw new Error(`Invalid notification type: ${type}`);
            }
            const response = await axios.get(url);
            const items = normalizeResponseToArray(response.data);
            setNotifications(prev => ({
                ...prev,
                [type]: items
            }));
        } catch (err) {
            console.error(`Failed to fetch ${type} notifications:`, err);
            setError(`Could not fetch ${type} notifications. Please try again later.`);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Marks a single notification as read.
     * @param {number|string} notificationId - The ID of the notification to mark as read.
     */
    const markAsRead = useCallback(async (notificationId) => {
        if (!notificationId) return;
        setLoading(true);
        setError(null);
        try {
            await axios.post(userEndpoints.my_notification_specific.mark_read, {
                notification_id: notificationId
            });
            // Refresh notification lists after marking one as read
            await Promise.all([
                fetchNotifications('all'),
                fetchNotifications('unread'),
                fetchNotifications('read')
            ]);
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
            setError('Could not mark notification as read.');
        } finally {
            setLoading(false);
        }
    }, [fetchNotifications]);

    /**
     * Marks all unread notifications as read.
     */
    const markAllAsRead = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Note: This is a POST request, as it changes state on the server.
            await axios.post(userEndpoints.my_notifications.mark_all_read);
            // Refresh notification lists after marking all as read
            await Promise.all([
                fetchNotifications('all'),
                fetchNotifications('unread'),
                fetchNotifications('read')
            ]);
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
            setError('Could not mark all notifications as read.');
        } finally {
            setLoading(false);
        }
    }, [fetchNotifications]);


    return {
        notifications,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    };
};


// --- Example Usage Component ---

// const NotificationCard = ({ notification, onMarkRead }) => (
//     <div className="p-4 mb-3 bg-white border border-gray-200 rounded-lg shadow-sm flex justify-between items-center">
//         <div>
//             <p className="font-semibold text-gray-800">{notification.title || 'Notification'}</p>
//             <p className="text-sm text-gray-600">{notification.message || 'No message content.'}</p>
//         </div>
//         {!notification.is_read && (
//             <button
//                 onClick={() => onMarkRead(notification.id)}
//                 className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
//             >
//                 Mark Read
//             </button>
//         )}
//     </div>
// );


// export default function App() {
//     const {
//         notifications,
//         loading,
//         error,
//         fetchNotifications,
//         markAsRead,
//         markAllAsRead
//     } = useNotifications();
//     const [activeTab, setActiveTab] = useState('unread');

//     useEffect(() => {
//         // Fetch initial data for the active tab
//         fetchNotifications(activeTab);
//     }, [activeTab, fetchNotifications]);

//     const handleTabClick = (tab) => {
//         setActiveTab(tab);
//     }

//     const renderContent = () => {
//         if (loading) {
//             return <div className="text-center p-10">Loading notifications...</div>;
//         }
//         if (error) {
//             return <div className="text-center p-10 text-red-600 bg-red-100 rounded-lg">{error}</div>;
//         }
//         if (notifications[activeTab]?.length === 0) {
//             return <div className="text-center p-10 text-gray-500">No notifications to show.</div>;
//         }
//         return notifications[activeTab]?.map(notif => (
//             <NotificationCard key={notif.id} notification={notif} onMarkRead={markAsRead} />
//         ));
//     };

//     return (
//         <div className="bg-gray-50 min-h-screen font-sans">
//             <div className="container mx-auto p-4 md:p-8 max-w-2xl">
//                 <header className="mb-6">
//                     <h1 className="text-3xl font-bold text-gray-800">My Notifications</h1>
//                     <p className="text-gray-600">Here are your latest updates.</p>
//                 </header>

//                 <div className="bg-white rounded-lg shadow-md p-2 mb-6 flex justify-between items-center">
//                     <div className="flex border-b border-gray-200">
//                         <button onClick={() => handleTabClick('unread')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'unread' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
//                             Unread ({notifications.unread?.length || 0})
//                         </button>
//                         <button onClick={() => handleTabClick('read')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'read' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
//                             Read ({notifications.read?.length || 0})
//                         </button>
//                          <button onClick={() => handleTabClick('all')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
//                             All ({notifications.all?.length || 0})
//                         </button>
//                     </div>
//                      {notifications.unread?.length > 0 && (
//                         <button
//                             onClick={markAllAsRead}
//                             disabled={loading}
//                             className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 transition-colors"
//                         >
//                             Mark All Read
//                         </button>
//                     )}
//                 </div>

//                 <main>
//                     {renderContent()}
//                 </main>
//             </div>
//         </div>
//     );
// }