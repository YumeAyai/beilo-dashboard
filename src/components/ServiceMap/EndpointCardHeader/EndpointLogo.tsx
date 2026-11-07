import { Box } from '@mui/material';
import { extractLogo } from './helpers';
import { logos } from './logos';

interface LogoProps {
  card: Parameters<typeof extractLogo>[0];
  size?: number;
}

export function EndpointLogo({ card, size = 80 }: LogoProps) {
  const { id } = extractLogo(card);
  return <Box component="img" src={logos[id] || logos.kubernetes} alt="" aria-hidden="true"
    data-hubble-logo={id} draggable={false}
    sx={{ width: size, height: size, display: 'block', objectFit: 'contain', flexShrink: 0 }} />;
}
