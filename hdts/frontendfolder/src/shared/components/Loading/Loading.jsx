import styles from './Loading.module.css';

/**
 * ButtonLoading - For inline button loading states
 * Size: 16px × 16px, 2px border with 3px top border
 */
export function LoadingButton() {
  return <div className={styles.loadingButton} />;
}

/**
 * LoadingDots - 8 animated dots with staggered timing
 * Used in SystemLoading component
 */
function LoadingDots() {
  return (
    <div className={styles.loadingDotsContainer}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <div
          key={index}
          className={styles.loadingDot}
          style={{
            left: `${index * 11}px`,
            animationDelay: `${index * 0.15}s`,
            backgroundColor: index % 2 === 0 ? '#ef4444' : 'var(--primary-color, #667eea)',
          }}
        />
      ))}
    </div>
  );
}

/**
 * SystemLoading - Full screen system loading with logo and title
 * Covers full viewport with centered content
 */
function SystemLoading() {
  return (
    <div className={styles.systemLoadingContainer}>
      <div className={styles.loadingContent}>
        {/* Logo - 160px × 160px */}
        <div className={styles.loadingLogo}>
          {/* System Logo SVG */}
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="80" cy="80" r="75" stroke="#667eea" strokeWidth="4" />
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize="48"
              fontWeight="bold"
              fill="#667eea"
            >
              MAP
            </text>
          </svg>
        </div>

        {/* Title */}
        <h1 className={styles.loadingTitle}>MAP AMS</h1>

        {/* Loading Dots */}
        <LoadingDots />
      </div>
    </div>
  );
}

/**
 * Loading - Main export
 * @param {string} text - Loading text (default: 'Loading...')
 * @param {boolean} fullscreen - Use full screen (default: false)
 * @param {boolean} system - Use system loading with logo (default: false)
 * @param {boolean} centered - Center the loading component (default: false)
 */
export default function Loading({ text = 'Loading...', fullscreen = false, system = false, centered = false }) {
  if (system || fullscreen) {
    return <SystemLoading />;
  }

  const containerClass = centered ? `${styles.loadingContainer} ${styles.centered}` : styles.loadingContainer;

  return (
    <div className={containerClass}>
      <div className={styles.spinner} />
      <p className={styles.text}>{text}</p>
    </div>
  );
}
