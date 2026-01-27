import React, { useEffect, useRef, useState } from 'react';
import './PageLayout.css';

const PageLayout = ({ Navbar, children }) => {
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const lastY = useRef(0);
  const ticking = useRef(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sc = containerRef.current;
    if (!sc) return;

    // Measure navbar height and expose as CSS variable for responsive styling
    const updateNavbarHeight = () => {
      try {
        const h = headerRef.current ? headerRef.current.offsetHeight : 0;
        if (h && sc) sc.style.setProperty('--actual-navbar-height', `${h}px`);
      } catch (e) {
        // Ignore measurement errors
      }
    };
    updateNavbarHeight();
    window.addEventListener('resize', updateNavbarHeight);

    lastY.current = sc.scrollTop || 0;

    // Hide navbar on scroll down, show on scroll up
    const onScroll = () => {
      const current = sc.scrollTop;
      
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const delta = current - lastY.current;
          
          if (delta < 0) {
            // Show on any upward scroll
            setHidden(false);
          } else if (delta > 6 && current > 40) {
            // Hide on downward scroll (not at page top)
            setHidden(true);
          }
          
          lastY.current = current;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    sc.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', updateNavbarHeight);
      sc.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className="layoutRoot">
      {Navbar && (
        <header ref={headerRef} className={`navbarWrapper ${hidden ? 'navbarHidden' : ''}`}>
          <Navbar />
        </header>
      )}
      
      <div className="scrollContainer" ref={containerRef}>
        <div className="contentWrapper">
          <main className="mainContent">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
