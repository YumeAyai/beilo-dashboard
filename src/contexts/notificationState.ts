import { createContext } from 'react';
import type { NotificationItem } from '../services/api';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
