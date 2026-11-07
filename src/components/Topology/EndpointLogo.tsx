import { memo } from 'react';
import type { ServiceCardData } from '../ServiceMap/service-map/types';
import { extractLogo } from '../ServiceMap/EndpointCardHeader/helpers';
import { logos } from '../ServiceMap/EndpointCardHeader/logos';

export const EndpointLogo = memo(function EndpointLogo({ data, size = 28 }: { data: ServiceCardData; size?: number }) {
  const { id } = extractLogo(data);
  return <image x={24 - size / 2} y={26 - size / 2} width={size} height={size}
    href={logos[id] || logos.kubernetes} aria-hidden="true" />;
});
