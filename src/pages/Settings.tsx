import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useAuth } from '../services/api';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Alert,
  Avatar,
} from '@mui/material';
import { Save as SaveIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { colors } from '../theme/colors';
import { notificationApi2, rbacApi } from '../services/api';
import type { NotificationChannel } from '../services/api';
import { SettingsEmailTemplates } from '../components/Settings/SettingsEmailTemplates';
import { SettingsNotificationPipeline } from '../components/Settings/SettingsNotificationPipeline';
import { DEFAULT_SITE_NAME, resolveSiteName } from '../utils/siteName';
import {
  SettingsGeneral,
  SettingsNotifications,
  SettingsSecurity,
  SettingsChannels,
  SettingsChannelDialog,
} from '../components/Settings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <>{children}</>}
    </div>
  );
}

export function Settings() {
  const { t, i18n: i18nInstance } = useTranslation();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [saved, setSaved] = useState(false);

  // General settings state — 优先从 localStorage 恢复，首次自动填充示范值
  const [general, setGeneral] = useState(() => {
    const defaults = {
      siteName: DEFAULT_SITE_NAME,
      siteUrl: 'https://example.com',
      contactEmail: 'admin@example.com',
      timezone: 'Asia/Shanghai',
      language: i18nInstance.language || 'zh-CN',
    };
    try {
      const saved = localStorage.getItem('beilo_general_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return { ...defaults, ...settings, siteName: resolveSiteName(settings.siteName) };
      }
      localStorage.setItem('beilo_general_settings', JSON.stringify(defaults));
    } catch { /* ignore */ }
    return defaults;
  });

  // Notification settings state
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    orderAlerts: true,
    systemUpdates: false,
    weeklyReport: true,
  });

  // Security settings state
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorAuth: false,
    loginNotifications: true,
  });

  // Notification channels state
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [testingChannel, setTestingChannel] = useState('');
  const [channelNotice, setChannelNotice] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [channelError, setChannelError] = useState('');

  const loadNotificationData = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const channelsData = await notificationApi2.getChannels();
      setChannels(channelsData);
    } catch (err) {
      console.error('Failed to load notification data:', err);
      setChannelError(err instanceof Error ? err.message : t('notificationPipeline.loadFailed'));
    } finally {
      setLoadingChannels(false);
    }
  }, [t]);

  // Load notification data when tab 3 is active
  useEffect(() => {
    if (tabValue === 3) {
      loadNotificationData();
    }
  }, [tabValue, loadNotificationData]);

  // 同步 general 到 localStorage + 实时标题
  useEffect(() => {
    localStorage.setItem('beilo_general_settings', JSON.stringify(general));
    document.title = resolveSiteName(general.siteName);
  }, [general]);

  // Load user settings on mount
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await rbacApi.getUserSettings();
        // 通知和安全从 API 加载，常规以 localStorage 为准
        setNotifications({
          emailNotifications: settings.emailNotifications,
          pushNotifications: settings.pushNotifications,
          orderAlerts: settings.orderAlerts,
          systemUpdates: settings.systemUpdates,
          weeklyReport: settings.weeklyReport,
        });
        setSecurity((prev) => ({ ...prev, loginNotifications: settings.loginNotifications }));
      } catch (err) {
        console.error('Failed to load user settings:', err);
      }
    };
    loadUserSettings();
  }, []);

  const handleSave = async () => {
    try {
      await rbacApi.updateUserSettings({
        siteName: general.siteName,
        siteUrl: general.siteUrl,
        contactEmail: general.contactEmail,
        timezone: general.timezone,
        language: general.language,
        emailNotifications: notifications.emailNotifications,
        pushNotifications: notifications.pushNotifications,
        orderAlerts: notifications.orderAlerts,
        systemUpdates: notifications.systemUpdates,
        weeklyReport: notifications.weeklyReport,
        loginNotifications: security.loginNotifications,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleOpenChannelDialog = (channel?: NotificationChannel) => {
    setEditingChannel(channel || null);
    setChannelError('');
    setChannelDialogOpen(true);
  };

  const handleSaveChannel = async (formData: {
    name: string;
    type: NotificationChannel['type'];
    config: Record<string, unknown>;
    isDefault: boolean;
    isActive: boolean;
  }) => {
    setChannelError('');
    try {
      if (editingChannel) {
        await notificationApi2.updateChannel(editingChannel.id, formData);
      } else {
        await notificationApi2.createChannel(formData as Parameters<typeof notificationApi2.createChannel>[0]);
      }
      await loadNotificationData();
      setChannelDialogOpen(false);
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : 'Failed to save channel');
    }
  };

  const handleTestChannel = async (id: string) => {
    setTestingChannel(id); setChannelError(''); setChannelNotice('');
    try { await notificationApi2.testChannel(id); setChannelNotice(t('notificationPipeline.queued')); }
    catch (err) { console.error('Notification test failed:', err); setChannelError(err instanceof Error ? err.message : 'Test failed'); }
    finally { setTestingChannel(''); }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;
    try {
      await notificationApi2.deleteChannel(id);
      await loadNotificationData();
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{ bgcolor: colors.primary.main + '15' }}>
            <SettingsIcon sx={{ color: colors.primary.main }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">{t('settings.title')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('settings.subtitle')}</Typography>
          </Box>
        </Box>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t('common.success')}
        </Alert>
      )}

      {/* Tabs Card */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label={t('settings.tabs.general')} />
          <Tab label={t('settings.tabs.notification')} />
          <Tab label={t('settings.tabs.security')} />
          <Tab label={t('settings.tabs.channels') || '通知渠道'} />
          <Tab label={t('emailTemplates.title')} />
        </Tabs>

        <CardContent sx={{ p: { xs: 2, sm: 4 }, '&:last-child': { pb: { xs: 2, sm: 4 } } }}>
          {/* General Settings */}
          <TabPanel value={tabValue} index={0}>
            <SettingsGeneral
              general={general}
              onChange={(g) => {
                setGeneral(g);
                if (g.language !== general.language) {
                  i18n.changeLanguage(g.language);
                }
              }}
              t={t}
            />
          </TabPanel>

          {/* Notification Settings */}
          <TabPanel value={tabValue} index={1}>
            <SettingsNotifications
              notifications={notifications}
              onChange={setNotifications}
              loginNotifications={security.loginNotifications}
              onLoginNotificationChange={(v) => setSecurity((prev) => ({ ...prev, loginNotifications: v }))}
              t={t}
            />
          </TabPanel>

          {/* Security Settings */}
          <TabPanel value={tabValue} index={2}>
            <SettingsSecurity
              security={security}
              onSecurityChange={setSecurity}
              user={user}
              t={t}
            />
          </TabPanel>

          {/* Notification Channels */}
          <TabPanel value={tabValue} index={3}>
            {channelNotice && <Alert severity="info" sx={{ mb: 2 }}>{channelNotice}</Alert>}
            <SettingsChannels
              t={t}
              onTestChannel={handleTestChannel}
              testingChannel={testingChannel}
              channels={channels}
              loadingChannels={loadingChannels}
              channelError={channelError}
              onOpenChannelDialog={handleOpenChannelDialog}
              onDeleteChannel={handleDeleteChannel}
            />
            <SettingsNotificationPipeline channels={channels} />
          </TabPanel>
          <TabPanel value={tabValue} index={4}><SettingsEmailTemplates /></TabPanel>
        </CardContent>
      </Card>

      {/* Save Button */}
      {tabValue !== 4 && <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
          {t('settings.buttons.save')}
        </Button>
      </Box>}

      {/* Channel Dialog */}
      <SettingsChannelDialog
        onPersisted={loadNotificationData}
        key={`${editingChannel?.id ?? 'new'}-${channelDialogOpen}`}
        error={channelError}
        open={channelDialogOpen}
        channel={editingChannel}
        onClose={() => setChannelDialogOpen(false)}
        onSave={handleSaveChannel}
        t={t}
      />
    </Box>
  );
}

export default Settings;
