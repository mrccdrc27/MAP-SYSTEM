import { useNavigate } from "react-router-dom";
import styles from "./Breadcrumb.module.css";

export default function Breadcrumb({
  root,
  currentPage,
  rootNavigatePage,
  title,
  children, // Optional: for custom buttons or actions
}) {
  const navigate = useNavigate();

  return (
    <div className={styles.breadcrumbContainer}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumbNav}>
        <ul className={styles.breadcrumbList}>
          {root && (
            <li className={styles.breadcrumbItem}>
              <a 
                onClick={() => navigate(rootNavigatePage)} 
                className={styles.breadcrumbLink}
              >
                {root}
              </a>
            </li>
          )}
          {currentPage && (
            <li className={styles.breadcrumbItem}>
              {currentPage}
            </li>
          )}
        </ul>
      </nav>

      {/* Title Section with Optional Actions */}
      {title && (
        <div className={styles.titleSection}>
          <h3>{title}</h3>
          {children && (
            <div className={styles.actions}>
              {children}
            </div>
          )}
        </div>
      )}
  {/* Divider directly under the title */}
  {title && <div className={styles.breadcrumbDivider} />}
    </div>
  );
}
