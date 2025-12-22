import { useEffect, useRef } from 'react';

/**
 * Hook to auto-scroll a container when new items are added
 * 
 * @param {Array} dependencies - Array of values that trigger scroll when changed
 * @param {React.RefObject} containerRef - Ref to the scrollable container
 * @param {Object} options - Configuration options
 */
export const useAutoScroll = (dependencies, containerRef, options = {}) => {
  const { 
    behavior = 'smooth', 
    threshold = 100,  // Distance from bottom to trigger auto-scroll
    enabled = true 
  } = options;
  
  const prevDepsLengthRef = useRef(0);
  const isUserScrolledRef = useRef(false);

  useEffect(() => {
    if (!enabled || !containerRef?.current) return;

    const container = containerRef.current;
    
    // Check if user has scrolled up (not at bottom)
    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      isUserScrolledRef.current = distanceFromBottom > threshold;
    };

    // Add scroll listener
    container.addEventListener('scroll', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
    };
  }, [containerRef, threshold, enabled]);

  useEffect(() => {
    if (!enabled || !containerRef?.current) return;

    const depsLength = Array.isArray(dependencies) ? dependencies.length : 0;
    
    // Only auto-scroll if new items were added and user hasn't scrolled up
    if (depsLength > prevDepsLengthRef.current && !isUserScrolledRef.current) {
      const container = containerRef.current;
      
      // Scroll to bottom
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }

    prevDepsLengthRef.current = depsLength;
  }, [dependencies, containerRef, behavior, enabled]);
};

export default useAutoScroll;
