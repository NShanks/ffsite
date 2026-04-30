import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSeason } from '../context/SeasonContext';
import './Navbar.css';

function Navbar({ toggleTheme, theme }) {
  const { user, logout } = useAuth();
  const { seasons, selectedYear, setSelectedYear } = useSeason();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {isMenuOpen && (
        <div className="nav-backdrop" onClick={() => setIsMenuOpen(false)} />
      )}
      <nav className={`navbar${isMenuOpen ? ' open' : ''}`}>
        <div className="nav-logo">
          <NavLink to="/">FFSite</NavLink>
        </div>

        <button
          className="hamburger-btn"
          onClick={() => setIsMenuOpen(o => !o)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`hamburger-icon${isMenuOpen ? ' open' : ''}`} />
        </button>

        <div className="nav-links">
          <div className="nav-button-pages">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/playoffs">BIG Playoff</NavLink>
            {user?.is_staff && <NavLink to="/admin">Admin</NavLink>}
          </div>

          {seasons.length > 1 && (
          <select
            className="nav-year-picker"
            value={selectedYear || ''}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            aria-label="Select season year"
          >
            {seasons.map((s) => (
              <option key={s.year} value={s.year}>
                {s.label || s.year}{s.is_active ? ' ✦' : ''}
              </option>
            ))}
          </select>
        )}

        <div className="nav-button-container">
            <button onClick={toggleTheme} className="theme-toggle-button icon-button">
              {theme === 'light' ? (
                <span
                  className="theme-icon"
                  style={{
                    maskImage: 'url(/IcRoundNightLight.svg)',
                    WebkitMaskImage: 'url(/IcRoundNightLight.svg)',
                  }}
                  aria-label="Switch to Dark Mode"
                />
              ) : (
                <span
                  className="theme-icon"
                  style={{
                    maskImage: 'url(/IcRoundLightMode.svg)',
                    WebkitMaskImage: 'url(/IcRoundLightMode.svg)',
                  }}
                  aria-label="Switch to Light Mode"
                />
              )}
            </button>

            {user ? (
              <>
                <NavLink to="/profile" className="nav-username">{user.username}</NavLink>
                <button className="theme-toggle-button text-button" onClick={handleLogout}>
                  Sign out
                </button>
              </>
            ) : (
              <NavLink to="/login" className="nav-signin">Sign in</NavLink>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
