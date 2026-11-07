// Hubble identifies a connector by receiver + sorted destination access points,
// never by the sending card. Protocol is retained to separate TCP/UDP ports.
export function accessPointId(cardId: string, port?: number, protocol?: string): string {
  return port ? `ap-${cardId}-${(protocol || 'TCP').toUpperCase()}-${port}` : `ap-${cardId}-unknown`;
}
export function cardConnectorId(cardId: string, accessPointIds: Iterable<string>): string {
  return `cnctr-${cardId}-(${Array.from(accessPointIds).sort().join('/')})`;
}
