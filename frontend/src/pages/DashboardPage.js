import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DashboardPage.css'; // Import our new tab styles
import './LeagueDetailPage.css'; // We'll reuse the table styles!

function DashboardPage() {
  // --- State ---
  // 1. For the list of leagues (for the tabs)
  const [leagues, setLeagues] = useState([]);
  // 2. For the standings of the *selected* league
  const [teams, setTeams] = useState([]);
  // 3. To track which league is currently selected
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);

  // 4. Loading/Error states
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [error, setError] = useState(null);

  // --- Effects ---
  // Effect 1: Fetch the list of all leagues (runs only ONCE)
  useEffect(() => {
    axios.get('http://localhost:8000/api/leagues/')
      .then(response => {
        setLeagues(response.data);
        // After fetching leagues, set the *first one* as default
        if (response.data.length > 0) {
          setSelectedLeagueId(response.data[0].id);
        }
        setIsLoadingLeagues(false);
      })
      .catch(error => {
        console.error('Error fetching leagues:', error);
        setError(error);
        setIsLoadingLeagues(false);
      });
  }, []); // Empty array [] means this runs once on mount

  // Effect 2: Fetch standings *whenever* selectedLeagueId changes
  useEffect(() => {
    // Don't run if no league is selected yet
    if (!selectedLeagueId) {
      return;
    }

    setIsLoadingTeams(true); // Show loading spinner for the table

    axios.get(`http://localhost:8000/api/teams/?league=${selectedLeagueId}`)
      .then(response => {
        setTeams(response.data); // Set the new standings
        setIsLoadingTeams(false);
      })
      .catch(error => {
        console.error('Error fetching teams:', error);
        setError(error);
        setIsLoadingTeams(false);
      });
  }, [selectedLeagueId]); // This effect "watches" selectedLeagueId


  // --- Render Logic ---

  // Helper function to render the standings table
  const renderStandingsTable = () => {
    if (isLoadingTeams) {
      return <p>Loading standings...</p>;
    }
    if (teams.length === 0) {
      return <p>No teams found for this league.</p>;
    }

    // We can just copy the table from LeagueDetailPage.js!
    return (
      <table className="standings-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team Name</th>
            <th>Record (W-L-T)</th>
            <th>Points For</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => (
            <tr key={team.id}>
              <td>{index + 1}</td>
              <td>{team.team_name}</td>
              <td>{team.wins}-{team.losses}-{team.ties}</td>
              <td>{team.points_for}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error.message}</p>;
  }

  return (
    <div style={{ padding: '1rem 2rem' }}>
      <h1>League Standings Hub</h1>

      {isLoadingLeagues ? (
        <p>Loading leagues...</p>
      ) : (
        <div className='tabs-container'>
          {/* This is our new "Tabs" section */}
          <div className="league-tabs">
            {leagues.map(league => (
              <button
                key={league.id}
                className={`tab ${selectedLeagueId === league.id ? 'active' : ''}`}
                onClick={() => setSelectedLeagueId(league.id)}
              >
                {league.name}
              </button>
            ))}
          </div>

          {/* This is where the selected league's table will render */}
          <div className="standings-content">
            {renderStandingsTable()}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;