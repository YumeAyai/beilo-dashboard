// MUI组件样式覆盖
import type { Components, Theme } from '@mui/material/styles';
import { colors } from './colors';

// Preserve the chosen pastel backgrounds; override only MUI's automatic label color.
const semanticColors = new Set(['error', 'success', 'warning', 'info']);

export const componentStyles: Components<Theme> = {
  // 卡片样式
  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 12,
        ...(theme.palette.mode === 'dark' ? {
          border: '1px solid rgba(130, 167, 219, 0.15)',
          boxShadow: '0 4px 20px rgba(2, 8, 20, 0.18)',
        } : { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }),
        transition: 'box-shadow 0.2s ease-out, border-color 0.2s ease-out',
        '&:hover': {
          ...(theme.palette.mode === 'dark' ? {
            borderColor: 'rgba(130, 177, 242, 0.3)',
            boxShadow: '0 6px 24px rgba(2, 8, 20, 0.28), 0 0 18px rgba(71, 126, 208, 0.06)',
          } : { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }),
        },
      }),
    },
  },
  // 按钮样式
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        textTransform: 'none',
        fontWeight: 500,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      contained: ({ ownerState, theme }) => {
        const whiteLabel = theme.palette.mode === 'dark' && !ownerState.disabled
          && semanticColors.has(ownerState.color || 'primary');
        return {
          ...(whiteLabel && { color: '#FFFFFF' }),
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        };
      },
    },
  },
  // 表格样式
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: 1,
        borderColor: 'divider',
        padding: '12px 16px',
      },
      head: {
        fontWeight: 600,
        backgroundColor: 'transparent',
        color: 'text.primary',
      },
    },
  },
  // 表格容器
  MuiTableContainer: {
    styleOverrides: {
      root: {
        backgroundColor: 'transparent',
      },
    },
  },
  // 表格行样式
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        '&.Mui-selected': {
          backgroundColor: 'action.selected',
        },
      },
    },
  },
  // 输入框样式
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: 2,
          },
        },
      },
    },
  },
  // 选择框样式
  MuiSelect: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  // 提示框样式
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: 'var(--mui-tooltip-bg)',
        color: 'var(--mui-tooltip-color)',
        borderRadius: 6,
        fontSize: 12,
        padding: '8px 12px',
      },
      arrow: {
        color: 'var(--mui-tooltip-bg)',
      },
    },
  },
  // 菜单样式
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      },
    },
  },
  // 对话框样式
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
      },
    },
  },
  // Chip样式
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 500,
      },
      filled: ({ ownerState, theme }) => {
        const whiteLabel = theme.palette.mode === 'dark'
          && semanticColors.has(ownerState.color || 'default');
        return whiteLabel ? {
          color: '#FFFFFF',
          '& .MuiChip-deleteIcon': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': { color: '#FFFFFF' },
          },
        } : {};
      },
    },
  },
  // 标签页样式
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        minHeight: 48,
      },
    },
  },
  // 开关样式
  MuiSwitch: {
    styleOverrides: {
      root: {
        width: 44,
        height: 24,
        padding: 0,
      },
      switchBase: {
        padding: 2,
        '&.Mui-checked': {
          transform: 'translateX(20px)',
          color: '#fff',
          '& + .MuiSwitch-track': {
            backgroundColor: 'primary.main',
            opacity: 1,
          },
        },
      },
      thumb: {
        width: 20,
        height: 20,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        backgroundColor: '#fff',
      },
      track: {
        borderRadius: 12,
        backgroundColor: '#C4CDD6',
        opacity: 1,
      },
    },
  },
  // 进度条样式
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        height: 8,
      },
      bar: {
        borderRadius: 4,
      },
    },
  },
  // 弹窗样式
  MuiPopover: {
    styleOverrides: {
      paper: {
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      },
    },
  },
  // Alert样式
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
      standardSuccess: {
        backgroundColor: 'var(--mui-alert-success-bg)',
        border: '1px solid',
        borderColor: 'var(--mui-alert-success-border)',
        color: 'var(--mui-alert-success-color)',
      },
      standardError: {
        backgroundColor: 'var(--mui-alert-error-bg)',
        border: '1px solid',
        borderColor: 'var(--mui-alert-error-border)',
        color: 'var(--mui-alert-error-color)',
      },
      standardWarning: {
        backgroundColor: 'var(--mui-alert-warning-bg)',
        border: '1px solid',
        borderColor: 'var(--mui-alert-warning-border)',
        color: 'var(--mui-alert-warning-color)',
      },
      standardInfo: {
        backgroundColor: 'var(--mui-alert-info-bg)',
        border: '1px solid',
        borderColor: 'var(--mui-alert-info-border)',
        color: 'var(--mui-alert-info-color)',
      },
    },
  },
  // 滚动条样式
  MuiCssBaseline: {
    styleOverrides: (theme) => ({
      body: {
        colorScheme: theme.palette.mode,
        // Static CSS stars stay behind opaque data surfaces, without motion or extra assets.
        backgroundImage: theme.palette.mode === 'dark' ? [
          'radial-gradient(ellipse at 82% 0%, rgba(51, 93, 164, 0.19), transparent 54%)',
          'radial-gradient(ellipse at 12% 80%, rgba(47, 65, 125, 0.1), transparent 48%)',
          'radial-gradient(1px 1px at 54px 83px, rgba(199, 221, 255, 0.42) 50%, transparent)',
          'radial-gradient(1px 1px at 217px 263px, rgba(163, 197, 245, 0.28) 50%, transparent)',
          'radial-gradient(1.5px 1.5px at 481px 139px, rgba(219, 234, 255, 0.4) 50%, transparent)',
          'radial-gradient(1px 1px at 689px 387px, rgba(163, 197, 245, 0.32) 50%, transparent)',
          'radial-gradient(1px 1px at 354px 511px, rgba(199, 221, 255, 0.3) 50%, transparent)',
          'radial-gradient(1px 1px at 761px 563px, rgba(199, 221, 255, 0.24) 50%, transparent)',
        ].join(', ') : 'none',
        backgroundSize: '100% 100%, 100% 100%, 821px 647px, 821px 647px, 821px 647px, 821px 647px, 821px 647px, 821px 647px',
        backgroundAttachment: 'fixed',
      },
      '*::-webkit-scrollbar': {
        width: 8,
        height: 8,
      },
      '*::-webkit-scrollbar-track': {
        background: 'transparent',
        borderRadius: 4,
      },
      '*::-webkit-scrollbar-thumb': {
        background: theme.palette.mode === 'dark' ? '#3B5070' : '#C4CDD6',
        borderRadius: 4,
        '&:hover': {
          background: theme.palette.mode === 'dark' ? '#5D779B' : '#86909C',
        },
      },
      html: {
        scrollbarColor: `${theme.palette.mode === 'dark' ? '#3B5070' : '#C4CDD6'} transparent`,
      },
    }),
  },
  // Paper 组件
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.background.paper,
        ...(theme.palette.mode === 'dark' && { backgroundImage: 'none' }),
      }),
    },
  },
  // Divider
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: 'divider',
      },
    },
  },
  // Drawer抽屉
  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }) => ({
        ...(theme.palette.mode === 'dark' && { backgroundColor: colors.background.navigationDark }),
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
      }),
      modal: {
        transition: 'background-color 0.3s ease',
      },
    },
  },
  // AppBar
  MuiAppBar: {
    styleOverrides: {
      root: {
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
      },
    },
  },
  // ListItem
  MuiListItemButton: {
    styleOverrides: {
      root: {
        transition: 'background-color 0.3s ease',
      },
    },
  },
};
