import React, { useState } from "react";
import styles from "./messaging.module.css";

const Messaging = () => {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim()) {
      // Handle message sending logic here
      console.log("Sending message:", message);
      setMessage("");
    }
  };

  return (
    <div className={styles.messagingPage}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.agentName}>Agent Name?</span>
          <span className={styles.agentStatus}>Agent Active Status?</span>
        </div>
      </div>

      <div className={styles.messageContainer}>
        <div className={styles.messageGroup}>
          <div className={styles.messageLeft}>
            <div className={styles.avatar}></div>
            <div className={styles.messageBubble}>
              <div className={styles.messageBubbleGray}>
                Hello! How can I help you today? I'm here to assist with any
                questions or concerns you may have.
              </div>
            </div>
          </div>
          <div className={styles.messageTimestamp}>9:59AM | APRIL 05, 2025</div>
        </div>

        <div className={styles.messageGroup}>
          <div className={styles.messageRight}>
            <div className={styles.messageBubble}>
              <div className={styles.messageBubbleBlue}>
                Hi, I need help with my account settings.
              </div>
            </div>
          </div>
          <div className={styles.messageTimestamp}>10:00AM | SUNDAY</div>
        </div>
      </div>

      <div className={styles.footer}>
      <div className={styles.inputContainer}>
        <input
          type="text"
          className={styles.messageInput}
          placeholder="Type your message here... Shift + Enter for new line"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <button className={styles.sendButton} onClick={handleSendMessage}>
          ➤
        </button>
      </div>
      </div>

      {/* <div className={styles.footer}>
        <div className={styles.attachmentButtons}>
          <button className={styles.attachmentBtn}>
            <span className={styles.icon}>📄</span> Escalate
          </button>
          <button className={styles.attachmentBtn}>
            <span className={styles.icon}>👤</span> Transfer Status
          </button>
          <button className={styles.attachmentBtn}>
            <span className={styles.icon}>➕</span> Add Internal Note
          </button>
          <button className={styles.attachmentBtn}>
            <span className={styles.icon}>📎</span> Attach File
          </button>
          <button className={styles.attachmentBtn}>
            <span className={styles.icon}>🤖</span> Bot Suggestion
          </button>
          <button className={styles.attachmentBtn}>
            <span className={styles.icon}>🎫</span> Resolve Ticket
          </button>
        </div>
        <div className={styles.inputContainer}>
          <input
            type="text"
            className={styles.messageInput}
            placeholder="Type your message here... Shift + Enter for new line"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button className={styles.sendButton} onClick={handleSendMessage}>
            ➤
          </button>
        </div>
      </div> */}
    </div>
  );
};

export default Messaging;
