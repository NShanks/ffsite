import React, { useState, useEffect } from 'react';
import axios from 'axios';

function HomePage() {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      axios.get('http://localhost:8000/api/members/')
        .then(response => {
          setMembers(response.data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('There was an error fetching the data!', error);
          setError(error);
          setIsLoading(false);
        });
    }, 500); // 500ms delay
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <h1>Home Page</h1>
      <p>This is the main public-facing landing page.</p>

      <h2>Member List from API:</h2>
      
      {error && <p style={{ color: 'red' }}>Error fetching data: {error.message}</p>}
      
      {isLoading && <p>Loading members...</p>}

      {!isLoading && !error && members.length === 0 && (
        <p>No members found in the database. Try adding one in the admin!</p>
      )}

      <ul>
        {members.map(member => (
          <li key={member.id}>
            <strong>{member.user.username}</strong>
            <ul>
              <li>Full Name: {member.full_name}</li>
              <li>Sleeper ID: {member.sleeper_id}</li>
              <li>Discord: {member.discord_username}</li>
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HomePage;