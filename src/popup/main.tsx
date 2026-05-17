import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { PopupApp } from '@/popup/popup-app'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>
)
