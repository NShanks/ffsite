import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css'; 

function HomePage() {
  const [weeklyWinners, setWeeklyWinners] = useState([]); // Default to empty array
  const [powerRankings, setPowerRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWidgetData = async () => {
      try {
        const [winnerRes, rankingsRes] = await Promise.all([
          axios.get('http://localhost:8000/api/widget/weekly-winner/'),
          axios.get('http://localhost:8000/api/widget/power-rankings/')
        ]);

        // --- CHANGE #2: Set the array ---
        setWeeklyWinners(winnerRes.data);
        setPowerRankings(rankingsRes.data);
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
          {/* We can show the week number from the first winner */}
          <h3>Winners (Week {weeklyWinners[0].week})</h3>

          <ul className="bento-widget-list">
            {/* 4. We now MAP over the array to create a list */}
            {weeklyWinners.map((winner, index) => (
              <li key={index}>
                <div>
                  <span className="team-name">{winner.team_name}</span>
                  {/* Show the league name now */}
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
      <h2>IYKYK Power Rankings</h2>
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

  return (
    <div className="home-container">

      <header className="home-hero">
        <h1>Welcome to the IYKYK League Hub</h1>
      </header>

      <main className="bento-grid">

        <Link to="/dashboard" className="bento-box">
          <h2>View Standings</h2>
          <p>
            Check out the current standings for all leagues. See who's leading 
            the pack and who's on the playoff bubble.
          </p>
          <span className="cta-text">Go to Standings Hub &rarr;</span>
        </Link>

        <WeeklyWinnersBox />

        <PowerRankingsBox />

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