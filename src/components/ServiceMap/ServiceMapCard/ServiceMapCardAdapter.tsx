import { EndpointLogo } from '../EndpointCardHeader/EndpointLogo';
import { accessPointId } from '../service-map/connection-ids';
import { Box, Typography } from '@mui/material';
import { memo, type Ref } from 'react';
import { Card } from '../Card';
import { XYWH } from '../geometry';
import { CARD_HEIGHT, CARD_WIDTH, type AccessPoint, type ServiceCardData } from '../service-map/types';
import { EndpointCardLabels } from './EndpointCardLabels';
import { HttpEndpoint } from './HttpEndpoint';

interface ServiceMapCardAdapterProps {
  data: ServiceCardData;
  active?: boolean;
  dimmed?: boolean;
  currentNamespace?: string;
  onClick?: (data: ServiceCardData) => void;
  x?: number;
  y?: number;
  height?: number;
  cardRef?: Ref<HTMLDivElement>;
  accessPointRef?: (id: string, element: HTMLImageElement | null) => void;
}

// Hubble renders HTML cards inside SVG foreignObjects. Their intrinsic height is
// measured by the canvas and fed back into both placement and arrow routing.
export const ServiceMapCardAdapter = memo(function ServiceMapCardAdapter({
  data, active = false, dimmed = false, currentNamespace, onClick,
  x = 0, y = 0, height = CARD_HEIGHT, cardRef, accessPointRef,
}: ServiceMapCardAdapterProps) {
  const special = data.isWorld || data.isHost || data.type === 'world' || data.type === 'host';
  const title = data.domain || data.labels?.find(l => l.key.replace(/^k8s:/, '') === 'app.kubernetes.io/name')?.value
    || data.labels?.find(l => l.key.replace(/^k8s:/, '') === 'app')?.value || data.label;
  const accessPoints: AccessPoint[] = data.accessPoints?.length ? data.accessPoints
    : (data.ports ?? []).map(port => ({ port, protocol: 'TCP' as const }));

  const showNamespace = !!data.namespace && data.namespace !== currentNamespace && !special;
  const dot = <Box sx={{ width: 10, height: 10, flexShrink: 0, borderRadius: '50%', bgcolor: '#c8cdd3', mx: '10px' }} />;

  return (
    <g opacity={dimmed ? 0.25 : 1} style={{ transition: 'opacity 160ms ease' }}>
      <Card card={data} coords={XYWH.fromArgs(x, y, CARD_WIDTH, height)}
        className={`service-map-card${active ? ' active' : ''}`} isUnsizedMode divRef={cardRef}
        onClick={() => onClick?.(data)}>
        <Box sx={{ bgcolor: 'transparent', borderRadius: '10px', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px', p: '10px 20px' }}>
            <Box sx={{ width: 80, height: 80, m: '10px', flexShrink: 0, display: 'grid', placeItems: 'center', color: special ? '#6787af' : '#326ce5' }}>
              <EndpointLogo card={data} size={80} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography title={title} sx={{ fontWeight: 700, fontSize: showNamespace ? 28 : 32, color: '#303030', lineHeight: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Typography>
              {showNamespace && (
                <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 'inherit', color: '#969696' }}>{data.namespace}</Typography>
              )}
            </Box>
          </Box>
          {accessPoints.length > 0 && (
            <Box sx={{ mx: '20px', mb: active && data.labels?.length ? 0 : '20px', p: '15px', border: '1px solid #d4d4d4', borderRadius: '10px' }}>
              {accessPoints.map(ap => (
                <Box key={`${ap.protocol}:${ap.port}`} data-access-point={`${ap.protocol}:${ap.port}`} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: '10px' }}>
                    <Box component="img" ref={(el: HTMLImageElement | null) => accessPointRef?.(accessPointId(data.id, ap.port, ap.protocol), el)} src={`${import.meta.env.BASE_URL}hubble/icons/misc/access-point.svg`} alt="" aria-hidden="true" sx={{ width: 25, height: 25, flexShrink: 0 }} />
                    <Box component="img" src={`${import.meta.env.BASE_URL}hubble/icons/misc/ap-arrow-violet.svg`} alt="" aria-hidden="true" sx={{ width: 20, ml: '10px' }} />
                  </Box>
                  <Box sx={{ fontSize: 24, fontWeight: 700, color: '#7129ba' }}>{ap.port}</Box>
                  {dot}
                  <Box sx={{ fontSize: 20, color: '#000' }}>{ap.protocol}</Box>
                  {ap.l7Protocol && <>{dot}<Box sx={{ fontSize: 20, color: '#000' }}>{ap.l7Protocol}</Box></>}
                </Box>
              ))}
            </Box>
          )}
          {active && !!data.labels?.length && <EndpointCardLabels labels={data.labels} />}
          {active && data.l7Endpoints?.map(ep => <HttpEndpoint key={`${ep.method}:${ep.url}`} endpoint={{ method: ep.method, pathname: ep.url }} />)}
        </Box>
      </Card>
    </g>
  );
});
