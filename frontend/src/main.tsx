import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configure } from 'mobx'
import './index.css'
import App from './App.tsx'

// Require all state mutations to happen inside MobX actions
configure({ enforceActions: 'observed' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
