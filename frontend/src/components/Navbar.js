import React from 'react';
// 1. Import NavLink instead of Link
import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar({ toggleTheme, theme }) {
  return (
    <nav className="navbar">
      <div className="nav-logo">
        <NavLink to="/">FFSite</NavLink>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/" end>Home</NavLink>
        </li>
        <li>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </li>
        <li>
          <NavLink to="/playoffs">BIG Playoff</NavLink>
        </li>
        <li>
          <button onClick={toggleTheme} className="theme-toggle-button">
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;