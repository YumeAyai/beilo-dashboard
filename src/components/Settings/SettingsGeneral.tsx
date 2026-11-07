import { TextField, MenuItem, Box, Divider, Typography, InputAdornment } from '@mui/material';
import { Dns as SiteIcon, Translate as LanguageIcon, Public as GlobeIcon, Settings as SettingsIcon, Link as UrlIcon, Email as EmailIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import { languages } from '../../i18n';
import { colors } from '../../theme/colors';
import type { TFunction } from 'i18next';

interface GeneralSettings {
  siteName: string;
  siteUrl: string;
  contactEmail: string;
  timezone: string;
  language: string;
}

interface SettingsGeneralProps {
  general: GeneralSettings;
  onChange: (settings: GeneralSettings) => void;
  t: TFunction;
}

export function SettingsGeneral({ general, onChange, t }: SettingsGeneralProps) {
  const handleChange = (field: keyof GeneralSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...general, [field]: e.target.value });
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <GlobeIcon sx={{ color: colors.primary.main }} />
        <Typography variant="subtitle1" fontWeight="bold">
          {t('settings.general.siteInfo') || 'Site'}
        </Typography>
      </Box>

      <TextField
        fullWidth size="small"
        label={t('settings.general.siteName')}
        value={general.siteName}
        onChange={handleChange('siteName')}
        sx={fieldSx}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SiteIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
      />
      <TextField
        fullWidth size="small"
        label={t('settings.general.siteUrl')}
        value={general.siteUrl}
        onChange={handleChange('siteUrl')}
        sx={{ ...fieldSx, mt: 2 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><UrlIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
      />
      <TextField
        fullWidth size="small"
        type="email"
        label={t('settings.general.contactEmail')}
        value={general.contactEmail}
        onChange={handleChange('contactEmail')}
        sx={{ ...fieldSx, mt: 2 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
      />

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <SettingsIcon sx={{ color: colors.primary.main }} />
        <Typography variant="subtitle1" fontWeight="bold">
          {t('settings.general.locale') || 'Locale'}
        </Typography>
      </Box>

      <TextField
        select fullWidth size="small"
        label={t('settings.general.language')}
        value={general.language}
        onChange={(e) => onChange({ ...general, language: e.target.value })}
        sx={fieldSx}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><LanguageIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
      >
        {languages.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>{lang.nativeName}</MenuItem>
        ))}
      </TextField>
      <TextField
        select fullWidth size="small"
        label={t('settings.general.timezone')}
        value={general.timezone}
        onChange={handleChange('timezone')}
        sx={{ ...fieldSx, mt: 2 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><TimeIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
      >
        <MenuItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</MenuItem>
        <MenuItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</MenuItem>
        <MenuItem value="America/New_York">America/New_York (UTC-5/-4 DST)</MenuItem>
        <MenuItem value="America/Chicago">America/Chicago (UTC-6/-5 DST)</MenuItem>
        <MenuItem value="America/Denver">America/Denver (UTC-7/-6 DST)</MenuItem>
        <MenuItem value="America/Los_Angeles">America/Los_Angeles (UTC-8/-7 DST)</MenuItem>
        <MenuItem value="Europe/London">Europe/London (UTC+0/+1 DST)</MenuItem>
        <MenuItem value="Europe/Berlin">Europe/Berlin (UTC+1/+2 DST)</MenuItem>
        <MenuItem value="Etc/UTC">UTC</MenuItem>
      </TextField>
    </Box>
  );
}
