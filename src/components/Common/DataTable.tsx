import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TablePagination, Box, Checkbox, Typography, Skeleton,
} from '@mui/material';
import type { TableCellProps } from '@mui/material';
import { useState, useCallback } from 'react';

export interface Column<T = Record<string, unknown>> {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown, row?: T) => React.ReactNode;
  style?: TableCellProps['style'];
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyMessage?: string;
  stickyHeader?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  getRowKey,
  onRowClick,
  selectedIds = [],
  onSelectionChange,
  emptyMessage = '暂无数据',
  stickyHeader = true,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && onSelectionChange) {
      onSelectionChange(rows.map(getRowKey));
    } else if (onSelectionChange) {
      onSelectionChange([]);
    }
  }, [rows, getRowKey, onSelectionChange]);

  const handleSelectRow = useCallback((id: string) => {
    if (onSelectionChange) {
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter(i => i !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    }
  }, [selectedIds, onSelectionChange]);

  const handleChangePage = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+e.target.value);
    setPage(0);
  }, []);

  if (loading) {
    return (
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table stickyHeader={stickyHeader}>
            <TableHead>
              <TableRow>
                {onSelectionChange && (
                  <TableCell padding="checkbox" sx={{ width: 48 }}>
                    <Skeleton variant="rectangular" width={20} height={20} />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align}
                    style={{ minWidth: col.minWidth, ...col.style }}
                  >
                    <Skeleton width={60} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[...Array(rowsPerPage)].map((_, i) => (
                <TableRow key={i}>
                  {onSelectionChange && (
                    <TableCell padding="checkbox">
                      <Skeleton variant="rectangular" width={20} height={20} />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  }

  const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {onSelectionChange && (
                <TableCell padding="checkbox" sx={{ width: 48 }}>
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < rows.length}
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align}
                  style={{ minWidth: col.minWidth, ...col.style }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {col.label}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (onSelectionChange ? 1 : 0)}
                  align="center"
                  sx={{ py: 8 }}
                >
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => {
                const id = getRowKey(row);
                const isSelected = selectedIds.includes(id);
                return (
                  <TableRow
                    key={id}
                    hover
                    selected={isSelected}
                    onClick={() => onRowClick?.(row)}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {onSelectionChange && (
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectRow(id)}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align} style={col.style}>
                        {col.format
                          ? col.format(row[col.id as keyof T], row as T)
                          : String(row[col.id as keyof T] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="每页行数"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count}`}
      />
    </Paper>
  );
}

// 简洁版表格（无分页）
export interface SimpleTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  maxHeight?: number | string;
  emptyMessage?: string;
}

export function SimpleTable<T>({
  columns,
  rows,
  loading = false,
  getRowKey,
  onRowClick,
  maxHeight = 400,
  emptyMessage = '暂无数据',
}: SimpleTableProps<T>) {
  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={48} sx={{ my: 0.5 }} />
        ))}
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ maxHeight }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.id}
                align={col.align}
                style={{ minWidth: col.minWidth }}
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  {col.label}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={getRowKey(row)}
                hover
                onClick={() => onRowClick?.(row)}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <TableCell key={col.id} align={col.align}>
                    {col.format
                      ? col.format(row[col.id as keyof T], row as T)
                      : String(row[col.id as keyof T] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
