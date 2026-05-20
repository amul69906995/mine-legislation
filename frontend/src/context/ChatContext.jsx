import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const ChatContext = createContext();

const BOT_WELCOME = {
  sender: "bot",
  text: "Hello! How can I help you with mining legislation?",
};

export const ChatProvider = ({ children }) => {
  const [guestSessionId, setGuestSessionId] = useState(null);
  const [messages, setMessages] = useState([BOT_WELCOME]);
  const [replyWait, setReplyWait] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("india");
  const [selectedModel, setSelectedModel] = useState("rag");
  const [ragSources, setRagSources] = useState([]);
  const [chatError, setChatError] = useState("");
  const [latestChats, setLatestChats] = useState([]);

  const fetchLatestChats = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/chats/latest`
      );
      console.log("fetched latest chats", data)
      setLatestChats(data.chats || []);
    } catch (error) {
      console.error("Latest chats fetch failed:", error);
    }
  };

  useEffect(() => {
    fetchLatestChats();
  }, []);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);

    try {
      setReplyWait(true);
      setChatError("");

      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/chat`,
        {
          query: text,
          country: selectedCountry,
          model: selectedModel,
          guestSessionId,
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.message,
          messageId: data.messageId,
        },
      ]);

      setRagSources(data.rag_source || []);

      // refresh sidebar
      fetchLatestChats();

    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";

      setChatError(errorMessage);
    } finally {
      setReplyWait(false);
    }
  };

  const submitFeedback = async (messageId, feedback) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/feedback`, {
        messageId,
        feedback,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.messageId === messageId ? { ...msg, feedback } : msg
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const newConversation = (navigate) => {
    const newChatId = uuidv4();

    setGuestSessionId(newChatId);
    setMessages([BOT_WELCOME]);
    setRagSources([]);
    setChatError("");

    navigate(`/chat/${newChatId}`);
  };
  const loadChat = async (chatId) => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/chat/${chatId}`
      );

      const chat = data.chat;

      setGuestSessionId(chat.guestSessionId);
      setSelectedCountry(chat.currentCountry);
      setSelectedModel(chat.currentModel);

      if (!chat.messages || chat.messages.length === 0) {
        setMessages([BOT_WELCOME]);
        return;
      }

      const transformedMessages = [];

      chat.messages.forEach((msg) => {
        transformedMessages.push({
          sender: "user",
          text: msg.query,
        });

        if (msg.answer) {
          transformedMessages.push({
            sender: "bot",
            text: msg.answer,
            messageId: msg._id,
            feedback: msg.feedback,
          });
        }

        if (msg.errorMessage) {
          transformedMessages.push({
            sender: "bot",
            text: msg.answer,
            errorMessage:msg.errorMessage
          });
        }
      });

      setMessages(transformedMessages);
      const lastMessage = chat.messages[chat.messages.length - 1];
      setRagSources(lastMessage?.ragSources || []);
    } catch (error) {
      console.error("Failed to load chat:", error);
      setMessages([BOT_WELCOME]);
    }
  };
  return (
    <ChatContext.Provider
      value={{
        guestSessionId,
        setGuestSessionId,
        messages,
        setMessages,
        replyWait,
        selectedCountry,
        selectedModel,
        ragSources,
        chatError,
        latestChats,
        fetchLatestChats,
        setSelectedCountry,
        setSelectedModel,
        handleSend,
        submitFeedback,
        newConversation,
        loadChat
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);