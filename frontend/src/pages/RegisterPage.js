import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { pageVariants, pageTransition } from '../utils/animations';
import './AuthPage.css';

function RegisterPage() {
  const [username,        setUsername]        = useState('');
  const [password,        setPassword]        = useState('');
  const [sleeperUsername, setSleeperUsername] = useState('');
  const [firstName,       setFirstName]       = useState('');
  const [lastName,        setLastName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [phone,           setPhone]           = useState('');
  const [error,           setError]           = useState(null);
  const [loading,         setLoading]         = useState(false);
  const { register } = useAuth();
  const navigate     = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(username, password, sleeperUsername, {
        first_name: firstName,
        last_name:  lastName,
        email,
        phone,
      });
      navigate('/welcome');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="auth-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <div className="auth-card">
        <h1>Create account</h1>
        <p className="auth-subtitle">Join the IYKYK League Hub to get a personalized view.</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="profile-section-label">Account</div>

          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <input id="username" type="text" value={username}
              onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          </div>

          <div className="profile-section-label">Your Info</div>

          <div className="auth-field-row">
            <div className="auth-field">
              <label htmlFor="firstName">First Name</label>
              <input id="firstName" type="text" value={firstName}
                onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            </div>
            <div className="auth-field">
              <label htmlFor="lastName">Last Name</label>
              <input id="lastName" type="text" value={lastName}
                onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>

          <div className="auth-field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </div>

          <div className="profile-section-label">Sleeper</div>

          <div className="auth-field">
            <label htmlFor="sleeper">Sleeper Username</label>
            <input id="sleeper" type="text" value={sleeperUsername}
              onChange={(e) => setSleeperUsername(e.target.value)} placeholder="e.g. Shanks2" required />
            <p className="field-hint">Your Sleeper display name — used to link your team.</p>
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </motion.div>
  );
}

export default RegisterPage;
