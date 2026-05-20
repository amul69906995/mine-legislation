import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically generate UUID and redirect to chat
    const chatId = uuidv4();
    navigate(`/chat/${chatId}`, { replace: true });
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <p>Starting your chat session...</p>
    </div>
  );
}

export default HomePage;