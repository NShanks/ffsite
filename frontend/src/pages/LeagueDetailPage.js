import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import './LeagueDetailPage.css';
import PlayerSticker from '../components/PlayerSticker';

function LeagueDetailPage() {
  const { id } = useParams();

  const [league, setLeague] = useState(null);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeagueData = () => {
      const leagueDetailsUrl = `/leagues/${id}/`;
      const teamsStandingsUrl = `/teams/?league=${id}`;

      Promise.all([
        api.get(leagueDetailsUrl),
        api.get(teamsStandingsUrl)
      ])
      .then(([leagueResponse, teamsResponse]) => {
        setLeague(leagueResponse.data);
        setTeams(teamsResponse.data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching league data:', error);
        setError(error);
        setIsLoading(false);
      });
    };

    fetchLeagueData();

  }, [id]);

  if (isLoading) {
    return <p>Loading league details...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error.message}</p>;
  }

  if (!league) {
    return <p>League not found.</p>;
  }

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