import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import './Navbar.css';

function Navbar({ toggleTheme, theme }) {
  // 2. Get navigate function to redirect on logout
  const navigate = useNavigate();

  // 3. Check localStorage to see if we are logged in
  const isLoggedIn = !!localStorage.getItem('access_token');
  // The (!!) turns the string (or null) into a true/false boolean

  // 4. Create a logout function
  const handleLogout = () => {
    // Clear the tokens from storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // Redirect to home page and reload to clear everything
    navigate('/');
    window.location.reload();
  };

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <NavLink to="/">FFSite</NavLink>
      </div>
      <ul className="nav-links">
        <div className="nav-button-pages">
          <li>
            <NavLink to="/" end>Home</NavLink>
          </li>
          <li>
            <NavLink to="/about">About</NavLink>
          </li>
          <li>
            <NavLink to="/dashboard">Dashboard</NavLink>
          </li>
          <li>
            <NavLink to="/playoffs">BIG Playoff</NavLink>
          </li>
        </div>

        <div className="nav-button-container">
          {/* 5. Conditional Login/Logout Links */}
          {isLoggedIn ? (
            // If we ARE logged in, show these links
            <>
              {/* 4. ADD THIS LINK */}
              <li>
                <NavLink to="/admin-dashboard">Admin</NavLink>
              </li>
              <li>
                <button onClick={handleLogout} className="theme-toggle-button">
                  Logout
                </button>
              </li>
            </>
          ) : (
            // If we are NOT logged in, show a Login link
            <li>
              <NavLink to="/login">Login</NavLink>
            </li>
          )}

          <li>
            <button onClick={toggleTheme} className="theme-toggle-button">
              {theme === 'light' ? (
                <span 
                  className="theme-icon" 
                  style={{ maskImage: 'url(/IcRoundNightLight.svg)' }} 
                  aria-label="Switch to Dark Mode"
                ></span>
              ) : (
                <span 
                  className="theme-icon" 
                  style={{ maskImage: 'url(/IcRoundLightMode.svg)' }} 
                  aria-label="Switch to Light Mode"
                ></span>
              )}
            </button>
          </li>
        </div>
      </ul>
    </nav>
  );
}

export default Navbar;