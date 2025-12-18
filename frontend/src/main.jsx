import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import RagSource from './components/RagSource.jsx';
import Methodlogy from './components/Methodlogy.jsx';

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

]);
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
