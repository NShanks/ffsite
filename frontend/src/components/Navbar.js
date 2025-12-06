import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; 
import './Navbar.css';

function Navbar({ toggleTheme, theme }) {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('access_token');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/');
    window.location.reload();
  };

  return (
    <nav className="navbar">
      {/* Logo Section */}
      <div className="nav-logo">
        <NavLink to="/">FFSite</NavLink>
      </div>

      {/* Main Links Container */}
      <div className="nav-links">
        
        {/* Group 1: Pages */}
        <div className="nav-button-pages">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/playoffs">BIG Playoff</NavLink>
        </div>

        {/* Group 2: Actions (Admin, Login, Theme) */}
        <div className="nav-button-container">
          
          {/* Conditional Login/Logout */}
          {isLoggedIn ? (
            <>
              <NavLink to="/admin-dashboard">Admin</NavLink>
              <button onClick={handleLogout} className="theme-toggle-button text-button">
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login">Login</NavLink>
          )}

          {/* Theme Toggle with your SVGs */}
          <button onClick={toggleTheme} className="theme-toggle-button icon-button">
            {theme === 'light' ? (
              <span 
                className="theme-icon" 
                style={{ maskImage: 'url(/IcRoundNightlight.svg)', WebkitMaskImage: 'url(/IcRoundNightlight.svg)' }} 
                aria-label="Switch to Dark Mode"
              ></span>
            ) : (
              <span 
                className="theme-icon" 
                style={{ maskImage: 'url(/IcRoundLightMode.svg)', WebkitMaskImage: 'url(/IcRoundLightMode.svg)' }} 
                aria-label="Switch to Light Mode"
              ></span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;