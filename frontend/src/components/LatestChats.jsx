import React from "react";
import { NavLink } from "react-router-dom";
import { useChat } from "../context/ChatContext";

function LatestChats() {
  const { latestChats } = useChat();

  return (
    <div
      className="latest-chats"
      style={{
        marginTop: "20px",
        paddingTop: "12px",
        borderTop: "1px solid #e5e5e5",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h4
        style={{
          marginBottom: "12px",
          fontSize: "14px",
          color: "#666",
          flexShrink: 0,
        }}
      >
        Recent Chats
      </h4>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingRight: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {latestChats.length === 0 ? (
          <p>No chats yet</p>
        ) : (
          latestChats.map((chat) => (
            <NavLink
              key={chat.guestSessionId}
              to={`/chat/${chat.guestSessionId}`}
              className={({ isActive }) =>
                isActive ? "sidebar-btn active" : "sidebar-btn"
              }
              style={{
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flexShrink: 0,
              }}
            >
              {`Chat ${chat.guestSessionId.slice(-10)}`}
            </NavLink>
          ))
        )}
      </div>
    </div>
  );
}

export default LatestChats;