import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { TicketsProvider } from './api/TicketsContext.jsx'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <TicketsProvider>
      <App />
    </TicketsProvider>
  </AuthProvider>
)
