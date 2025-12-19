import { useEffect, useState } from 'react';

// Hook: returns true when the primary scroll container has scrolled past threshold.
// It listens to window as well as common app containers (#root, #app, document.scrollingElement)
// Usage: const scrolled = useScrollShrink(10);
export default function useScrollShrink(threshold = 10, { debug = false } = {}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const getScrollTop = (target) => {
      if (!target) return 0;
      if (target === window) return window.scrollY || window.pageYOffset || 0;
      return target.scrollTop || 0;
    };

    // Candidate scroll containers to observe
    const candidates = [window];
    if (typeof document !== 'undefined') {
      if (document.scrollingElement) candidates.push(document.scrollingElement);
  const root = document.getElementById('root') || document.getElementById('app');
  if (root) candidates.push(root);
  // explicitly include .scrollContainer if present (used by ScrollToTop)
  const scrollContainer = document.querySelector('.scrollContainer');
  if (scrollContainer) candidates.push(scrollContainer);
  // a generic app wrapper commonly used
  const byAttr = document.querySelector('[data-scroll-root]');
  if (byAttr) candidates.push(byAttr);
    }

    // dedupe
    const containers = Array.from(new Set(candidates.filter(Boolean)));

    if (debug) {
      // show a concise summary of what the hook will observe on mount
      const ids = containers.map((c) => {
        try {
          if (c === window) return 'window';
          if (c.id) return `#${c.id}`;
          if (c.className) return `.${String(c.className).split(' ')[0]}`;
          return c.tagName || 'element';
        } catch (e) {
          return 'unknown';
        }
      });
      // also include more metrics so we can tell which containers are scrollable
      const metrics = containers.map((c) => {
        try {
          if (c === window) {
            return {
              name: 'window',
              scrollTop: window.scrollY || window.pageYOffset || 0,
              clientHeight: document.documentElement.clientHeight,
              scrollHeight: document.documentElement.scrollHeight,
              overflowY: window.getComputedStyle(document.documentElement).overflowY || 'visible'
            };
          }
          return {
            name: c.id ? `#${c.id}` : c.className ? `.${String(c.className).split(' ')[0]}` : (c.tagName || 'element'),
            scrollTop: c.scrollTop || 0,
            clientHeight: c.clientHeight || 0,
            scrollHeight: c.scrollHeight || 0,
            overflowY: window.getComputedStyle(c).overflowY || 'visible'
          };
        } catch (e) {
          return { name: 'unknown', error: String(e) };
        }
      });
      // use console.log (more likely to be visible than console.debug)
      console.log('[useScrollShrink] init — observing:', ids, 'threshold=', threshold, 'metrics=', metrics);
    }

    const onScroll = () => {
      // choose the largest scrollTop among containers as heuristic
      const tops = containers.map(getScrollTop);
      const maxTop = Math.max(...tops, 0);
      const next = maxTop > threshold;
      if (debug) {
        const detailed = containers.map((c, i) => ({
          name: (c === window ? 'window' : (c.id ? `#${c.id}` : (c.className ? `.${String(c.className).split(' ')[0]}` : c.tagName || 'element'))),
          scrollTop: tops[i],
          clientHeight: c === window ? document.documentElement.clientHeight : (c.clientHeight || 0),
          scrollHeight: c === window ? document.documentElement.scrollHeight : (c.scrollHeight || 0),
          overflowY: (() => { try { return window.getComputedStyle(c).overflowY; } catch (e) { return 'unknown'; } })()
        }));
        console.log('[useScrollShrink] scroll details=', detailed, 'maxTop=', maxTop, 'threshold=', threshold, 'next=', next);
      }
      setScrolled((prev) => (prev === next ? prev : next));
    };

    // initial check
    onScroll();

    containers.forEach((c) => c.addEventListener ? c.addEventListener('scroll', onScroll, { passive: true }) : null);

    // also observe window resize (content height change)
    window.addEventListener('resize', onScroll);

    return () => {
      containers.forEach((c) => c.removeEventListener ? c.removeEventListener('scroll', onScroll) : null);
      window.removeEventListener('resize', onScroll);
    };
  }, [threshold, debug]);

  return scrolled;
}
