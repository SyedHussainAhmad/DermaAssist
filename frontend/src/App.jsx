import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ImageCapturePage from './pages/ImageCapturePage.jsx'
import QuestionnairePage from './pages/QuestionnairePage.jsx'
import ResultPage from './pages/ResultPage.jsx'
import LandingPage from './pages/LandingPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<LandingPage />} />
        <Route path="/scan"        element={<ImageCapturePage />} />
        <Route path="/questionnaire" element={<QuestionnairePage />} />
        <Route path="/result"      element={<ResultPage />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
