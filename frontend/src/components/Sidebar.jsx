import { Link } from "react-router-dom";
import "./styles.css";

function Sidebar({
  selectedCountry,
  setSelectedCountry,
  selectedModel,
  setSelectedModel,
}) {
  return (
    <div className="sidebar">
      <h2>Chats</h2>

      <Link to="/rag-source">
        <button
          style={{
            width: "100%",
            padding: "10px 14px",
            marginBottom: "10px",
            backgroundColor: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          Rag Source
        </button>
      </Link>

      <Link to="/methodlogy">
        <button
          style={{
            width: "100%",
            padding: "10px 14px",
            backgroundColor: "#455a64",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          Methodology
        </button>
      </Link>
      <br />
      <br />
      <div className="country-selector">
        <label>Select Country:</label>
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

      <br />

      <div className="country-selector">
        <label>Select Model:</label>
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
  );
}

export default Sidebar;
