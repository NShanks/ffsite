import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { pageVariants, pageTransition } from '../utils/animations';
import './AuthPage.css';
import './ProfilePage.css';

function ProfilePage() {
  const { user, authLoading, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [firstName,       setFirstName]       = useState('');
  const [lastName,        setLastName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [phone,           setPhone]           = useState('');
  const [sleeperUsername, setSleeperUsername] = useState('');
  const [paymentInfo,     setPaymentInfo]     = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setPaymentInfo(user.payment_info || '');
    }
  }, [user]);

  if (authLoading || !user) return null;

  const isLinked = Boolean(user.sleeper_id);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const payload = {
      first_name:   firstName,
      last_name:    lastName,
      email,
      phone,
      payment_info: paymentInfo,
    };
    if (sleeperUsername.trim()) payload.sleeper_username = sleeperUsername.trim();

    try {
      await updateProfile(payload);
      setSuccess('Profile updated!');
      setSleeperUsername('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
      <div className="auth-card profile-card">
        <h1>Profile</h1>
        <p className="auth-subtitle">Manage your account settings</p>

        <form onSubmit={handleSave}>
          {/* ── Account ── */}
          <div className="profile-section-label">Account</div>
          <div className="auth-field">
            <label>Username</label>
            <input type="text" value={user.username} readOnly className="profile-readonly" />
          </div>

          {/* ── Personal Info ── */}
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

          {/* ── Sleeper Identity ── */}
          <div className="profile-section-label">Sleeper Identity</div>
          {isLinked && (
            <div className="profile-linked-badge">
              <span className="profile-linked-dot" />
              Linked as <strong>{user.sleeper_display_name || user.sleeper_id}</strong>
            </div>
          )}
          <div className="auth-field">
            <label>{isLinked ? 'Change Sleeper Username' : 'Sleeper Username'}</label>
            <input type="text" value={sleeperUsername}
              onChange={(e) => setSleeperUsername(e.target.value)}
              placeholder={isLinked ? 'Enter new username to re-link' : 'Your Sleeper display name'}
              autoComplete="off" />
            <span className="field-hint">
              {isLinked
                ? 'Leave blank to keep your current Sleeper link.'
                : 'Link your Sleeper account to enable personalized views.'}
            </span>
          </div>

          {/* ── Payment ── */}
          <div className="profile-section-label">Payment</div>
          <div className="auth-field">
            <label>Venmo / Payment Info</label>
            <input type="text" value={paymentInfo}
              onChange={(e) => setPaymentInfo(e.target.value)}
              placeholder="@your-venmo" autoComplete="off" />
          </div>

          {error   && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" className="auth-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

export default ProfilePage;
