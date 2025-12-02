import React, { useState, useEffect } from 'react';
import api from '../api'; // Use our secure helper
import './DashboardPage.css'; // Reuse the Pill Tabs styles
import './LeagueDetailPage.css'; // Reuse the Glass Table styles
import './PlayoffPage.css'; // New status styles

function PlayoffPage() {
  // State
  const [playoffData, setPlayoffData] = useState({}); // { 15: [...], 16: [...] }
  const [availableWeeks, setAvailableWeeks] = useState([]); // [15, 16]
  const [activeTab, setActiveTab] = useState(null); // Current selected week (e.g. 16)
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/playoff-entries/')
      .then(response => {
        // 1. Group the raw list by week
        const grouped = groupEntriesByWeek(response.data);
        setPlayoffData(grouped);

        // 2. Find which weeks exist and sort them
        const weeks = Object.keys(grouped).map(Number).sort((a, b) => a - b);
        setAvailableWeeks(weeks);

        // 3. Default to the LATEST week available
        if (weeks.length > 0) {
          setActiveTab(weeks[weeks.length - 1]);
        }
        
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching playoff data:', error);
        setError(error);
        setIsLoading(false);
      });
  }, []);

  // Helper: Group flat list into object by week
  const groupEntriesByWeek = (entries) => {
    return entries.reduce((acc, entry) => {
      const week = entry.playoff_week;
      if (!acc[week]) {
        acc[week] = [];
      }
      acc[week].push(entry);
      return acc;
    }, {});
  };

  // Helper: Determine the status badge logic
  const getStatusBadge = (entry) => {
    // 1. If explicitly eliminated in DB
    if (entry.is_eliminated) {
      return <span className="status-badge status-eliminated">Eliminated</span>;
    }

    // 2. Check if this is the "Current" week (the max week available)
    const maxWeek = Math.max(...availableWeeks);
    
    if (entry.playoff_week === maxWeek) {
      // If they aren't eliminated and it's the current week, they are fighting!
      return <span className="status-badge status-active">Active</span>;
    } else {
      // If they weren't eliminated in an OLD week, they moved on.
      return <span className="status-badge status-advanced">Advanced</span>;
    }
  };

  // --- Render ---

  if (isLoading) {
    return <div className="playoff-container"><p>Loading playoff data...</p></div>;
  }

  if (error) {
    return <div className="playoff-container"><p style={{ color: 'red' }}>Error: {error.message}</p></div>;
  }

  if (availableWeeks.length === 0) {
    return (
      <div className="playoff-container">
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>The BIG Playoff</h1>
          <p>The bracket has not started yet.</p>
          <p>Check back after Week 15 begins!</p>
        </div>
      </div>
    );
  }

  // Get the list for the currently selected tab
  const currentEntries = playoffData[activeTab] || [];

  return (
    <div className="playoff-container">
      <div className="playoff-header">
        <h1>BIG Playoff Leaderboard</h1>
      </div>

      {/* 1. Week Tabs (Reusing Dashboard Styles) */}
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

        {/* 2. The Table (Reusing LeagueDetail Styles) */}
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
              {currentEntries.map((entry, index) => (
                <tr key={entry.id}>
                  <td>{entry.final_rank || index + 1}</td>
                  <td>
                    <span style={{ fontWeight: '600' }}>{entry.team}</span>
                  </td>
                  <td style={{ fontSize: '1.1rem' }}>
                    {entry.week_score}
                  </td>
                  <td>
                    {getStatusBadge(entry)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PlayoffPage;