import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { notificationApi, useAuth, type NotificationItem } from '../services/api';

import { NotificationContext } from './notificationState';

const REFRESH_INTERVAL = 30000; // 30 seconds

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await notificationApi.getNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(message);
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user?.id) return;

    try {
      await notificationApi.markAsRead(id, user.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await notificationApi.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [user?.id]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!user?.id) return;

    try {
      await notificationApi.deleteNotification(id, user.id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, [user?.id]);

  // Initial fetch and polling
  useEffect(() => {
    refresh();

    if (!isAuthenticated) return;

    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh, isAuthenticated]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
