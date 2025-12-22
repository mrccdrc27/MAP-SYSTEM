import React, { useState, useRef, useEffect } from "react";
import "../styles/ChatBot.css";
import chatIcon from "../assets/icons/chat-icon.svg";
import sendArrowIcon from "../assets/icons/send-arrow-icon.svg";
import closeIcon from "../assets/icons/close-icon.svg";
import deleteIcon from "../assets/icons/delete-white.svg";
import mapLogo from "../assets/img/Map-M-Logo.png";
import { useLocation } from "react-router-dom";

const ChatBot = () => {
  const location = useLocation();

  // Initialize state from localStorage or use default values
  const [isOpen, setIsOpen] = useState(() => {
    const savedState = localStorage.getItem("chatbot_isOpen");
    return savedState ? JSON.parse(savedState) : false;
  });

  const [showClearedNotification, setShowClearedNotification] = useState(false);

  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem("chatbot_messages");
    const defaultMessage = [
      { text: "Hello! How can I help you today?", sender: "bot" },
    ];

    // Always use the default message on page refresh
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      // Check if this is a cleared message flag
      if (
        parsedMessages.length === 1 &&
        parsedMessages[0].hasOwnProperty("cleared") &&
        parsedMessages[0].cleared === true
      ) {
        // This is a flag from a cleared chat, use default message
        return defaultMessage;
      }
      return parsedMessages;
    }

    return defaultMessage;
  });

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    // Save messages to localStorage when they change
    localStorage.setItem("chatbot_messages", JSON.stringify(messages));
  }, [messages]);

  // Focus input when chat opens and save state
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }

    // Save isOpen state to localStorage
    localStorage.setItem("chatbot_isOpen", JSON.stringify(isOpen));
  }, [isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const clearChatHistory = () => {
    const initialMessage = {
      text: "Hello! How can I help you today?",
      sender: "bot",
    };

    // Show the cleared notification
    setShowClearedNotification(true);

    // Hide the notification after 3 seconds
    setTimeout(() => {
      setShowClearedNotification(false);
    }, 3000);

    // Set the messages with the default greeting
    setMessages([initialMessage]);

    // Store a special flag in localStorage to indicate the chat was cleared
    // This will be used to show the default message on refresh instead of "Chat cleared"
    localStorage.setItem(
      "chatbot_messages",
      JSON.stringify([{ ...initialMessage, cleared: true }])
    );
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleSendMessage = () => {
    if (inputText.trim() === "") return;

    // Add user message
    setMessages([...messages, { text: inputText, sender: "user" }]);
    setInputText("");

    // Simulate bot response after a short delay
    setTimeout(() => {
      const botResponses = [
        "I'm here to help! What would you like to know about your assets?",
        "You can check asset status, search for items, or get help with the dashboard.",
        "Need assistance with check-ins or check-outs? I can guide you through the process.",
        "Let me know if you need help finding specific information in the system.",
      ];
      const randomResponse =
        botResponses[Math.floor(Math.random() * botResponses.length)];
      setMessages((prev) => [...prev, { text: randomResponse, sender: "bot" }]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  if (
    location.pathname != "/login" &&
    location.pathname != "/request/password_reset" &&
    location.pathname !== "/"
  ) {
    return (
      <div className="chatbot-container">
        {/* Chat toggle button */}
        <button
          className={`chat-toggle-btn ${isOpen ? "open" : ""}`}
          onClick={toggleChat}
          aria-label="Toggle chat"
        >
          {isOpen ? (
            <img src={closeIcon} alt="Close chat" className="chat-icon" />
          ) : (
            <img src={chatIcon} alt="Open chat" className="chat-icon" />
          )}
        </button>

        {/* Chat window */}
        <div className={`chat-window ${isOpen ? "open" : ""}`}>
          <div className="chat-header">
            <div className="chat-header-logo">
              <img src={mapLogo} alt="MAP Logo" className="map-logo" />
              <h3>MAP Assistant</h3>
            </div>
            <div className="chat-header-actions">
              <img
                src={deleteIcon}
                alt="Clear History"
                className="delete-icon"
                onClick={clearChatHistory}
                title="Clear chat history"
                style={{
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  opacity: 0.8,
                  transition: "opacity 0.2s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "0.8")}
              />
              <button className="close-btn" onClick={toggleChat}>
                <img src={closeIcon} alt="Close" />
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {showClearedNotification && (
              <div className="chat-notification">Chat history cleared</div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${
                  message.sender === "bot" ? "bot-message" : "user-message"
                }`}
              >
                {message.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <input
              type="text"
              placeholder="Type your message..."
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              ref={inputRef}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={inputText.trim() === ""}
            >
              <img src={sendArrowIcon} alt="Send" />
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default ChatBot;
