import { useEffectEvent, useLayoutEffect, useRef, type RefObject } from 'react';

export interface MutationObserverHookOptions {
  elem?: string | Element;
  ref?: RefObject<Element | null>;
  options?: MutationObserverInit & { all?: boolean };
}

export type MutationObserverHookCallback = (m: MutationRecord[], ob: MutationObserver) => void;

export function useMutationObserver(opts: MutationObserverHookOptions, cb: MutationObserverHookCallback) {
  const notify = useEffectEvent(cb);
  const observation = useRef<{ target: Node; key: string; observer: MutationObserver } | null>(null);

  // Resolve the ref after every commit: the node can be replaced or appear after loading.
  // Keep the existing observer when the target and options are unchanged.
  useLayoutEffect(() => {
    const target = getTarget(opts);
    const options = getOptions(opts.options);
    const key = JSON.stringify(options);
    if (target === observation.current?.target && key === observation.current.key) return;
    observation.current?.observer.disconnect();
    observation.current = null;
    if (!target) return;
    const observer = new MutationObserver((records, ob) => notify(records, ob));
    observer.observe(target, options);
    observation.current = { target, key, observer };
  });

  useLayoutEffect(() => () => {
    observation.current?.observer.disconnect();
    observation.current = null;
  }, []);
}

export function createMutationObserver(
  opts: MutationObserverHookOptions,
  cb: MutationObserverHookCallback,
): MutationObserver | null {
  const target = getTarget(opts);
  if (!target) return null;
  const observer = new MutationObserver(cb);
  observer.observe(target, getOptions(opts.options));
  return observer;
}

function getTarget(opts: MutationObserverHookOptions): Node | null {
  if (typeof opts.elem === 'string') return document.querySelector(opts.elem);
  return opts.elem ?? opts.ref?.current ?? null;
}

function getOptions(opts: MutationObserverHookOptions['options']): MutationObserverInit {
  const { all = opts === undefined, ...options } = opts ?? {};
  return {
    ...(all ? { attributes: true, childList: true, subtree: true, characterData: true } : {}),
    ...options,
  };
}
