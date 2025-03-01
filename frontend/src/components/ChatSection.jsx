import React from 'react';
import MessageForm from './MessageForm';
import './styles.css';
function ChatSection({ messages, onSend }) {
  return (
    <div className="chat-section">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <div className="bubble">{msg.text}</div>
          </div>
        ))}
      </div>
      <MessageForm onSend={onSend} />
    </div>
  );
}

export default ChatSection;
