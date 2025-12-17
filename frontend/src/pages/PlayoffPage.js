import React, { useState, useEffect } from 'react';
import api from '../api';
import './DashboardPage.css'; // Reuse Tabs
import './LeagueDetailPage.css'; // Reuse Glass Table
import './PlayoffPage.css'; // New Grid Layout

function PlayoffPage() {
  const [playoffData, setPlayoffData] = useState({});
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/playoff-entries/')
      .then(response => {
        console.log('Fetched playoff data:', response.data);
        const grouped = groupEntriesByWeek(response.data);
        setPlayoffData(grouped);
        // console.log('Grouped playoff data by week:', grouped);
        const weeks = Object.keys(grouped).map(Number).sort((a, b) => a - b);
        setAvailableWeeks(weeks);
        if (weeks.length > 0) setActiveTab(weeks[weeks.length - 1]);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching playoff data:', err);
        setError(err);
        setIsLoading(false);
      });
  }, []);

  const groupEntriesByWeek = (entries) => {
    return entries.reduce((acc, entry) => {
      const week = entry.playoff_week;
      if (!acc[week]) acc[week] = [];
      acc[week].push(entry);
      return acc;
    }, {});
  };

  const getStatusBadge = (entry) => {
    // console.log('Determining status for entry:', entry);
    if (entry.is_eliminated) return <span className="status-badge status-eliminated">Eliminated</span>;
    const maxWeek = Math.max(...availableWeeks);
    return entry.playoff_week === maxWeek 
      ? <span className="status-badge status-active">Active</span> 
      : <span className="status-badge status-advanced">Advanced</span>;
  };

  // --- NEW: Helper to render a specific list of teams ---
  const renderTable = (entries, title) => (
    <div className="conference-column">
      {title && <h2>{title}</h2>}
      <div className="standings-content">
        <table className="standings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries
              .sort((a, b) => b.starting_points - a.starting_points) // Sort by seed points initially
              .map((entry, index) => (
              <tr key={entry.id}>
                <td>{index + 1}</td>
                <td>
                  <div style={{ fontWeight: '600' }}>{entry.team}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{entry.league_name}</div>
                </td>
                <td style={{ fontSize: '1.1rem', fontFamily: 'monospace' }}>
                   {/* If score is 0, show seed points (PF) as reference? 
                       Or just show 0.00 until games start. Let's show Seed Points for now. */}
                   {entry.week_score > 0 ? entry.week_score : entry.starting_points}
                   {entry.week_score === 0 && <span style={{fontSize:'0.7em', color:'#888'}}> (Seed)</span>}
                </td>
                <td>{getStatusBadge(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isLoading) return <div className="playoff-container"><p>Loading...</p></div>;
  if (error) return <div className="playoff-container"><p>Error loading bracket.</p></div>;
  if (availableWeeks.length === 0) return (
    <div className="playoff-container" style={{textAlign:'center'}}>
      <div className="glass-card" style={{padding:'2rem'}}>
        <h1>The BIG Playoff</h1>
        <p>The bracket has not started yet.</p>
      </div>
    </div>
  );

  const currentEntries = playoffData[activeTab] || [];
  
  // --- NEW: Filter Logic ---
  const confA = currentEntries.filter(e => e.conference === 'Conference A');
  // console.log('currentEntries:', currentEntries);
  // console.log('Conference A Entries:', confA);
  const confB = currentEntries.filter(e => e.conference === 'Conference B');
  // console.log('Conference B Entries:', confB);
  const unknownConf = currentEntries.filter(e => !e.conference || (e.conference !== 'Conference A' && e.conference !== 'Conference B'));

  return (
    <div className="playoff-container">
      <div className="playoff-header">
        <h1>BIG Playoff Leaderboard</h1>
      </div>

      <div className="tabs-container">
        <div className="league-tabs">
          {availableWeeks.map(week => (
            <button
              key={week}
              className={`tab ${activeTab === week ? 'active' : ''}`}
              onClick={() => setActiveTab(week)}
            >
              Week {week}
            </button>
          ))}
        </div>

        {/* Dynamic Layout: Two Columns if we have A & B, else Single Column */}
        {confA.length > 0 && confB.length > 0 ? (
          <div className="conference-grid">
            {renderTable(confA, "Conference A")}
            {renderTable(confB, "Conference B")}
          </div>
        ) : (
          /* Finals or fallback for single list */
          <div className="conference-grid" style={{ gridTemplateColumns: '1fr' }}>
             {renderTable(currentEntries, "Finals Bracket")}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayoffPage;