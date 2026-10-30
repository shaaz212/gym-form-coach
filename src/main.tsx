import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Loaded only on /bench, so the app's start page does not download MediaPipe.
// oxlint-disable-next-line react/only-export-components
const BenchPage = lazy(() => import('./bench/BenchPage.tsx'))

const onBench = location.pathname.replace(/\/$/, '') === '/bench'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {onBench ? (
      <Suspense fallback={null}>
        <BenchPage />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
