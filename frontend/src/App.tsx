import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Placeholder pages — replaced in Phase 1 and Phase 5
const WorkspacePage = () => <div>Workspace — coming in Phase 1</div>
const SharedViewPage = () => <div>Shared view — coming in Phase 5</div>

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<WorkspacePage />} />
        <Route path="/view/:token"  element={<SharedViewPage />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
