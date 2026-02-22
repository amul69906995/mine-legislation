import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import RagSource from './components/RagSource.jsx';
import Methodlogy from './components/Methodlogy.jsx';
import Upload from './components/Upload.jsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />
  },
  {
    path:'/rag-source',
    element:<RagSource/>
  },
 {
    path:'/methodlogy',
    element:<Methodlogy/>
  },
 {
    path:'/upload-to-knowledge-base',
    element:<Upload/>
  },
]);
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
