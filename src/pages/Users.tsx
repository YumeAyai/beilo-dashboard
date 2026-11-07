import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { colors } from '../theme/colors';
import { StatusChip } from '../components/Common/StatusChip';
import { rbacApi, type RBACUser, type RBACRole } from '../services/api';

export function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<RBACUser[]>([]);
  const [roles, setRoles] = useState<RBACRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<RBACUser | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    roles: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, rolesData] = await Promise.all([
        rbacApi.getUsers(),
        rbacApi.getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (user?: RBACUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        fullName: user.fullName,
        roles: user.roles,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        fullName: '',
        roles: [],
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setError('');
  };

  const handleSave = async () => {
    setError('');

    // Validate required fields
    if (!formData.username.trim()) {
      setError(t('users.validation.usernameRequired'));
      return;
    }
    if (!formData.email.trim()) {
      setError(t('users.validation.emailRequired'));
      return;
    }
    if (!editingUser && !formData.password) {
      setError(t('users.validation.passwordRequired'));
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError(t('users.validation.invalidEmail'));
      return;
    }

    try {
      if (editingUser) {
        const updateData: Partial<typeof formData> = {
          email: formData.email,
          fullName: formData.fullName,
          roles: formData.roles,
          isActive: formData.isActive,
        };
        if (formData.password) {
          (updateData as { password: string }).password = formData.password;
        }
        await rbacApi.updateUser(editingUser.id, updateData);
      } else {
        await rbacApi.createUser(formData);
      }
      await loadData();
      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.validation.saveFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await rbacApi.deleteUser(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || roleId;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: colors.primary.main + '15' }}>
            <PeopleIcon sx={{ color: colors.primary.main }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {t('users.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('users.subtitle')}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('users.buttons.addUser')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              placeholder={t('users.table.user') + '...'}
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 300 }}
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
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('users.table.user')}</TableCell>
                    <TableCell>{t('users.table.email')}</TableCell>
                    <TableCell>{t('users.table.role')}</TableCell>
                    <TableCell>{t('users.table.status')}</TableCell>
                    <TableCell>{t('users.table.joinTime')}</TableCell>
                    <TableCell align="right">{t('users.table.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>{user.username?.[0] || '?'}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {user.fullName || user.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              @{user.username}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {(user.roles || []).map((role) => (
                            <Chip
                              key={role}
                              label={getRoleName(role)}
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={user.isActive ? 'active' : 'disabled'} />
                      </TableCell>
                      <TableCell>{user.createdAt?.split('T')[0] || '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? t('users.dialog.editTitle') : t('users.dialog.addTitle')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t('users.dialog.username')}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t('users.dialog.name')}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t('users.dialog.email')}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={editingUser ? t('users.dialog.newPassword') : t('users.dialog.password')}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>{t('users.dialog.roles')}</InputLabel>
                <Select
                  multiple
                  value={formData.roles}
                  label={t('users.dialog.roles')}
                  onChange={(e) => setFormData({ ...formData, roles: e.target.value as string[] })}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>{t('users.dialog.status')}</InputLabel>
                <Select
                  value={formData.isActive ? 'active' : 'inactive'}
                  label={t('users.dialog.status')}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                >
                  <MenuItem value="active">{t('status.active')}</MenuItem>
                  <MenuItem value="inactive">{t('status.disabled')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
