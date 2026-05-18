import React, { createContext, useContext, useState } from "react";
import axios from "axios";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! How can I help you?" },
  ]);

  const [replyWait, setReplyWait] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("india");
  const [selectedModel, setSelectedModel] = useState("rag");
  const [ragSources, setRagSources] = useState([]);
  const [chatError, setChatError] = useState("");

  const handleSend = async (text) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);

    try {
      setReplyWait(true);

      const url = `${import.meta.env.VITE_BACKEND_URL}/chat`;

      const { data } = await axios.post(url, {
        query: text,
        country: selectedCountry,
        model: selectedModel,
      });
      console.log("got chat response from model", data)
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.message },
      ]);
      setRagSources(data.rag_source || []);

    } catch (error) {
      console.error(error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";

      setChatError(errorMessage);
    } finally {
      setReplyWait(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        replyWait,
        selectedCountry,
        selectedModel,
        ragSources,
        chatError,
        setSelectedCountry,
        setSelectedModel,
        handleSend,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);