import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import App from "./App.jsx";
import RagSource from "./components/RagSource.jsx";
import Methodlogy from "./components/Methodlogy.jsx";
import Upload from "./components/Upload.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import ChatSection from "./components/ChatSection.jsx";
import HomePage from "./components/HomePage.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "chat/:chatId", 
        element: <ChatSection />,
      },
      {
        path: "rag-source",
        element: <RagSource />,
      },
      {
        path: "methodlogy",
        element: <Methodlogy />,
      },
      {
        path: "upload-to-knowledge-base",
        element: <Upload />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ChatProvider>
      <RouterProvider router={router} />
    </ChatProvider>
  </StrictMode>
);