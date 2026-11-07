import type { HubbleFlow } from '../../types/hubble';
import { isHubbleRequestFlow } from './graphData';

// The table keeps recent packets; the map keeps observed connections for the
// current collection session, like Hubble. Packet timestamps/flags/source ports
// must not make a connection disappear or trigger another layout.
export class FlowGraphHistory {
  private records = new Map<string, { signature: string; flow: HubbleFlow }>();

  clear(): void { this.records.clear(); }

  ingest(flows: HubbleFlow[]): boolean {
    let changed = false;
    for (const flow of flows) {
      if (!isHubbleRequestFlow(flow)) continue;
      const endpointKey = (ep: HubbleFlow['source']) => [ep?.namespace, ep?.podName, ep?.identity];
      const transport = flow.l4?.tcp ?? flow.l4?.udp ?? flow.l4?.sctp;
      const protocol = flow.l4?.tcp ? 'TCP' : flow.l4?.udp ? 'UDP' : flow.l4?.sctp ? 'SCTP' : flow.l4?.icmpv4 ? 'ICMPv4' : 'ICMPv6';
      const key = JSON.stringify([endpointKey(flow.source), endpointKey(flow.destination), protocol,
        transport?.destinationPort, flow.verdict, flow.l7?.http?.code,
        flow.l7?.http ? 'HTTP' : flow.l7?.dns ? 'DNS' : flow.l7?.kafka ? 'KAFKA' : '']);
      const metadata = (ep: HubbleFlow['source']) => ep && ({ ...ep,
        labels: [...(ep.labels ?? [])].sort(),
        workloads: [...(ep.workloads ?? [])].sort((a, b) => `${a.kind}/${a.name}`.localeCompare(`${b.kind}/${b.name}`)),
      });
      const signature = JSON.stringify([metadata(flow.source), metadata(flow.destination),
        flow.sourceService, flow.destinationService,
        [...(flow.sourceNamesList ?? [])].sort(), [...(flow.destinationNamesList ?? [])].sort()]);
      if (this.records.get(key)?.signature === signature) continue;
      this.records.set(key, { signature, flow });
      changed = true;
    }
    return changed;
  }

  snapshot(): HubbleFlow[] { return Array.from(this.records.values(), record => record.flow); }
}
