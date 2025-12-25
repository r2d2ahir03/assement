import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import ArticleDetail from './ArticleDetail'
import './styles.css'

const router = createBrowserRouter([
  // Use a wildcard parent so nested <Routes> inside <App /> can match deeper paths
  { path: '*', element: <App /> },
  { path: '/articles/:id', element: <ArticleDetail /> },
]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} future={{ v7_startTransition: true, v7_relativeSplatPath: true }} />
  </React.StrictMode>
)
