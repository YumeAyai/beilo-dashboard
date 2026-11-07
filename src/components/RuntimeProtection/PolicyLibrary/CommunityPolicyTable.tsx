import { Button, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CommunityPolicy } from '../../../types/runtimeLibrary';
import { CommonChip } from '../../Common/CommonChip';

interface Props { entries: CommunityPolicy[]; page: number; onPage: (page: number) => void; onSelect: (id: string) => void }
const pageSize = 15;

export function CommunityPolicyTable({ entries, page, onPage, onSelect }: Props) {
  const { t } = useTranslation();
  const tr = (key: string) => t(`runtimeLibrary.${key}`);
  return <>
    <TableContainer><Table size="small" aria-label={tr('title')} sx={{ minWidth: 850 }}>
      <TableHead><TableRow>{['name', 'category', 'hooks', 'actions', 'availability'].map(key => <TableCell key={key}>{tr(key)}</TableCell>)}</TableRow></TableHead>
      <TableBody>{entries.slice(page * pageSize, (page + 1) * pageSize).map(entry => <TableRow key={entry.id} hover>
        <TableCell><Button size="small" onClick={() => onSelect(entry.id)} sx={{ textTransform: 'none', justifyContent: 'flex-start', p: 0, textAlign: 'left' }}>{entry.title}</Button><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{tr(entry.collection)}</Typography></TableCell>
        <TableCell>{tr(`categories.${entry.category}`)}</TableCell>
        <TableCell sx={{ maxWidth: 280, overflowWrap: 'anywhere' }}><Typography variant="caption" fontFamily="monospace">{entry.hooks.join(', ') || '—'}</Typography></TableCell>
        <TableCell><Stack gap={0.5} alignItems="flex-start"><CommonChip type="status" value={entry.behavior === 'enforce' ? 'warning' : 'monitoring'} label={tr(`behaviors.${entry.behavior}`)} /><Typography variant="caption" color="text.secondary">{entry.actions.join(', ')}</Typography></Stack></TableCell>
        <TableCell><Typography variant="body2" color="text.secondary">{tr(entry.importable ? 'scopable' : 'manual')}</Typography></TableCell>
      </TableRow>)}</TableBody>
    </Table></TableContainer>
    <TablePagination component="div" count={entries.length} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[pageSize]} onPageChange={(_, next) => onPage(next)} />
  </>;
}
