import { action, observable, makeObservable, computed } from 'mobx';
import type { NodeType, Label } from '../service-map/types';

export class ServiceCard {
  public id: string = '';
  public label: string = '';
  public namespace: string = '';
  public type: NodeType = 'service';
  public ports: number[] = [];
  public isExternal: boolean = false;
  public isWorld: boolean = false;
  public isHost: boolean = false;
  public domain: string | null = null;
  public labels: Label[] = [];
  public pods: number = 0;
  public cpuUsage: number = 0;
  public memoryUsage: number = 0;
  public identity: number = 0;
  public workloads: Array<{ kind: string; name: string }> = [];
  public dnsNames: string[] = [];
  public accessPoints: Map<string, { port: number; protocol: string; l7Protocol?: string }> = new Map();

  constructor(data: {
    id: string;
    label: string;
    namespace: string;
    type: NodeType;
    ports?: number[];
    isExternal?: boolean;
    isWorld?: boolean;
    isHost?: boolean;
    domain?: string | null;
    labels?: Label[];
    pods?: number;
    cpuUsage?: number;
    memoryUsage?: number;
    identity?: number;
  }) {
    makeObservable(this, {
      id: observable,
      label: observable,
      namespace: observable,
      type: observable,
      ports: observable,
      isExternal: observable,
      isWorld: observable,
      isHost: observable,
      domain: observable,
      labels: observable,
      pods: observable,
      cpuUsage: observable,
      memoryUsage: observable,
      identity: observable,
      accessPoints: observable,
      upsertAccessPoint: action,
      isCovalentRelated: computed,
      isDNS: computed,
      isAWS: computed,
      isPrometheusApp: computed,
      appProtocol: computed,
    });

    this.id = data.id;
    this.label = data.label;
    this.namespace = data.namespace;
    this.type = data.type;
    this.ports = data.ports || [80];
    this.isExternal = data.isExternal || false;
    this.isWorld = data.isWorld || false;
    this.isHost = data.isHost || false;
    this.domain = data.domain || null;
    this.labels = data.labels || [];
    this.pods = data.pods || 0;
    this.cpuUsage = data.cpuUsage || 0;
    this.memoryUsage = data.memoryUsage || 0;
    this.identity = data.identity || 0;
  }

  public static fromData(data: {
    id: string;
    label: string;
    namespace: string;
    type: NodeType;
    ports?: number[];
    isExternal?: boolean;
    isWorld?: boolean;
    isHost?: boolean;
    domain?: string | null;
    labels?: Label[];
    pods?: number;
    cpuUsage?: number;
    memoryUsage?: number;
    identity?: number;
  }): ServiceCard {
    return new ServiceCard(data);
  }

  public upsertAccessPoint(port: number, protocol: string, l7Protocol?: string) {
    const key = `${this.id}:${port}`;
    this.accessPoints.set(key, { port, protocol, l7Protocol });
  }

  public get isRemoteNode(): boolean {
    return this.labels.some(l => l.key === 'node.kubernetes.io/instance-type' && l.value?.includes('remote'));
  }

  public get isIngress(): boolean {
    return this.type === 'ingress';
  }

  public get isKubeDNS(): boolean {
    return this.label.includes('kube-dns') || this.label.includes('coredns');
  }

  public get isDNS(): boolean {
    return this.isWorld && this.domain != null;
  }

  public get isCovalentRelated(): boolean {
    return this.labels.some(l =>
      l.value === 'covalent-exporter' || l.value === 'covalent-agent'
    );
  }

  public get isCIDR(): boolean {
    return false;
  }

  public get isAWS(): boolean {
    const appProto = this.appProtocol;
    return appProto?.toLowerCase().includes('aws') ?? false;
  }

  public get isPrometheusApp(): boolean {
    return this.labels.some(l =>
      l.key === 'app' && l.value === 'prometheus'
    );
  }

  public get appProtocol(): string | undefined {
    const appLabel = this.labels.find(l => l.key === 'app');
    return appLabel?.value;
  }

  public get appName(): string {
    const appLabel = this.labels.find(l => l.key === 'app.kubernetes.io/name');
    return appLabel?.value || this.label;
  }

  public get workloadName(): string | null {
    const workload = this.labels.find(l => l.key === 'workload');
    return workload?.value || null;
  }

  public get caption(): string {
    if (this.isWorld && this.domain) {
      return this.domain;
    }
    if (this.isIngress) return 'Ingress';
    return this.appName;
  }

  public get worldLabel(): string | null {
    const worldLabel = this.labels.find(l =>
      l.key.includes('reserved:world') ||
      l.key.includes('reserved:world-ipv4') ||
      l.key.includes('reserved:world-ipv6')
    );
    return worldLabel?.key || null;
  }
}