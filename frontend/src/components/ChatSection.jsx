// import React, { useEffect, useRef } from "react";
// import { useChat } from "../context/ChatContext";
// import MessageForm from "./MessageForm";
// import "./chatsection.css";

// function ChatSection() {
//   const {
//     messages,
//     replyWait,
//     handleSend,
//     chatError,
//   } = useChat();

//   const messagesEndRef = useRef(null);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({
//       behavior: "smooth",
//     });
//   }, [messages]);

//   return (
//     <div className="chat-section">
//       <div className="messages">
//         {messages.map((msg, idx) => (
//           <div key={idx} className={`message ${msg.sender}`}>
//             <div className="bubble">
//               {msg.text}
//             </div>
//           </div>
//         ))}

//         <div ref={messagesEndRef} />
//       </div>

//       {chatError && (
//         <div className="chat-error">
//           {chatError}
//         </div>
//       )}

//       <MessageForm
//         onSend={handleSend}
//         replyWait={replyWait}
//       />
//     </div>
//   );
// }

// export default ChatSection;
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useChat } from "../context/ChatContext";
import MessageForm from "./MessageForm";
import "./chatsection.css";

// ─── TTS hook ────────────────────────────────────────────────────────────────

function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [activeIdx, setActiveIdx] = useState(null);
  const utteranceRef = useRef(null);

  const speak = useCallback((text, idx) => {
    // If same message → toggle off
    if (activeIdx === idx && speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setActiveIdx(null);
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;

    // Pick a natural-sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && v.localService
    ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => {
      setSpeaking(true);
      setActiveIdx(idx);
    };
    utterance.onend = () => {
      setSpeaking(false);
      setActiveIdx(null);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setActiveIdx(null);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [activeIdx, speaking]);

  // Stop speech when component unmounts or user navigates away
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  return { speak, speaking, activeIdx };
}

// ─── Speak button ─────────────────────────────────────────────────────────────

function SpeakButton({ text, idx, speak, speaking, activeIdx }) {
  const isThisActive = activeIdx === idx && speaking;

  return (
    <button
      className={`speak-btn ${isThisActive ? "speak-btn--active" : ""}`}
      onClick={() => speak(text, idx)}
      title={isThisActive ? "Stop reading" : "Read aloud"}
      aria-label={isThisActive ? "Stop reading" : "Read aloud"}
    >
      {isThisActive ? (
        // Animated sound wave while speaking
        <span className="speak-icon speak-icon--playing">
          <span /><span /><span /><span />
        </span>
      ) : (
        // Static speaker icon
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}

// ─── Chat section ─────────────────────────────────────────────────────────────

function ChatSection() {
  const { messages, replyWait, handleSend, chatError } = useChat();
  const { speak, speaking, activeIdx } = useSpeech();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
console.log("messages in chat section",messages)
  return (
    <div className="chat-section">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <div className="bubble">
              {msg.text}

              {/* Read aloud button — only on assistant messages */}
              {msg.sender === "bot" && (
                <SpeakButton
                  text={msg.text}
                  idx={idx}
                  speak={speak}
                  speaking={speaking}
                  activeIdx={activeIdx}
                />
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {chatError && <div className="chat-error">{chatError}</div>}

      <MessageForm onSend={handleSend} replyWait={replyWait} />
    </div>
  );
}

export default ChatSection;
