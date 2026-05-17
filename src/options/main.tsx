import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/index.css'
import { OptionsApp } from '@/options/options-app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>
)
