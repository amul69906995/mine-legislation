import React, { useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import MessageForm from "./MessageForm";
import "./chatsection.css";

function ChatSection() {
  const {
    messages,
    replyWait,
    handleSend,
    chatError,
  } = useChat();

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <div className="chat-section">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <div className="bubble">
              {msg.text}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {chatError && (
        <div className="chat-error">
          {chatError}
        </div>
      )}

      <MessageForm
        onSend={handleSend}
        replyWait={replyWait}
      />
    </div>
  );
}

export default ChatSection;
