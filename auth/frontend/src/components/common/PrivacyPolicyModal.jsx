import { useState } from 'react';
import styles from './PrivacyPolicyModal.module.css';

const PrivacyPolicyModal = ({ onAgree, onClose, showModal }) => {
  const [currentTab, setCurrentTab] = useState('privacy');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  if (!showModal) return null;

  const handleAgree = () => {
    if (privacyAgreed && termsAgreed) {
      onAgree();
    } else {
      if (!privacyAgreed && !termsAgreed) {
        alert('Please read and agree to both the Privacy Policy and Terms and Conditions.');
      } else if (!privacyAgreed) {
        alert('Please read and agree to the Privacy Policy.');
      } else {
        alert('Please read and agree to the Terms and Conditions.');
      }
    }
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Privacy Policy & Terms and Conditions</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.tabContainer}>
          <div className={styles.tabButtons}>
            <button 
              className={`${styles.tabButton} ${currentTab === 'privacy' ? styles.active : ''}`}
              onClick={() => handleTabChange('privacy')}
            >
              Privacy Policy
            </button>
            <button 
              className={`${styles.tabButton} ${currentTab === 'terms' ? styles.active : ''}`}
              onClick={() => handleTabChange('terms')}
            >
              Terms and Conditions
            </button>
          </div>

          <div className={styles.tabContent}>
            {currentTab === 'privacy' && (
              <div className={styles.contentSection}>
                <h3>Privacy Policy</h3>
                <div className={styles.scrollableContent}>
                  <h4>Information Collection and Use</h4>
                  <p>
                    We collect information you provide directly to us, such as when you create an account, 
                    use our services, or contact us for support. This information may include your name, 
                    email address, phone number, department, and other contact details.
                  </p>

                  <h4>How We Use Your Information</h4>
                  <p>
                    We use the information we collect to provide, maintain, and improve our ticketing system 
                    services, process transactions, send you technical notices and support messages, and 
                    respond to your comments and questions.
                  </p>

                  <h4>Information Sharing</h4>
                  <p>
                    We do not sell, rent, or share your personal information with third parties except as 
                    described in this policy. We may share your information with service providers who 
                    perform services on our behalf, or when required by law.
                  </p>

                  <h4>Data Security</h4>
                  <p>
                    We implement appropriate security measures to protect your personal information against 
                    unauthorized access, alteration, disclosure, or destruction. However, no method of 
                    transmission over the internet is completely secure.
                  </p>

                  <h4>Your Rights</h4>
                  <p>
                    You have the right to access, update, or delete your personal information. You can 
                    do this by contacting us directly or through your account settings.
                  </p>

                  <h4>Changes to This Policy</h4>
                  <p>
                    We may update this privacy policy from time to time. We will notify you of any changes 
                    by posting the new policy on this page and updating the effective date.
                  </p>

                  <p className={styles.effectiveDate}>
                    <strong>Effective Date:</strong> January 5, 2026
                  </p>
                </div>

                <div className={styles.agreementSection}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={privacyAgreed}
                      onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    />
                    <span>I have read and agree to the Privacy Policy</span>
                  </label>
                </div>
              </div>
            )}

            {currentTab === 'terms' && (
              <div className={styles.contentSection}>
                <h3>Terms and Conditions</h3>
                <div className={styles.scrollableContent}>
                  <h4>Acceptance of Terms</h4>
                  <p>
                    By creating an account and using our ticketing system, you agree to be bound by these 
                    Terms and Conditions. If you do not agree to these terms, you may not use our services.
                  </p>

                  <h4>User Accounts</h4>
                  <p>
                    You are responsible for maintaining the confidentiality of your account credentials and 
                    for all activities that occur under your account. You must notify us immediately of any 
                    unauthorized use of your account.
                  </p>

                  <h4>Acceptable Use</h4>
                  <p>
                    You agree to use our services only for lawful purposes and in accordance with these terms. 
                    You may not use our services to transmit harmful, offensive, or inappropriate content, 
                    or to violate any laws or regulations.
                  </p>

                  <h4>Service Availability</h4>
                  <p>
                    We strive to provide reliable service, but we do not guarantee that our services will be 
                    available at all times. We may suspend or terminate services for maintenance, updates, 
                    or other operational reasons.
                  </p>

                  <h4>Intellectual Property</h4>
                  <p>
                    All content, features, and functionality of our ticketing system are owned by us and are 
                    protected by intellectual property laws. You may not copy, modify, or distribute our 
                    content without permission.
                  </p>

                  <h4>Limitation of Liability</h4>
                  <p>
                    To the fullest extent permitted by law, we shall not be liable for any indirect, 
                    incidental, special, or consequential damages arising from your use of our services.
                  </p>

                  <h4>Termination</h4>
                  <p>
                    We may terminate or suspend your account at any time for violation of these terms or 
                    for any other reason. You may also terminate your account at any time by contacting us.
                  </p>

                  <h4>Changes to Terms</h4>
                  <p>
                    We reserve the right to modify these terms at any time. We will notify users of 
                    significant changes via email or through our system.
                  </p>

                  <p className={styles.effectiveDate}>
                    <strong>Effective Date:</strong> January 5, 2026
                  </p>
                </div>

                <div className={styles.agreementSection}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                    />
                    <span>I have read and agree to the Terms and Conditions</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className={styles.agreeButton}
            onClick={handleAgree}
            disabled={!privacyAgreed || !termsAgreed}
          >
            Agree to Both
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;