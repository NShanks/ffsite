import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css'; 

function HomePage() {
  const [weeklyWinners, setWeeklyWinners] = useState([]);
  const [powerRankings, setPowerRankings] = useState([]);
  
  // --- 1. NEW STATE ---
  const [commonPlayers, setCommonPlayers] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWidgetData = async () => {
      try {
        // --- 2. NEW API CALL ---
        const [winnerRes, rankingsRes, commonRes] = await Promise.all([
          axios.get('http://localhost:8000/api/widget/weekly-winner/'),
          axios.get('http://localhost:8000/api/widget/power-rankings/'),
          axios.get('http://localhost:8000/api/widget/common-players/')
        ]);
        
        setWeeklyWinners(winnerRes.data);
        setPowerRankings(rankingsRes.data);
        setCommonPlayers(commonRes.data); // Set the data
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
      {isLoading ? <p>Loading...</p> : 
      !weeklyWinners || weeklyWinners.length === 0 ? <p>No scores found for last week.</p> : (
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
      <h2>Association Power Rankings</h2>
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

  // --- 3. NEW COMPONENT: Common Players Box ---
  const CommonPlayersBox = () => (
    <div className="bento-box">
      <h2>Playoff Meta (Top Players)</h2>
      {isLoading ? <p>Loading...</p> : 
       commonPlayers.length === 0 ? <p>No data available yet.</p> : (
        <ol className="bento-widget-list">
          {commonPlayers.map((player) => (
            <li key={player.rank}>
              <div>
                <span className="team-name">
                  {player.rank}. {player.player_name}
                </span>
                <span className="team-details">
                  {player.position} - {player.nfl_team || 'N/A'}
                </span>
              </div>
              <div>
                <span className="team-name" style={{fontSize: '1.25rem'}}>
                  {Number(player.average_score).toFixed(1)} ppg
                </span>
                <span className="team-details">
                  {player.count} playoff teams
                </span>
              </div>
              {/* <div style={{textAlign: 'right'}}>
                <span className="team-score" style={{fontSize: '1.25rem'}}>
                  {player.count} Playoff Teams
                </span>
                <span className="team-score">
                  {Number(player.average_score).toFixed(1)} avg
                </span>
              </div> */}
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  return (
    <div className="home-container">
      
      <header className="home-hero">
        <h1>Welcome to the IYKYK League Hub</h1>
        <p>
          The central source of truth for all 7 leagues. Track standings, 
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