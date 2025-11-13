import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css'; // We'll create this file next

function LoginPage() {
  // 1. Create state for the form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // 2. Get the navigate function to redirect on success
  const navigate = useNavigate();

  // 3. This function runs when the user clicks "Submit"
  const handleSubmit = async (event) => {
    // Prevent the form from doing a full page refresh
    event.preventDefault(); 
    setError(null); // Clear any old errors

    try {
      // 4. Make the API call to your Django token endpoint
      const response = await axios.post('http://localhost:8000/api/token/', {
        username: username,
        password: password
      });

      // 5. SUCCESS! Save the tokens in localStorage
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);

      // 6. Redirect to the main dashboard
      // We force a window reload to make the Navbar update
      // its "Login" / "Logout" state.
      navigate('/dashboard');
      window.location.reload();

    } catch (err) {
      // 7. FAILURE! Show an error message
      console.error('Login Error:', err);
      setError('Login failed. Please check your username and password.');
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Admin Login</h2>

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input 
            type="text" 
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input 
            type="password" 
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>

        {/* Show an error if one exists */}
        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="login-button">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;