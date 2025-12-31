import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { TicketsProvider } from './api/TicketsContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <TicketsProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </TicketsProvider>
  </AuthProvider>
)
