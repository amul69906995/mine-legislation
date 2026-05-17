import { NavLink } from "react-router-dom";
import { useChat } from "../context/ChatContext";
import "./sidebar.css";

function Sidebar() {
    const {
        selectedCountry,
        setSelectedCountry,
        selectedModel,
        setSelectedModel,
    } = useChat();

    return (
        <div className="sidebar">
            <h2>Mine Assistant</h2>

            <div className="nav-buttons">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        isActive
                            ? "sidebar-btn active"
                            : "sidebar-btn"
                    }
                >
                    Chat
                </NavLink>

                <NavLink
                    to="/rag-source"
                    className={({ isActive }) =>
                        isActive
                            ? "sidebar-btn active"
                            : "sidebar-btn"
                    }
                >
                    Rag Source
                </NavLink>

                <NavLink
                    to="/methodlogy"
                    className={({ isActive }) =>
                        isActive
                            ? "sidebar-btn active"
                            : "sidebar-btn"
                    }
                >
                    Methodology
                </NavLink>

                <NavLink
                    to="/upload-to-knowledge-base"
                    className={({ isActive }) =>
                        isActive
                            ? "sidebar-btn active"
                            : "sidebar-btn"
                    }
                >
                    Knowledge Base
                </NavLink>
            </div>

            <div className="selectors">
                <div className="country-selector">
                    <label>Select Country</label>

                    <select
                        value={selectedCountry}
                        onChange={(e) =>
                            setSelectedCountry(e.target.value)
                        }
                    >
                        <option value="india">India</option>
                        <option value="australia">Australia</option>
                        <option value="canada">Canada</option>
                        <option value="russia">Russia</option>
                        <option value="usa">USA</option>
                        <option value="south africa">
                            South Africa
                        </option>
                    </select>
                </div>

                <div className="country-selector">
                    <label>Select Model</label>

                    <select
                        value={selectedModel}
                        onChange={(e) =>
                            setSelectedModel(e.target.value)
                        }
                    >
                        <option value="rag">Rag</option>
                        <option value="ragadv">RagAdv</option>
                        <option value="trained">Trained</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;