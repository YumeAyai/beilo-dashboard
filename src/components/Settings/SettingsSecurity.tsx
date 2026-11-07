import { Typography, TextField, Button, Alert, Box, IconButton, InputAdornment, Divider, Grid } from '@mui/material';
import { Visibility, VisibilityOff, Lock as LockIcon, Shield as ShieldIcon, Key as KeyIcon, Person as PersonIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../../theme/colors';
import { useAuth, type User } from '../../services/api';
import type { TFunction } from 'i18next';
import { rbacApi } from '../../services/api';

interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  twoFactorAuth: boolean;
  loginNotifications: boolean;
}

interface SettingsSecurityProps {
  security: SecuritySettings;
  onSecurityChange: (settings: SecuritySettings) => void;
  user: User | null;
  t: TFunction;
}

export function SettingsSecurity({
  security,
  onSecurityChange,
  user,
  t,
}: SettingsSecurityProps) {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

  const handleChange = (field: keyof SecuritySettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onSecurityChange({ ...security, [field]: e.target.value });
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    if (!security.currentPassword) {
      setPasswordError(t('settings.security.currentPasswordRequired') || 'Please enter current password');
      return;
    }
    if (!security.newPassword) {
      setPasswordError(t('settings.security.newPasswordRequired') || 'Please enter new password');
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      setPasswordError(t('settings.security.passwordMismatch') || 'Passwords do not match');
      return;
    }
    if (security.newPassword.length < 6) {
      setPasswordError(t('settings.security.passwordTooShort') || 'Password must be at least 6 characters');
      return;
    }
    try {
      await rbacApi.changePassword(security.currentPassword, security.newPassword);
      onSecurityChange({ ...security, currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    }
  };

  const handleDisableTOTP = async () => {
    setDisableLoading(true);
    setDisableError('');
    try {
      await rbacApi.disableTOTP(disableCode);
      updateUser({ totpEnabled: false });
      setDisableDialogOpen(false);
      setDisableCode('');
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setDisableLoading(false);
    }
  };

  const accountInfo = [
    { label: t('settings.security.userEmail'), value: user?.email || 'admin@example.com' },
    { label: t('settings.security.userId'), value: user?.id || '10001' },
    { label: t('settings.security.role'), value: user?.isSuperAdmin ? t('settings.security.superAdmin') : user?.roles?.[0] || 'User' },
    { label: t('settings.security.registered'), value: user?.createdAt?.split('T')[0] || '2024-01-15' },
    { label: t('settings.security.lastLogin'), value: user?.updatedAt?.split('T')[0] || '2023-01-05 10:30:00' },
    { label: t('common.status'), value: user?.isActive ? t('status.active') : t('status.disabled') },
  ];

  const textFieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <PersonIcon sx={{ color: colors.primary.main }} />
        <Typography variant="subtitle1" fontWeight="bold">
          {t('settings.security.accountInfo')}
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {accountInfo.map((item) => (
          <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {item.label}
            </Typography>
            <Typography variant="body2">{item.value}</Typography>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <KeyIcon sx={{ color: colors.primary.main }} />
        <Typography variant="subtitle1" fontWeight="bold">
          {t('settings.security.changePassword')}
        </Typography>
      </Box>

      {passwordError && (
        <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>
      )}
      {passwordSaved && (
        <Alert severity="success" sx={{ mb: 2 }}>{t('common.success')}</Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          type={showPassword.current ? 'text' : 'password'}
          label={t('settings.security.currentPassword')}
          value={security.currentPassword}
          onChange={handleChange('currentPassword')}
          size="small"
          sx={textFieldSx}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })} edge="end" size="small">
                    {showPassword.current ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          fullWidth
          type={showPassword.new ? 'text' : 'password'}
          label={t('settings.security.newPassword')}
          value={security.newPassword}
          onChange={handleChange('newPassword')}
          size="small"
          sx={textFieldSx}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })} edge="end" size="small">
                    {showPassword.new ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          fullWidth
          type={showPassword.confirm ? 'text' : 'password'}
          label={t('settings.security.confirmNewPassword')}
          value={security.confirmPassword}
          onChange={handleChange('confirmPassword')}
          size="small"
          sx={textFieldSx}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })} edge="end" size="small">
                    {showPassword.confirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Button variant="contained" color="primary" onClick={handlePasswordChange}>
          {t('settings.buttons.confirmPassword')}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <ShieldIcon sx={{ color: colors.primary.main }} />
        <Typography variant="subtitle1" fontWeight="bold">
          {t('settings.security.securityOptions')}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          p: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LockIcon sx={{ color: user?.totpEnabled ? colors.success.dark : 'text.disabled', fontSize: 32 }} />
          <Box>
            <Typography variant="subtitle2">{t('settings.security.twoFactorAuth')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.totpEnabled
                ? (t('settings.security.totpEnabled') || 'Enabled - Your account is protected')
                : (t('settings.security.totpDisabled') || 'Disabled - Enable for additional security')}
            </Typography>
          </Box>
        </Box>
        {user?.totpEnabled ? (
          <Button variant="outlined" color="error" size="small" onClick={() => setDisableDialogOpen(true)}>
            {t('settings.buttons.disable2FA')}
          </Button>
        ) : (
          <Button variant="contained" size="small" onClick={() => navigate('/totp-setup')}>
            {t('settings.buttons.enable2FA')}
          </Button>
        )}
      </Box>

      {disableDialogOpen && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {t('settings.totp.disableMessage')}
          </Typography>
          {disableError && <Alert severity="error" sx={{ mb: 1.5 }}>{disableError}</Alert>}
          <TextField
            fullWidth
            size="small"
            label={t('settings.totp.verificationCode')}
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            sx={{ mb: 1.5 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" onClick={() => { setDisableDialogOpen(false); setDisableCode(''); setDisableError(''); }}>
              {t('common.cancel')}
            </Button>
            <Button
              size="small" variant="contained" color="error"
              disabled={disableLoading || disableCode.length !== 6}
              onClick={handleDisableTOTP}
            >
              {disableLoading ? '...' : t('settings.totp.disable')}
            </Button>
          </Box>
        </Alert>
      )}
    </Box>
  );
}
