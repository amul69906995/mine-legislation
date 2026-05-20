import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useChat } from "../context/ChatContext";
import "./sidebar.css";
import LatestChats from "./LatestChats";

function Sidebar() {
  const {
    selectedCountry,
    setSelectedCountry,
    selectedModel,
    setSelectedModel,
    newConversation,
  } = useChat();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNewChat = () => {
    newConversation(navigate);
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <div className="sidebar desktop-sidebar">
        <h2>Mine Assistant</h2>

        <button
          onClick={handleNewChat}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          New Chat
        </button>

        <div
          className="nav-buttons"
          style={{ flexShrink: 0 }}
        >
          <NavLink
            to="/rag-source"
            className={({ isActive }) =>
              isActive ? "sidebar-btn active" : "sidebar-btn"
            }
          >
            Rag Source
          </NavLink>

          <NavLink
            to="/methodlogy"
            className={({ isActive }) =>
              isActive ? "sidebar-btn active" : "sidebar-btn"
            }
          >
            Methodology
          </NavLink>

          <NavLink
            to="/upload-to-knowledge-base"
            className={({ isActive }) =>
              isActive ? "sidebar-btn active" : "sidebar-btn"
            }
          >
            Knowledge Base
          </NavLink>
        </div>

        <div
          className="selectors"
          style={{ flexShrink: 0 }}
        >
          <div className="country-selector">
            <label>Select Country</label>

            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              <option value="india">India</option>
              <option value="australia">Australia</option>
              <option value="canada">Canada</option>
              <option value="russia">Russia</option>
              <option value="usa">USA</option>
              <option value="south africa">South Africa</option>
            </select>
          </div>

          <div className="country-selector">
            <label>Select Model</label>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="rag">Rag</option>
              <option value="ragadv">RagAdv</option>
              <option value="trained">Trained</option>
            </select>
          </div>
        </div>

        <LatestChats />
      </div>

      {/* MOBILE HEADER */}
      <div className="mobile-navbar">
        <div className="mobile-topbar">
          <h2>Mine Assistant</h2>

          <button
            className="menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-menu">
            <button
              onClick={() => {
                handleNewChat();
                setMobileMenuOpen(false);
              }}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "20px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ➕ New Chat
            </button>

            <div className="nav-buttons">
              <NavLink
                to="/rag-source"
                className={({ isActive }) =>
                  isActive ? "sidebar-btn active" : "sidebar-btn"
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                Rag Source
              </NavLink>

              <NavLink
                to="/methodlogy"
                className={({ isActive }) =>
                  isActive ? "sidebar-btn active" : "sidebar-btn"
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                Methodology
              </NavLink>

              <NavLink
                to="/upload-to-knowledge-base"
                className={({ isActive }) =>
                  isActive ? "sidebar-btn active" : "sidebar-btn"
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                Knowledge Base
              </NavLink>
            </div>

            <div className="selectors">
              <div className="country-selector">
                <label>Select Country</label>

                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                >
                  <option value="india">India</option>
                  <option value="australia">Australia</option>
                  <option value="canada">Canada</option>
                  <option value="russia">Russia</option>
                  <option value="usa">USA</option>
                  <option value="south africa">South Africa</option>
                </select>
              </div>

              <div className="country-selector">
                <label>Select Model</label>

                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <option value="rag">Rag</option>
                  <option value="ragadv">RagAdv</option>
                  <option value="trained">Trained</option>
                </select>
              </div>
            </div>

            <LatestChats />
          </div>
        )}
      </div>
    </>
  );
}

export default Sidebar;