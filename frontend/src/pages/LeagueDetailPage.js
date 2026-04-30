import React from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useSeason } from '../context/SeasonContext';
import PlayerSticker from '../components/PlayerSticker';
import './LeagueDetailPage.css';

function LeagueDetailPage() {
  const { index } = useParams();
  const { loading, error, leagues, teamsByLeague, recentWeek } = useData();
  const { seasonType, selectedSeason } = useSeason();

  if (seasonType === 'pre_season') {
    const year = selectedSeason?.year || '';
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          No leagues yet for {year}
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          League details will appear here once the season kicks off.
        </p>
        <a href="/" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>← Season preview</a>
      </div>
    );
  }

  if (loading) return <p style={{ padding: '1rem 2rem' }}>Loading league details...</p>;
  if (error)   return <p style={{ padding: '1rem 2rem', color: 'red' }}>Error: {error.message}</p>;

  const league = leagues?.[parseInt(index, 10)];
  if (!league) return <p style={{ padding: '1rem 2rem' }}>League not found.</p>;

  const teams = teamsByLeague?.[league.sleeperId] || [];

  return (
    <div style={{ padding: '1rem 2rem' }}>
      <h1>{league.name}</h1>
      <p><strong>Season:</strong> {league.season}</p>

      <h2>Standings</h2>
      <table className="standings-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team Name</th>
            <th>Record (W-L-T)</th>
            <th>Points For</th>
            <th style={{ textAlign: 'center' }}>Top Players (Week {recentWeek})</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, i) => (
            <tr key={team.id}>
              <td>{i + 1}</td>
              <td>{team.team_name}</td>
              <td>{team.wins}-{team.losses}-{team.ties}</td>
              <td>{team.points_for.toFixed(2)}</td>
              <td>
                <div className="player-avatars">
                  {team.top_three_players?.map((player) => (
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
