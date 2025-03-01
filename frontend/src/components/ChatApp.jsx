import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatSection from './ChatSection';
import './styles.css'; // Assuming you have a CSS file for styles
function ChatApp() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! How can I help you?' },
  ]);

  const handleSend = (text) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { sender: 'user', text }]);

    // Simulate bot reply
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Dummy reply Got it!' }]);
    }, 1000);
  };

  return (
    <div className="chat-app">
      <Sidebar />
      <ChatSection messages={messages} onSend={handleSend} />
    </div>
  );
}

export default ChatApp;
