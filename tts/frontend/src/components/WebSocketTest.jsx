import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export default function WebSocketTest() {
  const { ticketId } = useParams();
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [testMessage, setTestMessage] = useState('');
  const [wsUrl, setWsUrl] = useState('ws://localhost:8005/ws/comments/');
  const [customTicketId, setCustomTicketId] = useState(ticketId || 'TX20251106515163');
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, {
      id: Date.now(),
      message,
      type,
      timestamp
    }]);
  };

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      addMessage('Already connected!', 'warning');
      return;
    }

    const fullWsUrl = `${wsUrl}${customTicketId}/`;
    addMessage(`Connecting to: ${fullWsUrl}`, 'info');
    setConnectionStatus('Connecting...');

    try {
      ws.current = new WebSocket(fullWsUrl);

      ws.current.onopen = () => {
        console.log("WebSocket connected!");
        setConnectionStatus('Connected');
        addMessage('✅ WebSocket connected successfully!', 'success');
        
        // Send initial ping
        const pingMessage = {
          type: 'ping',
          timestamp: new Date().toISOString()
        };
        ws.current.send(JSON.stringify(pingMessage));
        addMessage(`📤 Sent: ${JSON.stringify(pingMessage)}`, 'sent');
      };

      ws.current.onmessage = (event) => {
        console.log("Received:", event.data);
        try {
          const data = JSON.parse(event.data);
          addMessage(`📥 Received: ${JSON.stringify(data, null, 2)}`, 'received');
        } catch (e) {
          addMessage(`📥 Received (raw): ${event.data}`, 'received');
        }
      };

      ws.current.onclose = (event) => {
        console.log("WebSocket closed:", event);
        setConnectionStatus('Disconnected');
        addMessage(`🔌 WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason'}`, 'error');
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus('Error');
        addMessage(`❌ WebSocket error: ${error.message || 'Unknown error'}`, 'error');
      };

    } catch (error) {
      addMessage(`❌ Connection failed: ${error.message}`, 'error');
      setConnectionStatus('Error');
    }
  };

  const disconnect = () => {
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
  };

  const sendMessage = () => {
    if (ws.current?.readyState === WebSocket.OPEN && testMessage.trim()) {
      try {
        const messageObj = JSON.parse(testMessage);
        ws.current.send(JSON.stringify(messageObj));
        addMessage(`📤 Sent: ${JSON.stringify(messageObj, null, 2)}`, 'sent');
        setTestMessage('');
      } catch (e) {
        // If not valid JSON, send as plain text
        ws.current.send(testMessage);
        addMessage(`📤 Sent (text): ${testMessage}`, 'sent');
        setTestMessage('');
      }
    } else if (ws.current?.readyState !== WebSocket.OPEN) {
      addMessage('❌ WebSocket not connected!', 'error');
    }
  };

  const sendPredefinedMessage = (messageType) => {
    if (ws.current?.readyState !== WebSocket.OPEN) {
      addMessage('❌ WebSocket not connected!', 'error');
      return;
    }

    let message;
    switch (messageType) {
      case 'ping':
        message = { type: 'ping', timestamp: new Date().toISOString() };
        break;
      case 'subscribe':
        message = { type: 'subscribe' };
        break;
      case 'test':
        message = { type: 'test', message: 'Hello from WebSocket test!' };
        break;
      default:
        return;
    }

    ws.current.send(JSON.stringify(message));
    addMessage(`📤 Sent: ${JSON.stringify(message, null, 2)}`, 'sent');
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'Connected': return 'text-green-600';
      case 'Connecting...': return 'text-yellow-600';
      case 'Error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getMessageColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'sent': return 'text-blue-600';
      case 'received': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">WebSocket Test</h1>
        
        {/* Connection Settings */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WebSocket URL Base:
              </label>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ws://localhost:8005/ws/comments/"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket ID:
              </label>
              <input
                type="text"
                value={customTicketId}
                onChange={(e) => setCustomTicketId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="TX20251106515163"
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              Status: <span className={getStatusColor()}>{connectionStatus}</span>
            </span>
            <button
              onClick={connect}
              disabled={connectionStatus === 'Connected'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Connect
            </button>
            <button
              onClick={disconnect}
              disabled={connectionStatus === 'Disconnected'}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Disconnect
            </button>
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            Full URL: {wsUrl}{customTicketId}/
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => sendPredefinedMessage('ping')}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Send Ping
            </button>
            <button
              onClick={() => sendPredefinedMessage('subscribe')}
              className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Subscribe
            </button>
            <button
              onClick={() => sendPredefinedMessage('test')}
              className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              Send Test Message
            </button>
          </div>
        </div>

        {/* Custom Message */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Send Custom Message</h2>
          <div className="flex gap-2">
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter JSON message or plain text..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Send
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Example JSON: {"{"}"type": "ping", "timestamp": "2024-11-09T10:00:00Z"{"}"}
          </div>
        </div>

        {/* Messages */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Messages ({messages.length})</h2>
            <button
              onClick={clearMessages}
              className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              Clear
            </button>
          </div>
          
          <div className="bg-white rounded-md border h-96 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="text-gray-500 text-center">No messages yet. Connect to start receiving messages.</div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="border-b border-gray-200 pb-2">
                    <div className="flex justify-between items-start">
                      <pre className={`text-sm ${getMessageColor(msg.type)} whitespace-pre-wrap`}>
                        {msg.message}
                      </pre>
                      <span className="text-xs text-gray-400 ml-2">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. Make sure your messaging service is running on the specified port (default: 8005)</li>
            <li>2. Enter the correct ticket ID you want to test</li>
            <li>3. Click "Connect" to establish WebSocket connection</li>
            <li>4. Use "Quick Actions" or send custom messages to test functionality</li>
            <li>5. Watch the messages area for real-time WebSocket communication</li>
            <li>6. Perform comment actions in your app to see live notifications here</li>
          </ul>
        </div>
      </div>
    </div>
  );
}