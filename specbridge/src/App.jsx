import React from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import TranslatePage from './pages/TranslatePage'
import MeetingPage from './pages/MeetingPage'
import ProposalPage from './pages/ProposalPage'
import SettingsPage from './pages/SettingsPage'
import PageTranslatePage from './pages/PageTranslatePage'

function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Sidebar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/translate" element={<TranslatePage />} />
          <Route path="/meeting" element={<MeetingPage />} />
          <Route path="/proposal" element={<ProposalPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/page-translate" element={<PageTranslatePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
