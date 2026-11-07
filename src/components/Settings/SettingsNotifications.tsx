import { Typography, Switch, Divider, Box } from '@mui/material';
import {
  Email as EmailIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as AlertIcon,
  SystemUpdate as SystemIcon,
  Assessment as ReportIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import type { TFunction } from 'i18next';
import { colors } from '../../theme/colors';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderAlerts: boolean;
  systemUpdates: boolean;
  weeklyReport: boolean;
}

interface SettingsNotificationsProps {
  notifications: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
  loginNotifications: boolean;
  onLoginNotificationChange: (v: boolean) => void;
  t: TFunction;
}

interface ToggleRow {
  key: keyof NotificationSettings;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

export function SettingsNotifications({ notifications, onChange, loginNotifications, onLoginNotificationChange, t }: SettingsNotificationsProps) {
  const handleChange = (field: keyof NotificationSettings) => () => {
    onChange({ ...notifications, [field]: !notifications[field] });
  };

  const emailToggles: ToggleRow[] = [
    { key: 'emailNotifications', label: t('settings.notification.enableEmail'), desc: t('settings.notification.emailNotification'), icon: <EmailIcon /> },
    { key: 'pushNotifications', label: t('settings.notification.enablePush'), desc: t('settings.notification.pushDescription') || 'Receive push notifications', icon: <NotificationsIcon /> },
  ];

  const alertToggles: ToggleRow[] = [
    { key: 'orderAlerts', label: t('settings.notification.securityReminder'), desc: t('settings.notification.securityDescription'), icon: <AlertIcon /> },
    { key: 'systemUpdates', label: t('settings.notification.systemUpdate'), desc: t('settings.notification.systemDescription') || 'System update notifications', icon: <SystemIcon /> },
    { key: 'weeklyReport', label: t('settings.notification.weeklyReport'), desc: t('settings.notification.reportDescription') || 'Weekly summary report', icon: <ReportIcon /> },
  ];

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <EmailIcon sx={{ color: colors.primary.main }} />
        <Typography variant="subtitle1" fontWeight="bold">
          {t('settings.notification.emailNotification')}
        </Typography>
      </Box>
      {emailToggles.map((row) => (
        <Box
          key={row.key}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            py: 1.5, px: 2,
            bgcolor: 'action.hover', borderRadius: 1.5,
            '&:not(:last-child)': { mb: 1 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ color: 'text.secondary' }}>{row.icon}</Box>
            <Box>
              <Typography variant="body2" fontWeight={500}>{row.label}</Typography>
              <Typography variant="caption" color="text.secondary">{row.desc}</Typography>
            </Box>
          </Box>
          <Switch checked={notifications[row.key]} onChange={handleChange(row.key)} />
        </Box>
      ))}

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <AlertIcon sx={{ color: colors.primary.main }} />
        <Typography variant="subtitle1" fontWeight="bold">
          {t('common.info')}
        </Typography>
      </Box>
      {alertToggles.map((row) => (
        <Box
          key={row.key}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            py: 1.5, px: 2,
            bgcolor: 'action.hover', borderRadius: 1.5,
            '&:not(:last-child)': { mb: 1 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ color: 'text.secondary' }}>{row.icon}</Box>
            <Box>
              <Typography variant="body2" fontWeight={500}>{row.label}</Typography>
              <Typography variant="caption" color="text.secondary">{row.desc}</Typography>
            </Box>
          </Box>
          <Switch checked={notifications[row.key]} onChange={handleChange(row.key)} />
        </Box>
      ))}

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <LoginIcon sx={{ color: colors.primary.main }} />
        <Typography variant="subtitle1" fontWeight="bold">
          {t('settings.security.loginNotification') || 'Login Notification'}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          py: 1.5, px: 2,
          bgcolor: 'action.hover', borderRadius: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ color: 'text.secondary' }}><LoginIcon /></Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>{t('settings.security.loginNotification')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('settings.security.loginNotifDesc') || 'Get notified on new login activity'}
            </Typography>
          </Box>
        </Box>
        <Switch checked={loginNotifications} onChange={() => onLoginNotificationChange(!loginNotifications)} />
      </Box>
    </Box>
  );
}
