import { useEffect } from 'react';

/**
 * Calls `onOutside` when a pointer event lands outside every ref in `refs`
 * (and, if `escapeKey` is set, on Escape too). Used to close popovers/menus.
 * `refs` may be a single ref or an array of refs whose subtree counts as "inside".
 */
export function useClickOutside(refs, onOutside, options = {}) {
  const { active = true, event = 'mousedown', escapeKey = false } = options;

  useEffect(() => {
    if (!active) return undefined;
    const refList = Array.isArray(refs) ? refs : [refs];

    const handlePointer = (e) => {
      const isInside = refList.some((ref) => ref?.current?.contains(e.target));
      if (isInside) return;
      onOutside(e);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onOutside(e);
    };

    document.addEventListener(event, handlePointer);
    if (escapeKey) document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener(event, handlePointer);
      if (escapeKey) document.removeEventListener('keydown', handleKeyDown);
    };
    // refs are stable useRef objects; only re-subscribe when behavior-affecting options change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, event, escapeKey, onOutside]);
}
