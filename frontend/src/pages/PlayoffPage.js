import React, { useState, useEffect } from 'react';
import api from '../api';
import './LeagueDetailPage.css'; // We can reuse the same table style!

function PlayoffPage() {
  const [playoffData, setPlayoffData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Fetch data from our new API endpoint
    api.get('/playoff-entries/')
      .then(response => {
        // 2. Group the data by week (e.g., { 15: [...], 16: [...] })
        const groupedData = groupEntriesByWeek(response.data);
        setPlayoffData(groupedData);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching playoff data:', error);
        setError(error);
        setIsLoading(false);
      });
  }, []);

  // 3. This is a helper function to group our data
  const groupEntriesByWeek = (entries) => {
    return entries.reduce((acc, entry) => {
      const week = entry.playoff_week;
      if (!acc[week]) {
        acc[week] = []; // Create an array for this week if it doesn't exist
      }
      acc[week].push(entry);
      return acc;
    }, {});
  };

  // 4. Handle loading and error states
  if (isLoading) {
    return <div style={{ padding: '1rem 2rem' }}><p>Loading playoff data...</p></div>;
  }

  if (error) {
    return <div style={{ padding: '1rem 2rem' }}><p style={{ color: 'red' }}>Error: {error.message}</p></div>;
  }

  const weeks = Object.keys(playoffData);

  // 5. Render the final page!
  return (
    <div style={{ padding: '1rem 2rem' }}>
      <h1>BIG Playoff Leaderboard</h1>

      {weeks.length === 0 && !isLoading && (
        <p>
          The BIG Playoff has not started yet. Check back after Week 15!
        </p>
      )}

      {/* 6. Loop over each week and create a separate table for it */}
      {weeks.map(week => (
        <div key={week}>
          <h2>Week {week}</h2>
          <table className="standings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team Name</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {playoffData[week].map((entry, index) => (
                <tr key={entry.id}>
                  <td>{entry.final_rank || index + 1}</td>
                  <td>{entry.team}</td>
                  <td>{entry.week_score}</td>
                  <td style={{ color: entry.is_eliminated ? 'red' : 'green' }}>
                    {entry.is_eliminated ? 'Eliminated' : 'Active'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default PlayoffPage;