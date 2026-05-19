
// import { useChat } from "../context/ChatContext";
// import "./ragsource.css";

// function RagSource() {
//   const { ragSources, replyWait } = useChat();

// const getHighlightedPdfUrl = (source) => {
//   const {
//     country,
//     mongoIdForFileName,
//   } = source.fields;

//   return `https://res.cloudinary.com/dlvl67zqo/raw/upload/v1779032240/mine-legislation/${country}/${mongoIdForFileName}.pdf`;
// };

//   if (replyWait) {
//     return (
//       <div className="rag-source-container">
//         <h1>RAG Sources</h1>
//         <p>Loading sources...</p>
//       </div>
//     );
//   }

//   if (!ragSources?.length) {
//     return (
//       <div className="rag-source-container">
//         <h1>RAG Sources</h1>
//         <p>No retrieved sources for current chat.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="rag-source-container">
//       <h1>RAG Sources</h1>

//       {ragSources.map((source) => (
//         <div key={source._id} className="source-card">

//           <div className="source-top">
//             <h3>{source.fields.file_name}</h3>

//             <a
//               href={getHighlightedPdfUrl(source)}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="pdf-link"
//             >
//               Open PDF ↗
//             </a>
//           </div>

//           <div className="source-text">
//             {source.fields.chunk_text}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// export default RagSource;
import { useState } from "react";
import { useChat } from "../context/ChatContext";
import PDFHighlightViewer from "./PDFHighlightViewer";
import "./ragsource.css";
 
function RagSource() {
  const { ragSources, replyWait } = useChat();
  const [activeSource, setActiveSource] = useState(null);
 
  if (replyWait) {
    return (
      <div className="rag-source-container">
        <h1>RAG Sources</h1>
        <div className="rag-loading">
          <span className="rag-spinner" />
          <p>Retrieving sources…</p>
        </div>
      </div>
    );
  }
 
  if (!ragSources?.length) {
    return (
      <div className="rag-source-container">
        <h1>RAG Sources</h1>
        <p className="rag-empty">No retrieved sources for current chat.</p>
      </div>
    );
  }
 
  return (
    <div className="rag-source-container">
      <h1>RAG Sources</h1>
 
      {ragSources.map((source, i) => (
        <div key={source._id} className="source-card">
          <div className="source-top">
            <div className="source-meta">
              <span className="source-index">#{i + 1}</span>
              <h3>{source.fields.file_name}</h3>
            </div>
 
            <button
              className="pdf-link"
              onClick={() => setActiveSource(source)}
              title="View highlighted in PDF"
            >
              View in PDF ↗
            </button>
          </div>
 
          <div className="source-text">{source.fields.chunk_text}</div>
        </div>
      ))}
 
      {/* Modal */}
      {activeSource && (
        <PDFHighlightViewer
          source={activeSource}
          onClose={() => setActiveSource(null)}
        />
      )}
    </div>
  );
}
 
export default RagSource;