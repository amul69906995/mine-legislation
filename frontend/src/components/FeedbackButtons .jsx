import React, { useState } from "react";
import { useChat } from "../context/ChatContext";

export const FeedbackButtons = ({ messageId, onFeedbackChange }) => {
  const { submitFeedback } = useChat();
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);

  const handleFeedback = async (type) => {
    if (submitting || selected === type) return; // only block if same button clicked
    setSubmitting(true);
    await submitFeedback(messageId, type);
    setSelected(type);
    onFeedbackChange?.(type);
    setSubmitting(false);
  };

  return (
    <div className="feedback-buttons">
      <button
        className={`feedback-btn ${selected === "like" ? "feedback-btn--active like" : ""}`}
        onClick={() => handleFeedback("like")}
        disabled={submitting || selected === "like"} // only disabled when THIS is selected
        aria-pressed={selected === "like"}
      >
        👍 {selected === "like" ? "Helpful ✓" : "Helpful"}
      </button>

      <button
        className={`feedback-btn ${selected === "unlike" ? "feedback-btn--active unlike" : ""}`}
        onClick={() => handleFeedback("unlike")}
        disabled={submitting || selected === "unlike"} // only disabled when THIS is selected
        aria-pressed={selected === "unlike"}
      >
        👎 {selected === "unlike" ? "Not Helpful ✓" : "Not Helpful"}
      </button>
    </div>
  );
};