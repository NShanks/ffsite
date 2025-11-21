import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './LeagueDetailPage.css'; // 1. Import our new CSS
import PlayerSticker from '../components/PlayerSticker';

function LeagueDetailPage() {
  const { id } = useParams(); // Get the league ID from the URL

  // 2. Setup state for *both* pieces of data
  const [league, setLeague] = useState(null);
  const [teams, setTeams] = useState([]); // This will hold our standings
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeagueData = () => {
      // 3. Define our two API endpoints
      const leagueDetailsUrl = `http://localhost:8000/api/leagues/${id}/`;
      const teamsStandingsUrl = `http://localhost:8000/api/teams/?league=${id}`;

      // 4. Use Promise.all to fetch both at the same time for speed
      Promise.all([
        axios.get(leagueDetailsUrl),
        axios.get(teamsStandingsUrl)
      ])
      .then(([leagueResponse, teamsResponse]) => {
        // 5. When both are successful, update our state
        setLeague(leagueResponse.data);
        setTeams(teamsResponse.data); // This is our new, *sorted* list of teams!
        setIsLoading(false);
      })
      .catch(error => {
        // If either one fails, show an error
        console.error('Error fetching league data:', error);
        setError(error);
        setIsLoading(false);
      });
    };

    fetchLeagueData();

  }, [id]); // This effect re-runs if the 'id' in the URL changes

  // 6. Handle loading and error states
  if (isLoading) {
    return <p>Loading league details...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error.message}</p>;
  }

  if (!league) {
    return <p>League not found.</p>;
  }

  // 7. Render the final page with our new standings table!
  return (
    <div style={{ padding: '1rem 2rem' }}>
      <h1>{league.name}</h1>
      <p><strong>Season:</strong> {league.season}</p>
      <p><strong>Sleeper League ID:</strong> {league.sleeper_league_id}</p>

      <h2>Standings</h2>
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
          {/* 8. Map over the 'teams' state to build the table rows */}
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
    </div>
  );
}

export default LeagueDetailPage;