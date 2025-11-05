import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function LeagueDetailPage() {
  const { id } = useParams();
  
  const [league, setLeague] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:8000/api/leagues/${id}/`)
      .then(response => {
        setLeague(response.data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching league details:', error);
        setError(error);
        setIsLoading(false);
      });
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
    <div>
      <h1>{league.name}</h1>
      <p><strong>Season:</strong> {league.season}</p>
      <p><strong>Sleeper League ID:</strong> {league.sleeper_league_id}</p>
      <p><strong>Commissioner ID:</strong> {league.commissioner}</p>

      <h2>Standings</h2>
      <p>(Standings will go here)</p>
    </div>
  );
}

export default LeagueDetailPage;