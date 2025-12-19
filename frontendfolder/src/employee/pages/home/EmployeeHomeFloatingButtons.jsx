import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoHelpCircleOutline, IoChatbubblesOutline, IoMenu, IoClose } from 'react-icons/io5';
import EmployeeChatbot from '../../components/modals/chatbot/EmployeeChatbot';
import styles from './EmployeeHomeFloatingButtons.module.css';

const EmployeeHomeFloatingButtons = () => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleToggle = () => {
    if (!showModal) {
      if (isExpanded) {
        setIsClosing(true);
        setTimeout(() => {
          setIsExpanded(false);
          setIsClosing(false);
        }, 400);
      } else {
        setIsExpanded(true);
      }
    }
  };

  const openModal = () => {
    setIsExpanded(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const optionsClass = `${styles.floatingOptions} ${
    isExpanded ? styles.showing : isClosing ? styles.closing : styles.hidden
  }`;

  const mainButtonClass = `${styles.floatButton} ${styles.mainButton} ${
    isExpanded ? styles.expanded : ''
  }`;

  return (
    <>
      <div className={styles.floatingMenu}>
        <div className={optionsClass}>
          <button
            className={styles.floatButton}
            onClick={() => navigate('/employee/frequently-asked-questions')}
            title="FAQs"
          >
            <IoHelpCircleOutline size={24} />
          </button>
          <button
            className={styles.floatButton}
            onClick={openModal}
            title="Chat"
          >
            <IoChatbubblesOutline size={24} />
          </button>
        </div>

        <button
          className={mainButtonClass}
          onClick={handleToggle}
          aria-label="Toggle floating menu"
        >
          {isExpanded ? (
            <IoClose size={24} className={styles.icon} />
          ) : (
            <IoMenu size={24} className={styles.icon} />
          )}
        </button>
      </div>

      {showModal && <EmployeeChatbot closeModal={closeModal} />}
    </>
  );
};

export default EmployeeHomeFloatingButtons;
