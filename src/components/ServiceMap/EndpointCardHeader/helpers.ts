import type { Label } from '../service-map/types';

export const LogoType = { PROTOCOL: 'logo', EMOJI: 'emoji' } as const;
export type LogoType = typeof LogoType[keyof typeof LogoType];
export interface Logo { id: string; type: LogoType }

interface LogoEndpoint {
  type?: string;
  labels?: Label[];
  isCovalentRelated?: boolean;
  isWorld?: boolean;
  isDNS?: boolean;
  isHost?: boolean;
  isCIDR?: boolean;
  isAWS?: boolean;
  isPrometheusApp?: boolean;
  appProtocol?: string;
}

// Match Hubble's ApplicationKind and its special-identity priority. Application
// labels are normalized before matching; arbitrary service names use Kubernetes.
const protocols = new Set(['http', 'grpc', 'elasticsearch', 'kafka', 'rabbitmq', 'postgresql', 'mysql', 'redis', 'zookeeper', 'prometheus']);
const appKeys = new Set(['app', 'name', 'functionname', 'k8s-app']);
export function extractLogo(ep: LogoEndpoint): Logo {
  const labels = ep.labels ?? [];
  const app = ep.appProtocol || labels.find(l => appKeys.has(l.key.toLowerCase()
    .replace(/^(?:k8s:|any:|cni:)/, '').replace(/^io\.kubernetes\.pod\./, '').replace(/^app\.kubernetes\.io\//, '')))?.value;
  let id = 'kubernetes';
  if (ep.isCovalentRelated || labels.some(l => l.value === 'covalent-exporter' || l.value === 'covalent-agent')) id = 'covalent';
  else if (ep.isWorld || ep.isDNS || ep.type === 'world' || labels.some(l => l.key.startsWith('reserved:world'))) id = 'world';
  else if (ep.isHost || ep.type === 'host' || labels.some(l => l.key === 'reserved:host')) id = 'host';
  else if (ep.isCIDR && ep.isAWS) id = 'aws';
  else if (ep.isPrometheusApp || app === 'prometheus') id = 'prometheus';
  else if (app && protocols.has(app)) id = app;
  return { id, type: LogoType.PROTOCOL };
}
