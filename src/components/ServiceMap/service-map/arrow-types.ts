import { type XYWH } from '../geometry';
import type { ServiceCardData } from './types';

export interface ConnectionInfo {
  senderCardId: string;
  receiverCardId: string;
  accessPoints: Array<{
    port: number;
    protocol: string;
    id: string;
    verdicts: Set<string>;
  }>;
}

export interface NodeBBox {
  id: string;
  data: ServiceCardData;
  bbox: XYWH;
}

export interface ArrowInput {
  nodes: NodeBBox[];
  connections: ConnectionInfo[];
}
