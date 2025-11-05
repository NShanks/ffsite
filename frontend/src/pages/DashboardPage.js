import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function DashboardPage() {
  const [leagues, setLeagues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:8000/api/leagues/')
      .then(response => {
        setLeagues(response.data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching leagues:', error);
        setError(error);
        setIsLoading(false);
      });
  }, []);

  return (
    <div>
      <h1>User Dashboard</h1>
      <p>This is where logged-in users will see their leagues and info.</p>

      <h2>Your Leagues</h2>
      
      {error && <p style={{ color: 'red' }}>Error fetching leagues: {error.message}</p>}
      
      {isLoading && <p>Loading leagues...</p>}

      {!isLoading && !error && leagues.length === 0 && (
        <p>
          No leagues found. 
          <a href="http://localhost:8000/admin/api/league/add/" target="_blank" rel="noopener noreferrer">
             Add one in the Django admin!
          </a>
        </p>
      )}
      <ul>
        {leagues.map(league => (
          <li key={league.id}>
            <Link to={`/leagues/${league.id}`}>
              {league.name} ({league.season})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DashboardPage;