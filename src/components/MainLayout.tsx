import { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  useTheme,
  Tooltip,
  Badge,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  HistoryOutlined as HistoryIcon,
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Rule as RuleIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Article as ArticleIcon,
  Block as BlockIcon,
  Notifications as NotificationsIcon,
  Shield as ShieldIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  Layers as LayersIcon,
  DnsOutlined as ClusterIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../theme/useThemeContext';
import { colors } from '../theme/colors';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { systemApi } from '../services/api';
import { useTranslation } from 'react-i18next';
import { NotificationPanel } from './NotificationPanel';
import { useAuth } from '../services/api';
import { useNotifications } from '../contexts/useNotifications';
import { HubbleIcon } from './Topology/HubbleIcon';

const drawerWidth = 240;

export function MainLayout() {
  const { t } = useTranslation();
  const [statusOnline, setStatusOnline] = useState(false);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const { mode, toggleTheme } = useThemeContext();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleClearAll = async () => {
    for (const n of notifications) {
      await deleteNotification(n.id);
    }
    handleNotificationClose();
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    return user.fullName || user.username;
  };

  const getUserInitials = () => {
    if (!user) return '?';
    return (user.fullName || user.username)[0].toUpperCase();
  };

  const menuItems = [
    { text: t('layout.nav.dashboard'), icon: <DashboardIcon />, path: '/' },
    { text: t('layout.nav.topology'), icon: <HubbleIcon name="graph" size={24} />, path: '/topology' },
    { text: t('layout.nav.threat'), icon: <SecurityIcon />, path: '/threat' },
    { text: t('dataplane.nav'), icon: <LayersIcon />, path: '/dataplane' },
    { text: t('runtimeProtection.title'), icon: <ShieldIcon />, path: '/runtime' },
    { text: t('clusterManagement.title'), icon: <ClusterIcon />, path: '/cluster' },
    { text: t('layout.nav.rules'), icon: <RuleIcon />, path: '/rules' },
    { text: t('policyAudit.title'), icon: <HistoryIcon />, path: '/audit' },
    { text: t('layout.nav.logs'), icon: <ArticleIcon />, path: '/logs' },
    { text: t('layout.nav.block'), icon: <BlockIcon />, path: '/blocking' },
    { text: t('layout.nav.users'), icon: <PeopleIcon />, path: '/users' },
    { text: t('layout.nav.settings'), icon: <SettingsIcon />, path: '/settings' },
  ];

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isHealthy = await systemApi.getHealth();
        setStatusOnline(isHealthy);
      } catch {
        setStatusOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Box sx={{ display: 'flex' }}>

      {/* Top Bar */}

      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: 0,
          height: 48,
          backgroundColor: theme.palette.background.paper,
          ...(theme.palette.mode === 'dark' && {
            backgroundColor: colors.background.navigationDark,
            backgroundImage: 'linear-gradient(110deg, rgba(68, 111, 178, 0.1), transparent 55%)',
          }),
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        {/* Left: Logo */}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Box
            component="img"
            src={mode === 'dark' ? '/beilo2.svg' : '/beilo3.svg'}
            alt=""
            sx={{ width: 32, height: 32, objectFit: 'contain' }}
          />
          <Typography
            component="span"
            role="img"
            aria-label="beilo."
            sx={{ color: 'text.primary', fontSize: 26, fontWeight: 600, letterSpacing: '-1.4px', lineHeight: 1 }}
          >
            beilo<Box
              component="span"
              aria-hidden="true"
              sx={{
                display: 'inline-block', width: 4, height: 4, borderRadius: '50%',
                ml: '2px', verticalAlign: 'baseline',
                backgroundColor: mode === 'dark' ? '#BCD6FF' : colors.primary.main,
                boxShadow: mode === 'dark' ? '0 0 9px #ADCEFF30' : 'none',
              }}
            />
          </Typography>
          <Box
            component="span"
            sx={{
              display: { xs: 'none', sm: 'inline' },
              borderLeft: '1px solid',
              borderColor: mode === 'dark' ? '#394760' : '#D9E1EC',
              pl: '10px', ml: '3px',
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'block', width: 20, height: 15,
                position: 'relative',
                fontSize: 10, lineHeight: '15px', whiteSpace: 'nowrap',
                color: 'transparent', userSelect: 'all',
                WebkitTextFillColor: 'transparent',
                '&::selection': {
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                },
                '&::after': {
                  content: '""', position: 'absolute', inset: 0,
                  pointerEvents: 'none',
                  backgroundColor: mode === 'dark' ? '#A2B0C8' : '#6C7E96',
                  mask: 'url("/beilo-chinese.svg") center / contain no-repeat',
                  WebkitMask: 'url("/beilo-chinese.svg") center / contain no-repeat',
                },
              }}
            >北落</Box>
          </Box>
          <Box
            component="span"
            title={t('layout.title')}
            sx={{
              display: { xs: 'none', md: 'inline' },
              ml: '3px', px: '5px', py: '3px', border: '1px solid', borderRadius: '3px',
              borderColor: mode === 'dark' ? '#2A3955' : '#D8E2EF',
              color: mode === 'dark' ? '#839AC0' : '#6C7E96',
              fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
              fontSize: 8, lineHeight: 1, letterSpacing: '.6px',
            }}
          >CONSOLE</Box>
        </Box>

        {/* Right: Status & User */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Status Indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, whiteSpace: 'nowrap' }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: statusOnline ? '#00B42A' : '#F53F3F',
                mr: 1,
                boxShadow: statusOnline
                  ? '0 0 8px #00B42A'
                  : '0 0 8px #F53F3F',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {statusOnline ? t('layout.connected') : t('layout.disconnected')}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Tooltip title={t('layout.toolbar.refresh')}>
            <IconButton onClick={handleRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('layout.toolbar.theme')}>
            <IconButton onClick={toggleTheme} size="small">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={t('layout.toolbar.notification')}>
            <IconButton size="small" onClick={handleNotificationClick}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={t('layout.toolbar.settings')}>
            <IconButton size="small" onClick={() => navigate('/settings')}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {/* Divider */}
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* User Info */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            onClick={handleUserMenuOpen}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: 14 }}>
              {getUserInitials()}
            </Avatar>
            <Box sx={{ ml: 1 }}>
              <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
                {getUserDisplayName()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.roles?.[0] || 'User'}
              </Typography>
            </Box>
          </Box>

          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { handleUserMenuClose(); navigate('/settings'); }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              {t('layout.user.menu.settings')}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              {t('layout.user.menu.logout')}
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            top: 48,
            height: 'calc(100% - 48px)',
            overflowX: 'hidden',
          },
        }}
      >
        <Box sx={{ overflow: 'auto', mt: 1 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    minHeight: 44,
                    justifyContent: 'initial',
                    px: 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: 2,
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: 3, mt: '48px' }}>
        <Outlet />
      </Box>

      {/* Notification Panel */}
      <NotificationPanel
        anchorEl={notificationAnchor}
        onClose={handleNotificationClose}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAll={handleClearAll}
      />
    </Box>
  );
}
