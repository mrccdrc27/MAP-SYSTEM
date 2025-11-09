import { useEffect, useRef } from 'react';

export const useAutoScroll = (messages, containerRef) => {
  const shouldAutoScrollRef = useRef(true);

  // Detect whether user manually scrolled away from bottom
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - clientHeight - scrollTop < 100;

    shouldAutoScrollRef.current = isNearBottom;
  };

  // Attach scroll listener once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll when messages change
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldAutoScrollRef.current) return;

    // Wait for DOM paint to ensure messages are fully rendered
    const timeout = setTimeout(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }, 50);

    return () => clearTimeout(timeout);
  }, [messages]);
};