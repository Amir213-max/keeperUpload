'use client';

import { useEffect, useState } from 'react';
import { graphqlClient } from '../lib/graphqlClient';
import { UNREAD_NOTIFICATIONS_QUERY } from '../lib/queries';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import Loader from '../Componants/Loader';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const { unreadNotifications } = await graphqlClient.request(
          UNREAD_NOTIFICATIONS_QUERY,
          { user_id: user.id }
        );
        setNotifications(unreadNotifications || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  if (!user?.id) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <p className="text-gray-500">Please log in to view your notifications.</p>
      </div>
    );
  }

  if (loading) return <Loader />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-black">Notifications</h1>

      {notifications.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No notifications found.</p>
      ) : (
        <ul className="space-y-4">
          {notifications.map((notif) => (
            <Link
              key={notif.id}
              href={`/notifications/${notif.id}`}
              className={`block p-4 border   shadow hover:shadow-lg transition-all duration-200 ${
                !notif.read_at
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-black font-semibold text-lg">
                    {notif.message || notif.type}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>

                {!notif.read_at && (
                  <span className="ml-2 w-3 h-3 bg-red-500   mt-1 animate-pulse" />
                )}
              </div>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
