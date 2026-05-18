// import { useChat } from "../context/ChatContext";
// import "./ragsource.css";

// function RagSource() {
//   const { ragSources, replyWait } = useChat();

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
//           <h3>{source.fields.file_name}</h3>

//           <div className="source-text">
//             {source.fields.chunk_text}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// export default RagSource;

import { useChat } from "../context/ChatContext";
import "./ragsource.css";

function RagSource() {
  const { ragSources, replyWait } = useChat();

const getHighlightedPdfUrl = (source) => {
  const {
    country,
    mongoIdForFileName,
  } = source.fields;

  return `https://res.cloudinary.com/dlvl67zqo/raw/upload/v1779032240/mine-legislation/${country}/${mongoIdForFileName}.pdf`;
};

  if (replyWait) {
    return (
      <div className="rag-source-container">
        <h1>RAG Sources</h1>
        <p>Loading sources...</p>
      </div>
    );
  }

  if (!ragSources?.length) {
    return (
      <div className="rag-source-container">
        <h1>RAG Sources</h1>
        <p>No retrieved sources for current chat.</p>
      </div>
    );
  }

  return (
    <div className="rag-source-container">
      <h1>RAG Sources</h1>

      {ragSources.map((source) => (
        <div key={source._id} className="source-card">

          <div className="source-top">
            <h3>{source.fields.file_name}</h3>

            <a
              href={getHighlightedPdfUrl(source)}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-link"
            >
              Open PDF ↗
            </a>
          </div>

          <div className="source-text">
            {source.fields.chunk_text}
          </div>
        </div>
      ))}
    </div>
  );
}

export default RagSource;
