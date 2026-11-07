import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem,
  Grid, Box, Avatar, Paper, Chip, Card, CardContent,
  CircularProgress, Alert,
} from '@mui/material';
import { Science as ScienceIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material';
import { colors } from '../../theme/colors';
import { getActionLabel } from './helpers';
import { rulesApi } from '../../services/api';
import type { Rule, RuleTestInput, RuleTestResult } from '../../types/rule';
import type { TFunction } from 'i18next';

interface RuleTestDialogProps {
  open: boolean;
  onClose: () => void;
  t?: TFunction;
  rule?: Rule | null;
}

export function RuleTestDialog({ open, onClose, t, rule }: RuleTestDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/test');
  const [headers, setHeaders] = useState('{"Content-Type": "application/json"}');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<RuleTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseHeaders = (headerStr: string): Record<string, string> => {
    const parsed: unknown = JSON.parse(headerStr);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.values(parsed).some(value => typeof value !== 'string')) {
      throw new Error(t ? t('ruleManagement.invalidHeaders') : 'Invalid headers');
    }
    return parsed as Record<string, string>;
  };

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const input: RuleTestInput = {
        ruleId: rule?.id,
        request: { method, path, headers: parseHeaders(headers), body: body || undefined },
      };
      const res = await rulesApi.testRule(input);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  const tOrText = (key: string, fallback: string) => t ? t(key) : fallback;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: colors.primary.main + '15' }}>
            <ScienceIcon sx={{ color: colors.primary.main }} />
          </Avatar>
          <Box>
            <Box sx={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{rule && t ? t('ruleManagement.testRule', { name: rule.name }) : tOrText('rules.test.title', '规则测试')}</Box>
            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{tOrText('rules.test.subtitle', '模拟请求测试 WAF 规则匹配结果')}</Box>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: isDark ? colors.dialogBorder.dark : colors.dialogBorder.light }}>
        <Alert severity="info" sx={{ mb: 2 }}>{tOrText('ruleManagement.testHint', 'Local expression test only')}</Alert>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 3 }}>
            <TextField
              select
              fullWidth
              label={tOrText('rules.test.method', '方法')}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="GET">GET</MenuItem>
              <MenuItem value="POST">POST</MenuItem>
              <MenuItem value="PUT">PUT</MenuItem>
              <MenuItem value="DELETE">DELETE</MenuItem>
              <MenuItem value="PATCH">PATCH</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 9 }}>
            <TextField fullWidth label={tOrText('rules.test.path', '请求路径')} value={path} onChange={(e) => setPath(e.target.value)} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} placeholder="/api/login" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label={tOrText('rules.test.headers', '请求头 (JSON)')} value={headers} onChange={(e) => setHeaders(e.target.value)} multiline rows={2} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} placeholder='{"Content-Type": "application/json", "X-Real-IP": "1.2.3.4"}' />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label={tOrText('rules.test.body', '请求体 (可选)')} value={body} onChange={(e) => setBody(e.target.value)} multiline rows={4} size="small" placeholder={'{"username": "admin", "password": "123456"}'} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button
              variant="contained"
              onClick={handleTest}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ScienceIcon />}
              sx={{ borderRadius: 2, px: 4 }}
            >
              {loading ? tOrText('rules.test.testing', '测试中...') : tOrText('rules.test.startTest', '开始测试')}
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Paper sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: isDark ? colors.statCard.error.bg.dark : colors.statCard.error.bg.light }}>
            <Box sx={{ color: isDark ? colors.statCard.error.color.dark : colors.statCard.error.color.light, fontSize: '0.875rem' }}>
              {error}
            </Box>
          </Paper>
        )}

        {result && (
          <Card sx={{ mt: 3, bgcolor: isDark ? 'background.paper' : '#F7F8FA', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent>
              <Box sx={{ fontSize: '1rem', fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                {tOrText('rules.test.result.title', '测试结果')}
                <Chip
                  icon={result.matched ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <CancelIcon sx={{ fontSize: 16 }} />}
                  label={result.matched ? tOrText('rules.test.result.matched', '匹配') : tOrText('rules.test.result.notMatched', '未匹配')}
                  color={result.matched ? 'error' : 'success'}
                  size="small"
                  sx={{ borderRadius: 1.5 }}
                />
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 4 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, minHeight: 90, bgcolor: isDark ? 'background.paper' : '#fff' }}>
                    <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>{tOrText('rules.test.result.action', '执行动作')}</Box>
                    <Box sx={{ fontSize: '1.25rem', fontWeight: 'bold', mt: 1, color: result.action === 'block' ? colors.error.light : colors.success.light }}>
                      {t ? getActionLabel(t, result.action) : result.action}
                    </Box>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, minHeight: 90, bgcolor: isDark ? 'background.paper' : '#fff' }}>
                    <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>{tOrText('rules.test.result.processingTime', '处理时间')}</Box>
                    <Box sx={{ fontSize: '1.25rem', fontWeight: 'bold', mt: 1, color: colors.primary.main }}>
                      {result.processingTime}ms
                    </Box>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, minHeight: 90, bgcolor: isDark ? 'background.paper' : '#fff' }}>
                    <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>{tOrText('rules.test.result.matchedRules', '匹配规则数')}</Box>
                    <Box sx={{ fontSize: '1.25rem', fontWeight: 'bold', mt: 1, color: (result.matchedRules?.length ?? 0) > 0 ? colors.error.light : colors.success.light }}>
                      {result.matchedRules?.length ?? 0}
                    </Box>
                  </Paper>
                </Grid>

                {result.details && result.details.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 2, borderRadius: 2, bgcolor: isDark ? 'background.paper' : '#fff' }}>
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1.5 }}>{tOrText('rules.test.result.ruleDetails', '规则匹配详情')}</Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {result.details.map((detail, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: isDark ? '#353535' : '#f5f5f5' }}>
                            <Chip
                              label={detail.matched ? '✓' : '✗'}
                              size="small"
                              color={detail.matched ? 'success' : 'default'}
                              sx={{ minWidth: 28, borderRadius: 1 }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{detail.ruleName}</Box>
                              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace' }}>{detail.condition}</Box>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} sx={{ borderRadius: 2 }}>{tOrText('common.close', '关闭')}</Button>
      </DialogActions>
    </Dialog>
  );
}
