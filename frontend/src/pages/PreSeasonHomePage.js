import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSeason } from '../context/SeasonContext';
import { pageVariants, pageTransition } from '../utils/animations';
import './PreSeasonHomePage.css';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default function PreSeasonHomePage() {
  const { user } = useAuth();
  const { selectedSeason } = useSeason();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSeason?.year) return;
    setLoading(true);
    fetch(`${BASE}/seasons/${selectedSeason.year}/preview/`)
      .then((r) => r.json())
      .then((data) => { setPreview(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedSeason?.year]);

  const label = selectedSeason?.label || String(selectedSeason?.year || '');

  return (
    <motion.div
      className="preseason-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {/* Hero card */}
      <div className="preseason-hero glass-card">
        <div className="preseason-hero-tag">⏳ Coming Soon</div>
        <h1 className="preseason-hero-title">{label}</h1>
        <p className="preseason-hero-sub">
          The new season is being set up. Leagues, matchups, and standings will
          appear here once the season kicks off.
        </p>
      </div>

      {/* Stats row */}
      {!loading && preview && (
        <div className="preseason-stats-row">
          {/* Member count card */}
          <div className="preseason-stat-card glass-card">
            <div className="preseason-stat-icon">👥</div>
            <div className="preseason-stat-value">{preview.member_count}</div>
            <div className="preseason-stat-label">players registered</div>
            {user ? (
              <Link to="/profile" className="preseason-cta-link">You're in →</Link>
            ) : (
              <Link to="/register" className="preseason-cta-link">Sign up →</Link>
            )}
          </div>

          {/* Planned leagues card */}
          {preview.planned_leagues?.length > 0 && (
            <div className="preseason-stat-card glass-card">
              <div className="preseason-stat-icon">🏟️</div>
              <div className="preseason-stat-value">{preview.planned_leagues.length}</div>
              <div className="preseason-stat-label">
                planned league{preview.planned_leagues.length !== 1 ? 's' : ''}
              </div>
              <ul className="preseason-league-list">
                {preview.planned_leagues.map((l, i) => (
                  <li key={i}>{l.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* CTA for guests */}
      {!user && (
        <div className="preseason-signup-prompt glass-card">
          <p>Want in? Create an account to get on the list for {label}.</p>
          <Link to="/register" className="preseason-signup-btn">Create account →</Link>
        </div>
      )}
    </motion.div>
  );
}
