import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Collapse
} from '@mui/material';
import { colors } from '../theme/colors';
import type { SelectChangeEvent } from '@mui/material';
import {
  Search as SearchIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { observabilityApi } from '../services/api';
import { CommonChip } from '../components/Common/CommonChip';

interface LogEntry {
  timestamp: string;
  message: string;
  level: string;
  labels?: Record<string, string>;
}

// Preset queries for quick access
const PRESET_QUERIES = [
  { label: 'Beilo WAF', query: '{job="beilo-waf"}' },
  { label: 'Cilium', query: '{job="cilium-agent"}' },
  { label: 'Envoy', query: '{job="cilium-envoy"}' },
  { label: 'WAF AuditLog', query: '{job="cilium-envoy"} |= "AuditLog"' },
  { label: 'Errors Only', query: '{job="beilo-waf"} |= "error"' },
  { label: 'Warnings', query: '{job="beilo-waf"} |= "warn"' },
  { label: 'Blocked Requests', query: '{job="beilo-waf"} |= "block"' },
];

// Time range options
const TIME_RANGES = [
  { value: '5m', label: 'Last 5 min' },
  { value: '15m', label: 'Last 15 min' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
];

const ATTACK_PATTERNS = [
  { label: 'SQLi', pattern: 'sql' },
  { label: 'XSS', pattern: 'xss' },
  { label: 'Blocked', pattern: 'blocked' },
  { label: 'Error', pattern: 'error' },
];

export function LogsViewer() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('{job="beilo-waf"}');
  const [duration, setDuration] = useState('1h');
  const [limit, setLimit] = useState(100);
  const [levelFilter, setLevelFilter] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await observabilityApi.getLogs(query, duration, limit);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [query, duration, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePresetClick = (presetQuery: string) => {
    setQuery(presetQuery);
    setSearchText('');
  };

  const handleSearch = () => {
    fetchLogs();
  };

  const handleClearFilters = () => {
    setLevelFilter([]);
    setSearchText('');
    setQuery('{job="beilo-waf"}');
  };

  const handleExport = () => {
    const content = logs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beilo-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRowExpand = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Filter logs by level and search text
  const filteredLogs = logs.filter((log) => {
    const level = log.level.trim().toLowerCase().replace(/^warning$/, 'warn');
    const matchesLevel = levelFilter.length === 0 || levelFilter.includes(level);
    const matchesSearch = searchText === '' ||
      log.message.toLowerCase().includes(searchText.toLowerCase()) ||
      log.labels?.namespace?.toLowerCase().includes(searchText.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getTimezone = (): string => {
    try {
      const saved = localStorage.getItem('beilo_general_settings');
      if (saved) return JSON.parse(saved).timezone || 'Asia/Shanghai';
    } catch { /* ignore */ }
    return 'Asia/Shanghai';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      let date: Date;
      if (/^\d+$/.test(timestamp)) {
        const ns = parseInt(timestamp);
        if (ns > 1e18) {
          date = new Date(ns / 1e6);
        } else {
          date = new Date(ns);
        }
      } else if (timestamp.includes('T')) {
        date = new Date(timestamp);
      } else {
        return timestamp;
      }
      return date.toLocaleString(undefined, { timeZone: getTimezone() });
    } catch {
      return timestamp;
    }
  };

  const parseMessage = (message: string) => {
    // Try to parse JSON log format
    try {
      const parsed = JSON.parse(message);
      return parsed;
    } catch {
      return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Avatar sx={{ bgcolor: colors.primary.main + '15' }}>
          <AssignmentIcon sx={{ color: colors.primary.main }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {t('logs.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('logs.subtitle')}
          </Typography>
        </Box>
      </Box>

      {/* Preset Queries */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {PRESET_QUERIES.map((preset) => (
            <Chip
              key={preset.query}
              label={preset.label}
              onClick={() => handlePresetClick(preset.query)}
              variant={query === preset.query ? 'filled' : 'outlined'}
              color={query === preset.query ? 'primary' : 'default'}
              size="small"
            />
          ))}
        </Box>

        {/* Attack Pattern Filters */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <FilterListIcon sx={{ color: 'text.secondary', mr: 1 }} />
          {ATTACK_PATTERNS.map((pattern) => (
            <Chip
              key={pattern.label}
              label={pattern.label}
              onClick={() => { setQuery('{job="cilium-envoy"} |= "Coraza"'); setSearchText(pattern.pattern); }}
              variant={searchText === pattern.pattern ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
        </Box>

        {/* Query Input */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            placeholder='LogQL query, e.g. {job="beilo-waf"} |= "error"'
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: query && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setQuery('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Time Range</InputLabel>
            <Select value={duration} label="Time Range" onChange={(e: SelectChangeEvent) => setDuration(e.target.value)}>
              {TIME_RANGES.map((range) => (
                <MenuItem key={range.value} value={range.value}>{range.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Limit</InputLabel>
            <Select value={String(limit)} label="Limit" onChange={(e: SelectChangeEvent) => setLimit(Number(e.target.value))}>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
              <MenuItem value={500}>500</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleSearch} disabled={loading} startIcon={<SearchIcon />}>
            Query
          </Button>
          <Button variant="outlined" onClick={fetchLogs} disabled={loading} startIcon={<RefreshIcon />}>
            Refresh
          </Button>
          <Button variant="outlined" onClick={handleExport} disabled={filteredLogs.length === 0} startIcon={<ExportIcon />}>
            Export
          </Button>
        </Box>
      </Card>

      {/* Filters */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="logs-level-filter-label">Level Filter</InputLabel>
            <Select
              labelId="logs-level-filter-label"
              multiple
              value={levelFilter}
              label="Level Filter"
              onChange={(e) => setLevelFilter(typeof e.target.value === 'string' ? [e.target.value] : e.target.value as string[])}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {(selected as string[]).map((level) => (
                    <CommonChip key={level} type="logLevel" value={level} label={level.toUpperCase()} size="small" />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="debug">DEBUG</MenuItem>
              <MenuItem value="info">INFO</MenuItem>
              <MenuItem value="warn">WARN</MenuItem>
              <MenuItem value="error">ERROR</MenuItem>
              <MenuItem value="critical">CRITICAL</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            placeholder="Search in messages..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          {(levelFilter.length > 0 || searchText) && (
            <Chip
              label="Clear Filters"
              onClick={handleClearFilters}
              onDelete={handleClearFilters}
              size="small"
              variant="outlined"
            />
          )}
          <Box sx={{ flex: 1 }} />
          <Chip label={`${filteredLogs.length} logs`} size="small" />
        </Box>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Logs List */}
      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredLogs.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
            <Typography color="text.secondary">{t('logs.empty')}</Typography>
            <Button sx={{ mt: 2 }} onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
            {filteredLogs.map((log, index) => {
              const isExpanded = expandedRows.has(index);
              const parsed = parseMessage(log.message);

              return (
                <Box key={index}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 2,
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => toggleRowExpand(index)}
                  >
                    <IconButton size="small">
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: 'text.secondary', minWidth: 160 }}
                    >
                      {formatTimestamp(log.timestamp)}
                    </Typography>
                    <CommonChip
                      type="logLevel"
                      value={log.level.trim().toLowerCase()}
                      label={log.level.toUpperCase()}
                      size="small"
                      sx={{ minWidth: 60 }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.message.substring(0, 150)}
                      {log.message.length > 150 && !isExpanded && '...'}
                    </Typography>
                    {log.labels?.namespace && (
                      <Chip label={log.labels.namespace} size="small" variant="outlined" />
                    )}
                  </Box>
                  <Collapse in={isExpanded}>
                    <Box
                      sx={{
                        px: 2,
                        py: 2,
                        bgcolor: 'background.paper',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Full Message:
                      </Typography>
                      <pre
                        style={{
                          margin: 0,
                          padding: 12,
                          background: 'background.default',
                          borderRadius: 4,
                          overflow: 'auto',
                          fontFamily: 'monospace',
                          fontSize: 12,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {parsed ? JSON.stringify(parsed, null, 2) : log.message}
                      </pre>
                      {log.labels && Object.keys(log.labels).length > 0 && (
                        <>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, mb: 1, display: 'block' }}>
                            Labels:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {Object.entries(log.labels).map(([key, value]) => (
                              <Chip
                                key={key}
                                label={`${key}=${value}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: 'monospace' }}
                              />
                            ))}
                          </Box>
                        </>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        )}
      </Card>
    </Box>
  );
}

export default LogsViewer;
