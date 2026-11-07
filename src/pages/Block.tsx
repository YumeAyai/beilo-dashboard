import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Avatar,
} from '@mui/material';
import { colors } from '../theme/colors';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import { blockApi } from '../services/api';

interface BlockedIPResponse {
  Entity: string;
  BlockType: string;
  Reason: string;
  BlockedAt: string;
  ExpiresAt: string;
  Source: string;
  Count: number;
}

export function BlockManagement() {
  const { t } = useTranslation();
  const [blockedIPs, setBlockedIPs] = useState<BlockedIPResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [newReason, setNewReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchIP, setSearchIP] = useState('');

  const fetchBlockedIPs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await blockApi.getBlockedIPs();
      setBlockedIPs(data);
    } catch (err) {
      setError(t('block.messages.fetchFailed') + `: ${err instanceof Error ? err.message : t('common.error')}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchBlockedIPs();
  }, [fetchBlockedIPs]);

  const handleBlockIP = async () => {
    if (!newIP.trim()) {
      setError(t('block.messages.ipRequired'));
      return;
    }

    if (!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(newIP)) {
      setError(t('block.messages.ipInvalid'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await blockApi.blockIP(newIP.trim(), newReason.trim());
      setSuccess(t('block.messages.blockedSuccess', { ip: newIP }));
      setNewIP('');
      setNewReason('');
      setDialogOpen(false);
      fetchBlockedIPs();
    } catch (err) {
      setError(t('block.messages.blockFailed') + `: ${err instanceof Error ? err.message : t('common.error')}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblockIP = async (ip: string) => {
    try {
      await blockApi.unblockIP(ip);
      setSuccess(t('block.messages.unblockedSuccess', { ip }));
      fetchBlockedIPs();
    } catch (err) {
      setError(t('block.messages.unblockFailed') + `: ${err instanceof Error ? err.message : t('common.error')}`);
    }
  };

  const filteredIPs = searchIP
    ? blockedIPs.filter((ip) => ip.Entity.includes(searchIP))
    : blockedIPs;

  const getTimezone = (): string => {
    try {
      const saved = localStorage.getItem('beilo_general_settings');
      if (saved) return JSON.parse(saved).timezone || 'Asia/Shanghai';
    } catch { /* ignore */ }
    return 'Asia/Shanghai';
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '-';
    try {
      return new Date(timestamp).toLocaleString(undefined, { timeZone: getTimezone() });
    } catch {
      return timestamp;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{ bgcolor: colors.primary.main + '15' }}>
            <BlockIcon sx={{ color: colors.primary.main }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {t('block.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('block.subtitle')}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label={t('block.search')}
            value={searchIP}
            onChange={(e) => setSearchIP(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button variant="contained" color="error" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            {t('block.buttons.manualBlock')}
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchBlockedIPs} disabled={loading}>
            {t('block.buttons.refresh')}
          </Button>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {t('block.status.blockedList')}
          </Typography>
          <Chip label={t('block.status.total', { count: blockedIPs.length })} size="small" color="error" />
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{t('block.table.ip')}</TableCell>
                  <TableCell>{t('block.table.type')}</TableCell>
                  <TableCell>{t('block.table.reason')}</TableCell>
                  <TableCell>{t('block.table.blockTime')}</TableCell>
                  <TableCell>{t('block.table.expireTime')}</TableCell>
                  <TableCell>{t('block.table.source')}</TableCell>
                  <TableCell align="center">{t('block.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIPs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {searchIP ? t('block.empty.noMatch') : t('block.empty.noRecords')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIPs.map((ip) => (
                    <TableRow key={ip.Entity} hover>
                      <TableCell>
                        {ip.Entity}
                      </TableCell>
                      <TableCell>
                        <Chip label={ip.BlockType} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{ip.Reason || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatTime(ip.BlockedAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatTime(ip.ExpiresAt)}</Typography>
                      </TableCell>
                      <TableCell>{ip.Source || '-'}</TableCell>
                      <TableCell align="center">
                        <IconButton color="primary" size="small" onClick={() => handleUnblockIP(ip.Entity)} title={t('common.unblock') || 'Unblock'}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('block.dialog.title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t('block.dialog.ip')}
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              fullWidth
              required
              placeholder={t('block.dialog.ipPlaceholder')}
            />
            <TextField
              label={t('block.dialog.reason')}
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder={t('block.dialog.reasonPlaceholder')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBlockIP}
            disabled={submitting || !newIP.trim()}
          >
            {submitting ? t('common.loading') : t('block.buttons.manualBlock')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default BlockManagement;
