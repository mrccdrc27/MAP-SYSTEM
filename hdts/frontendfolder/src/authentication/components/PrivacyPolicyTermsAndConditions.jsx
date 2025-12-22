import { useState, useEffect, useRef } from "react";
import styles from "./PrivacyPolicyTermsAndConditions.module.css";

const PrivacyPolicyTermsAndConditions = ({ onAgree, onClose }) => {
  const [step, setStep] = useState("privacy");
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const contentRef = useRef(null);

  // Reset scroll and button state when tab changes
  useEffect(() => {
    setStep("privacy");
  }, [onClose]);

  useEffect(() => {
    setScrolledToBottom(false);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [step]);

  // Check if scrolled to bottom
  const handleScroll = () => {
    const el = contentRef.current;
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 5;
      setScrolledToBottom(atBottom);
    }
  };

  const handleNext = () => setStep("terms");
  const handleBack = () => {
    setStep("privacy");
    // After switching to privacy, scroll to bottom so Next is enabled
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
        setScrolledToBottom(true);
      }
    }, 0);
  };
  const handleAgree = () => {
    if (step === "privacy") {
      setStep("terms");
    } else {
      onAgree?.();
    }
  };

  const handleCancel = () => onClose?.();

  // Utility for disabled button style
  const getButtonClass = (enabled) =>
    `${styles.button} ${styles.buttonPrimary} ${!enabled ? styles.buttonDisabled : ""}`;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.container} style={{ position: "relative" }}>
        {/* Close (X) button in the upper right */}
        <button
          type="button"
          className={styles.closeButton}
          onClick={handleCancel}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 18,
            right: 20,
            background: "transparent",
            border: "none",
            fontSize: "2rem",
            color: "#888",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          &times;
        </button>
        <h2 className={styles.header}>
          {step === "privacy" ? "Privacy Policy" : "Terms and Conditions"}
        </h2>
        <div
          className={styles.contentBox}
          ref={contentRef}
          onScroll={handleScroll}
          style={{ maxHeight: 350, overflowY: "auto" }}
        >
          {step === "privacy" ? (
            <>
              <p>
                This Privacy Policy outlines how the SmartSupport: AI-Powered
                Helpdesk Ticketing System collects, uses, stores, and protects the
                personal data of users who access and use the System.
              </p>
              <h3>1. Information We Collect</h3>
              <p>
                When you use the System, we may collect the following types of
                information:
              </p>
              <ul>
                <li>
                  <strong>Personal Information:</strong> Name, employee ID, email
                  address, department, or other identifiers.
                </li>
                <li>
                  <strong>Ticket Information:</strong> The content of your
                  submitted tickets, including descriptions of issues,
                  attachments, and time of submission.
                </li>
                <li>
                  <strong>Usage Data:</strong> Logs such as login timestamps,
                  device/browser information, and activity within the System.
                </li>
              </ul>
              <h3>2. How We Use Your Information</h3>
              <p>We use your data for the following purposes:</p>
              <ul>
                <li>To process and respond to your support requests.</li>
                <li>To track and manage the status of tickets.</li>
                <li>To generate internal reports for service improvement.</li>
                <li>
                  To notify you about the progress or resolution of your submitted
                  tickets.
                </li>
                <li>To improve user experience and system functionality.</li>
              </ul>
              <h3>3. Data Sharing and Disclosure</h3>
              <p>
                We do <strong>not</strong> sell or share your personal data with
                external third parties. However, your data may be accessed by:
              </p>
              <ul>
                <li>
                  Authorized support personnel (e.g., ticket agents, system
                  administrators) for the purpose of resolving your tickets.
                </li>
                <li>Internal management for service reporting or audits.</li>
              </ul>
              <p>
                We may disclose your data when legally required (e.g., in response
                to a court order or legal investigation).
              </p>
              <h3>4. Data Retention</h3>
              <p>
                We retain your personal and ticket data only for as long as
                necessary to fulfill the purposes described above, or as required
                by organizational policies.
              </p>
              <h3>5. Your Rights</h3>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal data stored in the system.</li>
                <li>Request correction of inaccurate or outdated information.</li>
                <li>
                  Request deletion of your data, subject to retention policies.
                </li>
                <li>
                  Withdraw consent where applicable, which may affect your ability
                  to use the System.
                </li>
              </ul>
              <p>
                To exercise any of these rights, please contact the system
                administrator at SmartSupport operators.
              </p>
              <h3>6. Data Security</h3>
              <p>We implement appropriate technical and organizational measures to:</p>
              <ul>
                <li>
                  Protect your personal information against unauthorized access,
                  alteration, or disclosure.
                </li>
                <li>Secure user accounts through authentication and access control.</li>
                <li>Regularly monitor system activity for suspicious behavior.</li>
              </ul>
              <p>
                However, no system is 100% secure, and you are also responsible
                for protecting your login credentials.
              </p>
              <h3>7. Cookies and Tracking Technologies</h3>
              <p>
                The System may use cookies or session-based tracking for
                authentication and performance analytics. You can manage cookie
                settings in your browser.
              </p>
              <h3>8. Updates to this Privacy Policy</h3>
              <p>
                We may update this policy from time to time. You will be notified
                of any significant changes, and continued use of the System after
                updates constitutes acceptance of the revised policy.
              </p>
              <h3>9. Contact Us</h3>
              <p>
                If you have any questions or concerns regarding this Privacy
                Policy, please contact: SmartSupport operators.
              </p>
            </>
          ) : (
            <>
              <p>
                By accessing and using the SmartSupport: AI-Powered Helpdesk
                Ticketing System, you agree to comply with the following Terms and
                Conditions. Please read them carefully before submitting any
                support tickets.
              </p>
              <h3>1. Acceptance of Terms</h3>
              <p>
                By using this System, you acknowledge that you have read,
                understood, and agree to these Terms. If you do not accept any
                part of these terms, you must refrain from using the System.
              </p>
              <h3>2. Purpose of the System</h3>
              <p>
                This System is provided to help users (e.g., employees or
                authorized personnel) submit, track, and receive support for
                technical or administrative issues within the organization.
              </p>
              <h3>3. User Responsibilities</h3>
              <ul>
                <li>Provide accurate and complete information when submitting tickets.</li>
                <li>Use the System only for legitimate support requests.</li>
                <li>Avoid submitting duplicate, irrelevant, or fraudulent tickets.</li>
                <li>Respond to follow-up questions from support agents in a timely manner.</li>
                <li>Submit only appropriate and professional content.</li>
              </ul>
              <h3>4. Ticket Closure</h3>
              <ul>
                <li>Once a ticket is marked as resolved by the support team, you will no longer be able to send additional messages regarding that issue.</li>
                <li>If no action is taken by the user within the specified SLA timeline, the System will automatically close the ticket to maintain workflow efficiency and compliance with internal SLAs.</li>
                <li>Uncooperative behavior or lack of feedback may delay the closure of your ticket.</li>
              </ul>
              <h3>5. Account and Security</h3>
              <ul>
                <li>You are responsible for keeping your login credentials secure and confidential.</li>
                <li>Do not share your account with others or impersonate another user.</li>
                <li>Report any unauthorized access or suspicious activity to the system administrator immediately.</li>
              </ul>
              <h3>6. Prohibited Actions</h3>
              <ul>
                <li>You agree not to misuse the System or disrupt its normal operation.</li>
                <li>Do not upload or transmit harmful, offensive, or malicious content.</li>
                <li>Do not attempt to access restricted or administrative areas of the System.</li>
              </ul>
              <h3>7. System Availability and Maintenance</h3>
              <p>
                The System is provided on an "as-is" and "as-available" basis.
                While we strive to maintain accessible and functional systems, we
                do not guarantee that the System will be uninterrupted, secure, or
                free of errors.
              </p>
              <p>
                Scheduled maintenance or unexpected issues may temporarily affect
                system availability. We will make reasonable efforts to notify
                users in advance of any planned outages.
              </p>
              <h3>8. Limitation of Liability</h3>
              <p>
                To the fullest extent permitted by law, the organization and its
                affiliates are not liable for any indirect, incidental, special,
                or consequential damages arising out of or in connection with
                your use of the System.
              </p>
              <h3>9. Changes to Terms and Conditions</h3>
              <p>
                We may update these Terms and Conditions from time to time. You
                will be notified of any significant changes, and continued use of
                the System after updates constitutes acceptance of the revised
                terms.
              </p>
              <h3>10. Governing Law</h3>
              <p>
                These Terms and Conditions are governed by and construed in
                accordance with the laws of the jurisdiction in which the
                organization is located, without regard to its conflict of law
                principles.
              </p>
              <h3>11. Contact Information</h3>
              <p>
                For any questions or concerns regarding these Terms and
                Conditions, please contact: SmartSupport operators.
              </p>
            </>
          )}
        </div>

        <div className={styles.actions}>
          {step === "privacy" ? (
            <button
              onClick={handleNext}
              className={getButtonClass(scrolledToBottom)}
              disabled={!scrolledToBottom}
            >
              Next
            </button>
          ) : (
            <>
              <button
                onClick={handleBack}
                className={`${styles.button} ${styles.buttonOutline}`}
              >
                Back
              </button>
              <button
                onClick={handleAgree}
                className={getButtonClass(scrolledToBottom)}
                disabled={!scrolledToBottom}
              >
                I Agree
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyTermsAndConditions;
