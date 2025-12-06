import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './HomePage.css';
import PlayerSticker from '../components/PlayerSticker';

function HomePage() {
  const [weeklyWinners, setWeeklyWinners] = useState([]);
  const [powerRankings, setPowerRankings] = useState([]);
  const [commonPlayers, setCommonPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWidgetData = async () => {
      try {
        const [winnerRes, rankingsRes, commonRes] = await Promise.all([
          api.get('/widget/weekly-winner/'),
          api.get('/widget/power-rankings/'),
          api.get('/widget/common-players/')
        ]);
        
        setWeeklyWinners(winnerRes.data);
        setPowerRankings(rankingsRes.data);
        setCommonPlayers(commonRes.data);
      } catch (error) {
        console.error("Error fetching widget data:", error);
      }
      setIsLoading(false);
    };

    fetchWidgetData();
  }, []);

  const WeeklyWinnersBox = () => (
    <div className="bento-box">
      <h2>Last Week's High Scorers</h2>
      {
        isLoading // Check if loading, default state is True
          ? <p>Loading... (This could take 45 seconds - 2 minutes. Thanks for your patience!</p> // True? Show this line
            : !weeklyWinners || weeklyWinners.length === 0 // False? Okay it's done loading. Now checking if weeklyWinners is falsy.
              ? <p>No scores found for last week.</p> // Yes weeklyWinners is falsy? Something went wrong. This IS the initial state but once the API is called, it shouldn't be.
                : ( // No, weekly winners exists? Show this code vvv
        <div>
          <h3>Winners (Week {weeklyWinners[0].week})</h3>
          <ul className="bento-widget-list">
            {weeklyWinners.map((winner, index) => (
              <li key={index}>
                <div>
                  <span className="team-name">{winner.team_name}</span>
                  <span className="team-details">{winner.owner_name} ({winner.league_name})</span>
                </div>
                <span className="team-score">{winner.score} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const PowerRankingsBox = () => (
    <div className="bento-box">
      <h2>Power Rankings</h2>
      Top total scores
      {isLoading ? <p>Loading...</p> : (
        <ol className="bento-widget-list">
          {powerRankings.map((team, index) => (
            <li key={index}>
              <div>
                <span className="team-name">{index + 1}. {team.team_name}</span>
                <span className="team-details">{team.owner_name} ({team.league_name})</span>
              </div>
              <span className="team-score">{team.points_for} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  const CommonPlayersBox = () => (
    <div className="bento-box">
      <h2>Playoff Meta</h2>
      <br/>
      (Players on the most Playoff Teams)
      {isLoading
      ? <p>Loading...</p>
        : commonPlayers.length === 0
          ? <p>No data available yet.</p>
            : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
          {commonPlayers.map((player) => (
            <PlayerSticker 
              key={player.rank}
              player={{
                name: player.player_name,
                position: player.position,
                // We construct the URL using the ID from the backend
                avatar_url: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg`
              }}
              detail={
                <>
                  {player.count} rosters
                  <br />
                  {Number(player.average_score).toFixed(1)} avg
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="home-container">
      <header className="home-hero">
        <h1>Welcome to the IYKYK League Hub</h1>
        <p>
          The central source of truth for all 6 leagues. Track standings, 
          follow the BIG Playoff, and see who owes who.
        </p>
      </header>

      <main className="bento-grid">
        <WeeklyWinnersBox />
        <PowerRankingsBox />
        <CommonPlayersBox />
        <Link to="/dashboard" className="bento-box">
          <h2>View Standings</h2>
          <p>
            Check out the current standings for all leagues. See who's leading 
            the pack and who's on the playoff bubble.
          </p>
          <span className="cta-text">Go to Standings Hub &rarr;</span>
        </Link>
        <Link to="/about" className="bento-box">
          <h2>About The League</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
            Curabitur sodales ligula in libero. Sed dignissim lacinia nunc.
          </p>
          <span className="cta-text">Learn More &rarr;</span>
        </Link>

      </main>
    </div>
  );
}

export default HomePage;