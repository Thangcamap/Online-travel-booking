import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './components/HomePage'
import AdminDashboard from './components/AdminDashboard'
import ProviderDashboard from './components/ProviderDashboard'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Test giao diện ProviderDashboard với providerId = 1 */}
            <Route path="/" element={<ProviderDashboard providerId={1} />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/home" element={<HomePage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
