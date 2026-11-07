import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import QRCode from 'qrcode';
import { rbacApi } from '../services/api';
import { useAuth } from '../services/api';
import { colors } from '../theme/colors';

export function TOTPSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<'loading' | 'setup' | 'verify' | 'unavailable'>('loading');
  const [secret, setSecret] = useState('');
  const [qrCodeURL, setQRCodeURL] = useState('');
  const [code, setCode] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Emergency user cannot enable TOTP
    if (user?.id === 'emergency') {
      setError('TOTP cannot be enabled for the emergency user. Please create a regular user account for production use.');
      setStep('unavailable');
      return;
    }

    const setupTOTP = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await rbacApi.setupTOTP();
        setSecret(data.secret);
        // Build otpauth URL if backend didn't provide it
        const otpauthUrl = data.qrCodeURL ||
          `otpauth://totp/Beilo:${encodeURIComponent(user?.username || 'user')}?secret=${data.secret}&issuer=Beilo`;
        setQRCodeURL(otpauthUrl);
        setStep('verify');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to setup TOTP');
        setStep('setup');
      } finally {
        setLoading(false);
      }
    };

    setupTOTP();
  }, [user]);

  // Generate QR code locally when URL is available
  useEffect(() => {
    if (!qrCodeURL || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrCodeURL, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    }).catch((err) => {
      console.error('Failed to generate QR code:', err);
    });
  }, [qrCodeURL]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Code must be 6 digits');
      return;
    }
    if (!secret) {
      setError('TOTP secret not available. Please restart the setup process.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await rbacApi.enableTOTP(code, secret);
      updateUser({ totpEnabled: true });
      setSuccess(true);
      setTimeout(() => {
        navigate('/settings');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable TOTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  if (loading && step === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (step === 'unavailable') {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/settings')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            {t('settings.security.totpSetupTitle') || 'Enable Two-Factor Authentication'}
          </Typography>
        </Box>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => navigate('/settings')}
          sx={{ mt: 3 }}
        >
          {t('common.back')}
        </Button>
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: colors.success.dark + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <LockIcon sx={{ fontSize: 32, color: colors.success.dark }} />
            </Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {t('settings.security.totpSetupSuccessTitle') || '2FA Enabled Successfully'}
            </Typography>
            <Typography color="text.secondary">
              {t('settings.security.totpSetupSuccessMessage') || 'Your account is now protected with two-factor authentication.'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/settings')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold">
          {t('settings.security.totpSetupTitle') || 'Enable Two-Factor Authentication'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {t('settings.security.totpSetupStep1') || 'Step 1: Scan QR Code'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('settings.security.totpSetupScanHelp') || 'Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)'}
          </Typography>

          {qrCodeURL && (
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  display: 'inline-block',
                  p: 2,
                  backgroundColor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <canvas ref={canvasRef} />
              </Box>
            </Box>
          )}

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
            {t('settings.security.totpSetupStep2') || 'Step 2: Enter Verification Code'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('settings.security.totpSetupEnterCode') || 'Enter the 6-digit code from your authenticator app to verify setup'}
          </Typography>

          <TextField
            fullWidth
            label={t('settings.security.totpSetupVerificationCode') || 'Verification Code'}
            value={code}
            onChange={handleChange}
            placeholder="000000"
            slotProps={{
              input: {
                startAdornment: (
                  <LockIcon sx={{ color: 'text.secondary', mr: 1 }} />
                ),
              },
            }}
            sx={{ mb: 3 }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/settings')}
              sx={{ flex: 1 }}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              variant="contained"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              sx={{ flex: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : (t('settings.security.totpSetupEnable') || 'Enable 2FA')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {t('settings.security.totpSetupManualKey') || 'Manual Key'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('settings.security.totpSetupManualHelp') || 'If you cannot scan the QR code, enter this key manually in your authenticator app:'}
          </Typography>
          <Box
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              backgroundColor: 'background.default',
              p: 2,
              borderRadius: 1,
              wordBreak: 'break-all',
              textAlign: 'center',
            }}
          >
            {secret}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default TOTPSetup;
