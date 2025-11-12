import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import LeagueDetailPage from './pages/LeagueDetailPage';
import PlayoffPage from './pages/PlayoffPage'; 
import Navbar from './components/Navbar'; 

function App() {
  // 2. Setup theme state
  // We check localStorage for a saved theme, or default to 'light'
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // 3. Create a function to toggle the theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // 4. Create an effect that runs when 'theme' changes
  useEffect(() => {
    // 4a. Update the <html> tag's data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    // 4b. Save the user's preference in localStorage
    localStorage.setItem('theme', theme);
  }, [theme]); // This effect depends on the 'theme' state

  return (
    <div className="App">
      {/* 5. Pass the theme and the toggle function down to the Navbar */}
      <Navbar toggleTheme={toggleTheme} theme={theme} />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leagues/:id" element={<LeagueDetailPage />} />
        <Route path="/playoffs" element={<PlayoffPage />} />
      </Routes>
    </div>
  );
}

export default App;