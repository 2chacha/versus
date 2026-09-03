import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { RosterProvider } from './context/RosterContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RosterProvider>
      <App />
    </RosterProvider>
  </StrictMode>,
)
