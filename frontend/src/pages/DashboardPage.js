import React, { useState, useEffect } from 'react';
import api from '../api';
import './DashboardPage.css';
import './LeagueDetailPage.css';
import PlayerSticker from '../components/PlayerSticker';

function DashboardPage() {
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/leagues/')
      .then(response => {
        setLeagues(response.data);
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
  }, []);

  useEffect(() => {
    if (!selectedLeagueId) {
      return;
    }

    setIsLoadingTeams(true);

    api.get(`/teams/?league=${selectedLeagueId}`)
      .then(response => {
        setTeams(response.data);
        setIsLoadingTeams(false);
      })
      .catch(error => {
        console.error('Error fetching teams:', error);
        setError(error);
        setIsLoadingTeams(false);
      });
  }, [selectedLeagueId]);

  const renderStandingsTable = () => {
    if (isLoadingTeams) {
      return <p>Loading standings...</p>;
    }
    if (teams.length === 0) {
      return <p>No teams found for this league.</p>;
    }

    return (
      <table className="standings-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team Name</th>
            <th>Record (W-L-T)</th>
            <th>Points For</th>
            <th style={{ textAlign: "center" }}>Top Players</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => (
            <tr key={team.id}>
              <td>{index + 1}</td>
              <td>{team.team_name}</td>
              <td>{team.wins}-{team.losses}-{team.ties}</td>
              <td>{team.points_for}</td>
              <td>
                <div className="player-avatars">
                  {team.top_three_players && team.top_three_players.map(player => (
                    <PlayerSticker 
                      key={player.id} 
                      player={player} 
                      detail={`${player.total_points.toFixed(1)} pts`}
                    />
                  ))}
                </div>
              </td>
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
          <div className="standings-content">
            {renderStandingsTable()}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;