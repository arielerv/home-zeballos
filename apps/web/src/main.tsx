import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { i18n } from './i18n/instance'
import { initializeTheme } from './lib/theme'
import App from './App'
import './index.css'
import './theme.css'

initializeTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}><App /></I18nextProvider>
  </StrictMode>,
)
