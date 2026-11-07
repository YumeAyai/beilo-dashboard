// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { streamFlowEvents } from './flowStream';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it('authenticates SSE and handles split CRLF frames, malformed events and batches', async () => {
  let sink!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start(controller) { sink = controller; } });
  const request = vi.fn(async () => new Response(body));
  vi.stubGlobal('fetch', request);
  const onFlow = vi.fn();
  const stream = streamFlowEvents('/flows', () => ({ Authorization: 'Bearer fixture' }), onFlow);
  const encoder = new TextEncoder();
  sink.enqueue(encoder.encode(': heartbeat\r\n\r\ndata: {"verdict":"FOR'));
  sink.enqueue(encoder.encode('WARDED"}\r\n\r\ndata: invalid\n\ndata: {"flows":[{"verdict":"DROPPED"}]}\n\n'));
  await vi.waitFor(() => expect(onFlow).toHaveBeenCalledTimes(2));
  expect(request.mock.calls[0]).toBeDefined();
  const options = (request.mock.calls as unknown as [string, RequestInit][])[0][1];
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer fixture');
  expect(onFlow.mock.calls.map(([flow]) => flow.verdict)).toEqual(['FORWARDED', 'DROPPED']);
  stream.close();
  expect(options.signal?.aborted).toBe(true);
  sink.close();
});
it('reports expired authentication and stops instead of retrying unauthorized requests', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
  const expired = vi.fn(); window.addEventListener('auth:expired', expired);
  const state = vi.fn();
  const stream = streamFlowEvents('/flows', () => ({}), vi.fn(), state);
  await vi.waitFor(() => expect(state).toHaveBeenLastCalledWith('stopped'));
  expect(expired).toHaveBeenCalledOnce();
  stream.close(); window.removeEventListener('auth:expired', expired);
});
