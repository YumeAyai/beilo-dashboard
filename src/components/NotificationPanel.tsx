import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Button,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'threat' | 'system' | 'info';
  timestamp: string;
  read: boolean;
}

interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export function NotificationPanel({
  anchorEl,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}: NotificationPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const open = Boolean(anchorEl);

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'threat':
        return <ErrorIcon sx={{ color: isDark ? colors.error.dark : colors.error.light }} />;
      case 'system':
        return <CheckCircleIcon sx={{ color: isDark ? colors.warning.dark : colors.warning.light }} />;
      case 'info':
      default:
        return <InfoIcon sx={{ color: isDark ? colors.info.dark : colors.info.light }} />;
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return t('common.justNow');
      if (diffMins < 60) return t('common.minutesAgo', { count: diffMins });
      if (diffHours < 24) return t('common.hoursAgo', { count: diffHours });
      if (diffDays < 7) return t('common.daysAgo', { count: diffDays });
      return date.toLocaleDateString();
    } catch {
      return timestamp;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 48,
        right: 0,
        width: 360,
        height: 'calc(100vh - 48px)',
        bgcolor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        zIndex: theme.zIndex.drawer + 2,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.2s ease-in-out, background-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isDark ? '-4px 0 16px rgba(0,0,0,0.3)' : '-4px 0 16px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {t('layout.notification.title')}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Actions */}
      {notifications.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            px: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button size="small" onClick={onMarkAllAsRead} disabled={unreadCount === 0}>
            {t('layout.notification.markAllRead')}
          </Button>
          <Button size="small" color="error" onClick={onClearAll}>
            {t('layout.notification.clearAll')}
          </Button>
        </Box>
      )}

      {/* Notification List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {notifications.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              color: 'text.secondary',
            }}
          >
            <InfoIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">{t('layout.notification.empty')}</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((notification, index) => (
              <Box key={notification.id}>
                <ListItem
                  sx={{
                    bgcolor: notification.read
                      ? 'transparent'
                      : isDark
                      ? 'rgba(24, 160, 251, 0.08)'
                      : 'rgba(24, 160, 251, 0.04)',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    },
                    pr: 6,
                  }}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <Box sx={{ mr: 1.5, mt: 0.5 }}>{getNotificationIcon(notification.type)}</Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          fontWeight={notification.read ? 'normal' : 'bold'}
                          sx={{ flex: 1 }}
                        >
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: colors.primary.main,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 280,
                          }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {formatTime(notification.timestamp)}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}

export default NotificationPanel;
