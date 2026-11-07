import { Box, type SxProps, type Theme } from '@mui/material';

export type HubbleIconName = 'cross' | 'chevron-down' | 'filter' | 'refresh' | 'arrow-right' | 'zoom-in' | 'zoom-out' | 'zoom-to-fit' | 'properties' | 'layout' | 'lock' | 'search' | 'graph' | 'namespace' | 'visual-filters' | 'verdict-filters';
interface HubbleIconProps {
  name: HubbleIconName;
  size?: number;
  fontSize?: 'small' | 'medium' | 'large';
  sx?: SxProps<Theme>;
  className?: string;
}

// Hubble's original Blueprint glyphs, with a CSS mask to inherit light/dark text
// color. The two custom filter icons retain their white foreground geometry.
export function HubbleIcon({ name, size, fontSize, sx, className }: HubbleIconProps) {
  const dimension = size ?? (fontSize ? { small: 20, medium: 24, large: 35 }[fontSize] : 16);
  if (name === 'visual-filters' || name === 'verdict-filters') {
    return <Box component="svg" aria-hidden="true" className={className} data-hubble-icon={name}
      viewBox="0 0 21 16" sx={{ width: dimension * 21 / 16, height: dimension, flexShrink: 0, fill: 'currentColor', ...sx }}>
      <rect width="21" height="16" rx="2" />
      <path d="M14.857 6.393l-4.238-4.238a.538.538 0 00-.76 0L7.74 4.274c-.21.21-.21.55 0 .76l1.494 1.494L8.12 7.642l-.027-.027a.46.46 0 00-.652 0l-3.314 3.314a.46.46 0 000 .652l1.25 1.25c.18.18.472.18.652 0l3.314-3.315a.46.46 0 000-.651l-.027-.028 1.113-1.113 1.549 1.548c.21.21.55.21.76 0l2.119-2.118c.21-.21.21-.551 0-.761zM16.596 12.998H9.682v-1.222c0-.343.278-.622.622-.622h5.67c.344 0 .623.278.623.622v1.222z" fill="#fff" />
    </Box>;
  }
  const src = `${import.meta.env.BASE_URL}hubble/icons/${name === 'namespace' ? 'misc/namespace-icon.svg' : `blueprint/16px/${name}.svg`}`;
  return <Box component="span" aria-hidden="true" className={className} data-hubble-icon={name}
    sx={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', fontSize: dimension,
      width: '1em', height: '1em', bgcolor: 'currentColor',
      mask: `url("${src}") center / contain no-repeat`, WebkitMask: `url("${src}") center / contain no-repeat`, ...sx }} />;
}

export function HubbleChevronDown({ className }: { className?: string }) {
  return <HubbleIcon name="chevron-down" className={className} />;
}
