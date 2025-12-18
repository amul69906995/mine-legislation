import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatSection from './ChatSection';
import './styles.css';
import axios from 'axios';
// Assuming you have a CSS file for styles
function ChatApp() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! How can I help you?' },
  ]);
  const [replyWait, setReplyWait] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState("india")
  const [selectedModel,setSelectedModel]=useState('rag')
  const handleSend = async (text) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { sender: 'user', text }]);
    //we will make setreplywait to true and send req with user query
    //when we get data we make setreplywait to false 
    try {
      setReplyWait(true);

      const url = `${import.meta.env.VITE_BACKEND_URL}/chat`;
      console.log(url)
      const { data } = await axios.post(url, {
        query: text,
        country: selectedCountry,
        model:selectedModel
      });
      console.log("query response", data);
      const newMessage = { sender: 'bot', text: data.message};
      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.log("error getting reply", error);
    } finally {
      setReplyWait(false);
    }
  };

  return (
    <div className="chat-app">
      <Sidebar selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} setSelectedModel={setSelectedModel} selectedModel={selectedModel}/>
      <ChatSection messages={messages} onSend={handleSend} replyWait={replyWait} />
    </div>
  );
}

export default ChatApp;
