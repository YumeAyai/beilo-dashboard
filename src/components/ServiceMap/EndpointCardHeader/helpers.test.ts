import { expect, it } from 'vitest';
import { extractLogo } from './helpers';
import { logos } from './logos';

it.each([
  [{ type: 'world' }, 'world'],
  [{ type: 'host' }, 'host'],
  [{ labels: [{ key: 'reserved:world-ipv4', value: '' }] }, 'world'],
  [{ labels: [{ key: 'k8s:app', value: 'redis' }] }, 'redis'],
  [{ labels: [{ key: 'k8s:app.kubernetes.io/name', value: 'postgresql' }] }, 'postgresql'],
  [{ labels: [{ key: 'k8s:app', value: 'prometheus' }] }, 'prometheus'],
  [{ labels: [{ key: 'k8s:app', value: 'frontend' }] }, 'kubernetes'],
  [{ labels: [{ key: 'k8s:app', value: 'covalent-agent' }] }, 'covalent'],
] as const)('uses the Hubble logo for %j', (input, expected) => {
  const endpoint = { ...input, labels: 'labels' in input ? [...input.labels] : [] };
  const { id } = extractLogo(endpoint);
  expect(id).toBe(expected);
  expect(logos[id]).toMatch(/\/hubble\/icons\/logos\/.*\.(svg|png)$/);
});

it('uses the same original world graphic for Host and World, as Hubble does', () => {
  expect(logos.host).toBe(logos.world);
});
