import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WorkspaceLayout from './components/layout/WorkspaceLayout'

const SharedViewPage = () => <div className="p-8 text-gray-500">Shared view — coming in Phase 5</div>

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WorkspaceLayout />} />
        <Route path="/view/:token" element={<SharedViewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
