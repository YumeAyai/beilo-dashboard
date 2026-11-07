import type { HubbleFlow } from '../types/hubble';

// Fetch carries the same bearer header as other API calls. EventSource cannot
// send that header. Parse complete SSE frames across arbitrary network chunks.
export function streamFlowEvents(url: string, headers: () => HeadersInit,
  onFlow: (flow: HubbleFlow) => void,
  onState?: (state: 'receiving' | 'reconnecting' | 'stopped') => void,
): { close(): void } {
  const controller = new AbortController();
  let retry: ReturnType<typeof setTimeout> | undefined;
  const connect = async () => {
    if (controller.signal.aborted) return;
    onState?.('reconnecting');
    try {
      const response = await fetch(url, { headers: headers(), signal: controller.signal });
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
        onState?.('stopped');
        return;
      }
      if (!response.ok || !response.body) throw new Error(`Flow stream: ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      onState?.('receiving');
      try {
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary: RegExpExecArray | null;
          while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
            const frame = buffer.slice(0, boundary.index);
            buffer = buffer.slice(boundary.index + boundary[0].length);
            const payload = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n');
            if (!payload) continue;
            try {
              const data = JSON.parse(payload);
              const flows = Array.isArray(data) ? data : Array.isArray(data?.flows) ? data.flows : [data];
              flows.forEach((flow: HubbleFlow) => { if (flow?.verdict) onFlow(flow); });
            } catch { /* A malformed event must not discard subsequent frames. */ }
          }
        }
      } finally { reader.releaseLock(); }
    } catch { /* Network failures reconnect unless the caller closed the stream. */ }
    if (!controller.signal.aborted) {
      onState?.('reconnecting');
      retry = setTimeout(() => { void connect(); }, 2000);
    }
  };
  void connect();
  return { close() { controller.abort(); clearTimeout(retry); } };
}
