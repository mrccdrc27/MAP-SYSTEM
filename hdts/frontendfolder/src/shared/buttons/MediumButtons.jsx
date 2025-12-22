import { useNavigate } from 'react-router-dom';
import styles from './MediumButtons.module.css';

export default function MediumButtons({
  type,
  navigatePage = null,
  deleteModalOpen,
  className = ''
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (navigatePage) {
      navigate(navigatePage);
    } else if (typeof deleteModalOpen === 'function') {
      deleteModalOpen();
    }
  };

  return (
    <button
      type="button"
      className={`
        ${styles.mediumButton}
        ${styles[type.toLowerCase()] || ''}
        ${className}
      `}
      onClick={handleClick}
    >
      <span>{type.replace(/-/g, ' ')}</span>
    </button>
  );
}
