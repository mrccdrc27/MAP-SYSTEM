import React, { useState, useEffect } from 'react';
import { FiUser, FiUsers, FiTag, FiCheckCircle, FiInbox, FiClock } from 'react-icons/fi';
import styles from './EmployeeTicketLogs.module.css';
import logsStyles from '../../../shared/components/LogsPanel.module.css';

export default function TicketActivity({ ticketLogs = [], initialMessages = [] }) {
  const [activeTab, setActiveTab] = useState('logs');
  const [messages, setMessages] = useState(initialMessages || []);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // initialize messages when initialMessages changes
    if ((messages?.length || 0) === 0 && initialMessages?.length) {
      setMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages]);

  const formatDateLocal = (date) => {
    // If no date provided, return empty string. Previously this function
    // defaulted to `new Date()` which caused UI to display "now" when
    // the timestamp was missing (e.g. newly-created tickets without a
    // backend-created timestamp). An empty string avoids misleading "now".
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d)) return 'Invalid Date';
    const monthName = d.toLocaleString('en-US', { month: 'long' });
    const day = d.getDate();
    const yearFull = d.getFullYear();
    return `${monthName} ${day}, ${yearFull}`;
  };

  const renderLogText = (text, highlight) => {
    if (!text) return null;
    if (!highlight) return text;
    const hlStr = String(highlight);
    const lower = text.toLowerCase();
    const hl = hlStr.toLowerCase();
    const idx = lower.indexOf(hl);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const matched = text.slice(idx, idx + hlStr.length);
    const after = text.slice(idx + hlStr.length);
    return (
      <>
        {before}
        <strong>{matched}</strong>
        {after}
      </>
    );
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: messages.length + 1,
        sender: 'You',
        message: newMessage,
        timestamp: formatDateLocal(),
      };
      setMessages((prev) => [...prev, newMsg]);
      setNewMessage('');
      setActiveTab('message');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={styles.activitySection}>
      {activeTab === 'logs' ? (
        <div className={`${styles['messages-logs-wrapper']} ${styles.noBorder}`}>
              {ticketLogs.map((log) => {
                const getInitials = (name) =>
                  (name || '')
                    .split(' ')
                    .map((n) => n[0] || '')
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                const initials = getInitials(log.user);

                const getLogIcon = (action) => {
                  const a = (action || '').toLowerCase();
                  if (a.includes('created')) return <FiInbox />;
                  if (a.includes('assigned') || a.includes('assign')) return <FiUsers />;
                  if (a.includes('status') || a.includes('updated') || a.includes('changed')) return <FiTag />;
                  if (a.includes('resolved')) return <FiCheckCircle />;
                  if (a.includes('closed')) return <FiClock />;
                  return <FiUser />;
                };

                return (
                  <div key={log.id} className={logsStyles.logEntry}>
                    <div className={logsStyles.logAvatar}>{getLogIcon(log.action || log.text)}</div>
                    <div className={logsStyles.logBody}>
                      <div className={logsStyles.logText}>{renderLogText(log.text || log.action, log.highlight)}</div>
                      <div className={logsStyles.logTimestamp}>{log.timestamp}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className={styles['messages-logs-wrapper']}>
            <div className={styles.messagesContent}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.messageEntry} ${msg.sender === 'You' ? styles.myMessage : styles.theirMessage}`}
                >
                  <div className={styles.messageSender}>{msg.sender}</div>
                  <div className={styles.messageText}>{msg.message}</div>
                  <div className={styles.messageTimestamp}>{msg.timestamp}</div>
                </div>
              ))}
            </div>

            <div className={styles.messageInputContainer}>
              <textarea
                className={styles.messageInput}
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={2}
              />
              <button
                className={styles.sendButton}
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                Send
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
