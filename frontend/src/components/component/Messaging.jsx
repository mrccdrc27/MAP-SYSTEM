import React, { useState, useEffect, useRef } from "react";
import styles from "./messaging.module.css";

const API_BASE = "http://localhost:8005";

const Messaging = ({
  ticket_id,
  agentName = "Agent",
  agentStatus = "Active",
  currentUser = null,
}) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);
  const initialLoadRef = useRef(true);
  const prevLastIdRef = useRef(null);

  // Scroll to bottom when messages change, but only inside the message container
  const scrollToBottom = (behavior = "smooth") => {
    try {
      if (containerRef.current) {
        // Prefer scrolling the container element so the whole page doesn't jump
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior,
        });
      } else {
        // Fallback to scrolling the end ref
        messagesEndRef.current?.scrollIntoView({ behavior });
      }
    } catch (err) {
      // final fallback: set scrollTop directly
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  };

  useEffect(() => {
    // Only auto-scroll when:
    // - component is opened for the first time (initial load), OR
    // - a new message arrived (detected by length increase or last message id change)
    try {
      const container = containerRef.current;

      const lastMessage =
        messages && messages.length > 0 ? messages[messages.length - 1] : null;
      const lastId = lastMessage ? lastMessage.id : null;

      const lengthIncreased = messages.length > prevMessagesLengthRef.current;
      const lastIdChanged =
        lastId &&
        prevLastIdRef.current &&
        String(lastId) !== String(prevLastIdRef.current);

      const isNewMessage = lengthIncreased || lastIdChanged;

      if (initialLoadRef.current || isNewMessage) {
        scrollToBottom(initialLoadRef.current ? "auto" : "smooth");
      }
    } catch (err) {
      scrollToBottom("smooth");
    } finally {
      prevMessagesLengthRef.current = messages.length;
      prevLastIdRef.current =
        messages && messages.length > 0
          ? messages[messages.length - 1].id
          : null;
      initialLoadRef.current = false;
    }
  }, [messages]);

  // Fetch messages
  const fetchMessages = async (after_message_id = null) => {
    if (!ticket_id) return;
    setLoading(true);
    try {
      const payload = { ticket_id: String(ticket_id) };
      if (after_message_id) payload.after_message_id = after_message_id;

      const res = await fetch(`${API_BASE}/api/tickets/fetch/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Fetching messages with payload:", payload);

      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      console.log("Fetch response:", data);

      // Map backend format → frontend format
      const messagesArray = (data.messages || []).map((m) => ({
        id: m.message_id,
        sender: m.sender,
        content: m.message,
        timestamp: m.created_at,
      }));

      setMessages(messagesArray);
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!message.trim() || !ticket_id) return;
    const content = message.trim();
    setMessage("");
    setSending(true);

    // Optimistically show message. Use a stable identifier for the current user
    const currentIdentifier =
      currentUser?.user_id ||
      currentUser?.id ||
      currentUser?.email ||
      `${currentUser?.first_name || ""} ${
        currentUser?.last_name || ""
      }`.trim() ||
      "me";

    const tempMsg = {
      id: Date.now(),
      sender: currentIdentifier,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const payload = {
        ticket_id,
        // send a clear identifier for backend to record (email, id or name)
        sender:
          currentUser?.user_id ||
          currentUser?.id ||
          currentUser?.email ||
          `${currentUser?.first_name || ""} ${
            currentUser?.last_name || ""
          }`.trim() ||
          "Admin",
        message: content,
      };

      const res = await fetch(`${API_BASE}/api/tickets/send/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to send message");

      await fetchMessages();
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false);
    }
  };

  // On mount + polling
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      if (messages.length > 0) {
        const lastMessageId = messages[messages.length - 1]?.id;
        fetchMessages(lastMessageId);
      } else {
        fetchMessages();
      }
    }, 10000); // every 10s
    return () => clearInterval(interval);
  }, [ticket_id]);

  const formatTimestamp = (iso) => {
    try {
      const d = new Date(iso);
      return (
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " | " +
        d.toLocaleDateString()
      );
    } catch {
      return iso;
    }
  };

  return (
    <div className={styles.messagingPage}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.agentName}>{agentName}</span>
          <span className={styles.agentStatus}>{agentStatus}</span>
        </div>
      </div>

      <div className={styles.messageContainer} ref={containerRef}>
        {loading && messages.length === 0 && (
          <div className={styles.loadingText}>Loading messages...</div>
        )}

        {messages.map((m) => {
          // Compare sender to the current user using several possible id fields
          const currentIdentifier =
            currentUser?.user_id ||
            currentUser?.id ||
            currentUser?.email ||
            `${currentUser?.first_name || ""} ${
              currentUser?.last_name || ""
            }`.trim();

          const senderValue =
            typeof m.sender === "object"
              ? m.sender.id || m.sender.email
              : m.sender;

          const isOwn =
            !!currentIdentifier &&
            senderValue &&
            (senderValue === currentIdentifier ||
              String(senderValue).toLowerCase() ===
                String(currentIdentifier).toLowerCase());

          return (
            <div className={styles.messageGroup} key={m.id}>
              {isOwn ? (
                <div className={styles.messageRight}>
                  <div className={styles.messageBubble}>
                    <div className={styles.messageBubbleBlue}>{m.content}</div>
                  </div>
                </div>
              ) : (
                <div className={styles.messageLeft}>
                  <div className={styles.avatar}></div>
                  <div className={styles.messageBubble}>
                    <div className={styles.messageBubbleGray}>{m.content}</div>
                  </div>
                </div>
              )}
              <div className={styles.messageTimestamp}>
                {formatTimestamp(m.timestamp)}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.footer}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            className={styles.messageInput}
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={sending}
          />
          <button
            className={styles.sendButton}
            onClick={sendMessage}
            disabled={sending}
          >
            {sending ? "..." : "➤"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messaging;
