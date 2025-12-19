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
      // a generic app wrapper commonly used
      const byAttr = document.querySelector('[data-scroll-root]');
      if (byAttr) candidates.push(byAttr);
    }

    // dedupe
    const containers = Array.from(new Set(candidates.filter(Boolean)));

    const onScroll = () => {
      // choose the largest scrollTop among containers as heuristic
      const tops = containers.map(getScrollTop);
      const maxTop = Math.max(...tops, 0);
      const next = maxTop > threshold;
      if (debug) console.debug('[useScrollShrink] scrollTops=', tops, 'maxTop=', maxTop, 'threshold=', threshold, 'next=', next);
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
