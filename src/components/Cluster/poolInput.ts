import type { IPPool, IPPoolInput, PoolBlock } from '../../types/cluster';

export function poolInput(pool: IPPool): IPPoolInput {
  const { name, resource_version, blocks, disabled, service_selector, allow_first_last_ips } = pool;
  return { name, resource_version, blocks, disabled, service_selector, allow_first_last_ips };
}
export function blockText(blocks: PoolBlock[]): string {
  return blocks.map(block => block.cidr || [block.start, block.stop].filter(Boolean).join(' - ')).join('\n');
}
export function parseBlocks(text: string): PoolBlock[] {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > 32) throw new Error('invalid_blocks');
  return lines.map(line => {
    if (line.includes('/')) return { cidr: line };
    const parts = line.split(/\s*[-–]\s*/);
    if (parts.length > 2 || parts.some(part => !part)) throw new Error('invalid_blocks');
    return { start: parts[0], ...(parts[1] ? { stop: parts[1] } : {}) };
  });
}
export function poolInUse(pool: IPPool): boolean { return pool.used === null || pool.used !== 0 || pool.services.length > 0; }
