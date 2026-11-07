import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../services/api';
import { rbacApi } from '../services/api';
import { LoginBackground } from '../components/LoginBackground';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t('login.errors.required'));
      return;
    }
    if (totpRequired && totpCode.length !== 6) {
      setError(t('login.errors.totpRequired') || 'Please enter the 6-digit verification code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await rbacApi.login(username, password, totpRequired ? totpCode : undefined);
      if (result.totpRequired) {
        setTotpRequired(true);
        setLoading(false);
        return;
      }
      setAuth(result.token, {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        fullName: result.user.fullName,
        roles: result.user.roles || [],
        isActive: result.user.isActive,
        isSuperAdmin: result.user.isSuperAdmin,
        totpEnabled: result.user.totpEnabled,
      });
      setLoading(false);
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      const normalizedError = errorMessage.trim().toLowerCase();
      if (normalizedError.includes('totp')) {
        setError(t('login.errors.totpInvalid') || 'Invalid verification code');
      } else if (normalizedError.includes('invalid credentials') ||
          normalizedError.includes('authentication failed')) {
        setError(t('login.errors.invalid'));
      } else if (!normalizedError || normalizedError === 'login failed') {
        setError(t('login.errors.failed'));
      } else {
        setError(errorMessage);
      }
      setTotpRequired(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <LoginBackground />

      {/* Frost glass card */}
      <Card
        sx={{
          width: '100%',
          maxWidth: 400,
          mx: 2,
          borderRadius: 3,
          boxShadow: isDark
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(100, 130, 180, 0.2)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(100, 130, 180, 0.2)',
          backdropFilter: 'blur(20px)',
          background: isDark
            ? 'rgba(15, 20, 40, 0.85)'
            : 'rgba(255, 255, 255, 0.9)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: isDark
              ? '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(100, 150, 200, 0.15)'
              : '0 12px 40px rgba(100, 130, 180, 0.3), 0 0 30px rgba(74, 144, 217, 0.15)',
            borderColor: isDark ? 'rgba(100, 150, 200, 0.3)' : 'rgba(74, 144, 217, 0.3)',
          },
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo and Title */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 4,
            }}
          >
            {/* <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDark
                  ? 'linear-gradient(135deg, #1e3a5f 0%, #0d1f3c 100%)'
                  : 'linear-gradient(135deg, #4a90d9 0%, #2d5a8a 100%)',
                border: '2px solid',
                borderColor: isDark ? 'rgba(100, 150, 200, 0.3)' : 'rgba(74, 144, 217, 0.4)',
                mb: 2,
                boxShadow: isDark
                  ? '0 0 30px rgba(100, 150, 200, 0.2)'
                  : '0 4px 20px rgba(74, 144, 217, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05) rotate(5deg)',
                  boxShadow: isDark
                    ? '0 0 40px rgba(100, 150, 200, 0.35)'
                    : '0 6px 25px rgba(74, 144, 217, 0.45)',
                },
              }}
            >
              <ShieldIcon sx={{ fontSize: 40, color: isDark ? '#8cb4d8' : '#ffffff' }} />
            </Box> */}
            <img src="/beilo1.svg" alt="Beilo Logo" style={{ width: '100%', maxWidth: 200, height: 'auto', color: isDark ? '#8cb4d8' : '#ffffff' }} />
            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{
                background: isDark
                  ? 'linear-gradient(135deg, #e8f0ff 0%, #a8c0e8 100%)'
                  : 'linear-gradient(135deg, #2d5a8a 0%, #4a90d9 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5,
              }}
            >
              {t('login.title')}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: isDark ? 'rgba(200, 210, 230, 0.7)' : 'rgba(70, 100, 140, 0.8)' }}
            >
              {t('login.subtitle')}
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                background: isDark ? 'rgba(80, 20, 20, 0.8)' : 'rgba(220, 53, 69, 0.1)',
                color: isDark ? '#ffb4b4' : '#721c24',
              }}
            >
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('login.fields.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              sx={{ mb: 2.5 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: isDark ? 'rgba(200, 210, 230, 0.6)' : 'rgba(70, 100, 140, 0.6)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              label={t('login.fields.password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: isDark ? 'rgba(200, 210, 230, 0.6)' : 'rgba(70, 100, 140, 0.6)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: isDark ? 'rgba(200, 210, 230, 0.6)' : 'rgba(70, 100, 140, 0.6)' }}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {totpRequired && (
              <>
                <Alert
                  severity="info"
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    background: isDark ? 'rgba(20, 40, 80, 0.8)' : 'rgba(0, 123, 255, 0.1)',
                    color: isDark ? '#a8c8ff' : '#004085',
                  }}
                >
                  {t('login.totpRequired') || 'Two-factor authentication required.'}
                </Alert>
                <TextField
                  fullWidth
                  label={t('login.fields.totpCode') || 'Verification Code'}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  sx={{ mb: 2 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: isDark ? 'rgba(200, 210, 230, 0.6)' : 'rgba(70, 100, 140, 0.6)', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  placeholder="000000"
                />
                <Button
                  type="button"
                  variant="outlined"
                  fullWidth
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  disabled={loading}
                  onClick={() => {
                    setTotpRequired(false);
                    setTotpCode('');
                    setError('');
                  }}
                  sx={{
                    mb: 2,
                    py: 1,
                    borderRadius: 2,
                    color: isDark ? '#C8D2E6' : '#46648C',
                    borderColor: isDark ? 'rgba(200, 210, 230, 0.35)' : 'rgba(70, 100, 140, 0.35)',
                    '&:hover': {
                      borderColor: isDark ? 'rgba(200, 210, 230, 0.65)' : 'rgba(70, 100, 140, 0.65)',
                      bgcolor: isDark ? 'rgba(200, 210, 230, 0.08)' : 'rgba(70, 100, 140, 0.06)',
                    },
                  }}
                >
                  {t('common.back')}
                </Button>
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '1rem',
                background: isDark
                  ? 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)'
                  : 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)',
                boxShadow: isDark
                  ? '0 4px 16px rgba(30, 58, 95, 0.4)'
                  : '0 4px 16px rgba(74, 144, 217, 0.4)',
                '&:hover': {
                  background: isDark
                    ? 'linear-gradient(135deg, #2d5a8a 0%, #3d7ab8 100%)'
                    : 'linear-gradient(135deg, #357abd 0%, #2d6aa3 100%)',
                  boxShadow: isDark
                    ? '0 6px 20px rgba(45, 90, 138, 0.5)'
                    : '0 6px 20px rgba(74, 144, 217, 0.5)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              ) : (
                t('login.buttons.login')
              )}
            </Button>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: '1px solid',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(100, 130, 180, 0.2)',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: isDark ? 'rgba(200, 210, 230, 0.5)' : 'rgba(70, 100, 140, 0.5)' }}
            >
              {t('login.footer.defaultHint')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
