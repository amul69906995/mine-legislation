// import MessageForm from './MessageForm';
// import './styles.css';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';
// import rehypeHighlight from "rehype-highlight";


// function ChatSection({ messages, onSend, replyWait }) {
//   return (
//     <div className="chat-section">
//       <div className="messages">
//         {messages.map((msg, idx) => (
//           <div key={idx} className={`message ${msg.sender}`}>
//             <div className="bubble">
//               <ReactMarkdown
//                 remarkPlugins={[remarkGfm]}
//                 rehypePlugins={[rehypeHighlight]}
//               >
//                 {msg.text}
//               </ReactMarkdown>
//             </div>
//           </div>
//         ))}
//       </div>
//       <MessageForm onSend={onSend} replyWait={replyWait} />
//     </div>
//   );
// }

// export default ChatSection;
import { useEffect, useRef } from 'react';
import MessageForm from './MessageForm';
import './styles.css';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';
// import rehypeHighlight from "rehype-highlight";

function ChatSection({ messages, onSend, replyWait }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-section">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <div className="bubble">
              {/* <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  p: ({ children }) => <span>{children}<br /></span>
                }}
              > */}
                {msg.text}
              {/* </ReactMarkdown> */}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageForm onSend={onSend} replyWait={replyWait} />
    </div>
  );
}

export default ChatSection;
