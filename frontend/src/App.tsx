import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WorkspaceLayout from './components/layout/WorkspaceLayout'
import SharedViewPage from './pages/SharedViewPage'
import ErrorBoundary from './components/ui/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WorkspaceLayout />} />
          <Route path="/shared/:token" element={<SharedViewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
