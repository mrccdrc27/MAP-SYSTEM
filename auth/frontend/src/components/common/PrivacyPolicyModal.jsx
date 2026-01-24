import { useState, useEffect, useRef } from 'react';
import styles from './PrivacyPolicyModal.module.css';

const PrivacyPolicyModal = ({ onAgree, onClose, showModal }) => {
  const [step, setStep] = useState('privacy');
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    setStep('privacy');
  }, [onClose]);

  useEffect(() => {
    setScrolledToBottom(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [step]);

  if (!showModal) return null;

  const handleScroll = () => {
    const el = contentRef.current;
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 5;
      setScrolledToBottom(atBottom);
    }
  };

  const handleNext = () => setStep('terms');
  const handleBack = () => {
    setStep('privacy');
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
        setScrolledToBottom(true);
      }
    }, 0);
  };

  const handleAgree = () => {
    if (step === 'privacy') {
      setStep('terms');
    } else {
      onAgree?.();
    }
  };

  const handleCancel = () => onClose?.();

  const getButtonClass = (enabled) =>
    `${styles.button || styles.agreeButton} ${enabled ? '' : styles.buttonDisabled}`;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{step === 'privacy' ? 'Privacy Policy' : 'Terms and Conditions'}</h2>
          <button className={styles.closeButton} onClick={handleCancel} aria-label="Close">×</button>
        </div>

        <div className={styles.contentSection}>
          <div
            className={styles.scrollableContent}
            ref={contentRef}
            onScroll={handleScroll}
            style={{ maxHeight: 350, overflowY: 'auto' }}
          >
            {step === 'privacy' ? (
              <>
                <h4>Ticketing System</h4>
                <p>
                  This Privacy Policy outlines how the Ticketing System collects, uses, stores, and protects the personal data of users who access and use the System.
                </p>
                <h4>1. Information We Collect</h4>
                <p>When you use the System, we may collect the following types of information:</p>
                <ul>
                  <li><strong>Personal Information:</strong> Name, employee ID, email address, department, or other identifiers.</li>
                  <li><strong>Ticket Information:</strong> The content of your submitted tickets, including descriptions of issues, attachments, and time of submission.</li>
                  <li><strong>Usage Data:</strong> Logs such as login timestamps, device or browser information, and activity within the System.</li>
                </ul>
                <h4>2. How We Use Your Information</h4>
                <p>We use your data for the following purposes:</p>
                <ul>
                  <li>To process and respond to your support requests.</li>
                  <li>To track and manage the status of tickets.</li>
                  <li>To generate internal reports for service improvement.</li>
                  <li>To notify you about the progress or resolution of your submitted tickets.</li>
                  <li>To improve user experience and system functionality.</li>
                </ul>
                <h4>3. Data Sharing and Disclosure</h4>
                <p>We do not sell or share your personal data with external third parties. However, your data may be accessed by:</p>
                <ul>
                  <li>Authorized support personnel (such as ticket agents and system administrators) for the purpose of resolving your tickets.</li>
                  <li>Internal management for service reporting or audits.</li>
                </ul>
                <p>We may disclose your data when legally required, such as in response to a court order or legal investigation.</p>
                <h4>4. Data Retention</h4>
                <p>We retain your personal and ticket data only for as long as necessary to fulfill the purposes described in this policy, or as required by organizational policies.</p>
                <h4>5. Your Rights</h4>
                <p>You have the right to:</p>
                <ul>
                  <li>Access your personal data stored in the System.</li>
                  <li>Request correction of inaccurate or outdated information.</li>
                  <li>Request deletion of your data, subject to retention policies.</li>
                  <li>Withdraw consent where applicable, which may affect your ability to use the System.</li>
                </ul>
                <p>To exercise any of these rights, please contact the system administrator at Ticketing System operators.</p>
                <h4>6. Data Security</h4>
                <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or disclosure, and to secure user accounts through authentication and access control. We regularly monitor system activity for suspicious behavior. However, no system is 100% secure, and you are also responsible for protecting your login credentials.</p>
                <h4>7. Cookies and Tracking Technologies</h4>
                <p>The System may use cookies or session-based tracking for authentication and performance analytics. You can manage cookie settings through your browser.</p>
                <h4>8. Updates to This Privacy Policy</h4>
                <p>We may update this policy from time to time. You will be notified of any significant changes, and continued use of the System after updates constitutes acceptance of the revised policy.</p>
                <h4>9. Contact Us</h4>
                <p>If you have any questions or concerns regarding this Privacy Policy, please contact Ticketing System operators.</p>
              </>
            ) : (
              <>
                <p>By accessing and using the Ticketing System, you agree to comply with the following Terms and Conditions. Please read them carefully before submitting any support tickets.</p>
                <h4>1. Acceptance of Terms</h4>
                <p>By using this System, you acknowledge that you have read, understood, and agree to these Terms. If you do not accept any part of these terms, you must refrain from using the System.</p>
                <h4>2. Purpose of the System</h4>
                <p>This System is provided to help users (such as employees or authorized personnel) submit, track, and receive support for technical or administrative issues within the organization.</p>
                <h4>3. User Responsibilities</h4>
                <ul>
                  <li>Provide accurate and complete information when submitting tickets.</li>
                  <li>Use the System only for legitimate support requests.</li>
                  <li>Avoid submitting duplicate, irrelevant, or fraudulent tickets.</li>
                  <li>Respond to follow-up questions from support agents in a timely manner.</li>
                  <li>Submit only appropriate and professional content.</li>
                </ul>
                <h4>4. Ticket Closure</h4>
                <p>Once a ticket is marked as resolved by the support team, you will no longer be able to send additional messages regarding that issue.</p>
                <p>If no action is taken by the user within the specified SLA timeline, the System will automatically close the ticket to maintain workflow efficiency and compliance with internal SLAs.</p>
                <p>Uncooperative behavior or lack of feedback may delay the closure of your ticket.</p>
                <h4>5. Account and Security</h4>
                <p>You are responsible for keeping your login credentials secure and confidential.</p>
                <p>Do not share your account with others or impersonate another user.</p>
                <p>Report any unauthorized access or suspicious activity to the system administrator immediately.</p>
                <h4>6. Prohibited Actions</h4>
                <ul>
                  <li>Misuse the System or disrupt its normal operation.</li>
                  <li>Upload or transmit harmful, offensive, or malicious content.</li>
                  <li>Attempt to access restricted or administrative areas of the System.</li>
                </ul>
                <h4>7. System Availability and Maintenance</h4>
                <p>The System is provided on an “as-is” and “as-available” basis. While we strive to maintain accessible and functional systems, we do not guarantee that the System will be uninterrupted, secure, or free of errors.</p>
                <p>Scheduled maintenance or unexpected issues may temporarily affect system availability. Reasonable efforts will be made to notify users in advance of planned outages.</p>
                <h4>8. Limitation of Liability</h4>
                <p>To the fullest extent permitted by law, the organization and its affiliates are not liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the System.</p>
                <h4>9. Changes to Terms and Conditions</h4>
                <p>We may update these Terms and Conditions from time to time. You will be notified of any significant changes, and continued use of the System after updates constitutes acceptance of the revised terms.</p>
                <h4>10. Governing Law</h4>
                <p>These Terms and Conditions are governed by and construed in accordance with the laws of the jurisdiction in which the organization is located, without regard to its conflict of law principles.</p>
                <h4>11. Contact Information</h4>
                <p>For any questions or concerns regarding these Terms and Conditions, please contact Ticketing System operators.</p>
              </>
            )}
          </div>
        </div>

        <div className={styles.modalActions}>
          {step === 'privacy' ? (
            <button onClick={handleNext} className={getButtonClass(scrolledToBottom)} disabled={!scrolledToBottom}>
              Next
            </button>
          ) : (
            <>
              <button className={`${styles.cancelButton || styles.button} ${styles.buttonOutline || ''}`} onClick={handleBack}>
                Back
              </button>
              <button onClick={handleAgree} className={getButtonClass(scrolledToBottom)} disabled={!scrolledToBottom}>
                I Agree
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;