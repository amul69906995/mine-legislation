import React, { useState } from 'react';
import './styles.css'; // Assuming you have a CSS file for styles
function MessageForm({ onSend,replyWait }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(text);
    setText('');
  };

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
      />
      <button type="submit" disabled={replyWait}>{replyWait?"waiting for reply...":"Send"}</button>
    </form>
  );
}

export default MessageForm;
