import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { SeasonProvider } from './context/SeasonContext';
import { DataProvider } from './context/DataContext';
import Navbar from './components/Navbar';
import SeasonModeBanner from './components/SeasonModeBanner';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import LeagueDetailPage from './pages/LeagueDetailPage';
import PlayoffPage from './pages/PlayoffPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import WelcomePage from './pages/WelcomePage';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <AuthProvider>
      <SeasonProvider>
      <DataProvider>
        <div className="App">
          <Navbar toggleTheme={toggleTheme} theme={theme} />
          <SeasonModeBanner />
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"               element={<HomePage />} />
              <Route path="/dashboard"      element={<DashboardPage />} />
              <Route path="/leagues/:index" element={<LeagueDetailPage />} />
              <Route path="/playoffs"       element={<PlayoffPage />} />
              <Route path="/about"          element={<AboutPage />} />
              <Route path="/login"          element={<LoginPage />} />
              <Route path="/register"       element={<RegisterPage />} />
              <Route path="/profile"        element={<ProfilePage />} />
              <Route path="/welcome"        element={<WelcomePage />} />
              <Route element={<ProtectedRoute staffOnly />}>
                <Route path="/admin"        element={<AdminDashboard />} />
              </Route>
            </Routes>
          </AnimatePresence>
        </div>
      </DataProvider>
      </SeasonProvider>
    </AuthProvider>
  );
}

export default App;
