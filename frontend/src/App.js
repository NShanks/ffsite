import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
// Pages
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import LeagueDetailPage from './pages/LeagueDetailPage';
import PlayoffPage from './pages/PlayoffPage';  
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AboutPage from './pages/AboutPage';
// Components
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

function App() {
  // Check localStorage for a saved theme, or default to 'light'
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Create a function to toggle the theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Create an effect that runs when 'theme' changes
  useEffect(() => {
    // Update the <html> tag's data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    // Save the user's preference in localStorage
    localStorage.setItem('theme', theme);
  }, [theme]); // This effect's running depends on the 'theme' state

  return (
    <div className="App">
      {/* 5. Pass the theme and the toggle function down to the Navbar */}
      <Navbar toggleTheme={toggleTheme} theme={theme} />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leagues/:id" element={<LeagueDetailPage />} />
        <Route path="/playoffs" element={<PlayoffPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;