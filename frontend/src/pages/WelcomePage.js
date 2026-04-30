import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';
import './WelcomePage.css';

const STEPS = ['welcome', 'how-it-works', 'setup', 'all-set'];

const stepVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

const stepTransition = { duration: 0.22, ease: 'easeOut' };

export default function WelcomePage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection]   = useState(1);
  const [venmo, setVenmo]           = useState(user?.payment_info || '');
  const [discord, setDiscord]       = useState(user?.discord_username || '');
  const [saving, setSaving]         = useState(false);

  const go = (delta) => {
    setDirection(delta);
    setStepIndex((i) => i + delta);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const payload = { has_completed_onboarding: true };
      if (venmo.trim())   payload.payment_info    = venmo.trim();
      if (discord.trim()) payload.discord_username = discord.trim();
      await updateProfile(payload);
    } catch {
      // non-blocking — still navigate
    } finally {
      setSaving(false);
      navigate('/');
    }
  };

  const skipToEnd = async () => {
    setSaving(true);
    try {
      await updateProfile({ has_completed_onboarding: true });
    } catch {
      // ignore
    } finally {
      navigate('/');
    }
  };

  return (
    <div className="welcome-page">
      <div className="auth-card welcome-card">
        {/* Step dots */}
        <div className="welcome-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`welcome-dot${i === stepIndex ? ' active' : i < stepIndex ? ' done' : ''}`} />
          ))}
        </div>

        <div className="welcome-step-track">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={stepIndex}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="welcome-step"
            >
              {stepIndex === 0 && <StepWelcome user={user} />}
              {stepIndex === 1 && <StepHowItWorks />}
              {stepIndex === 2 && <StepSetup venmo={venmo} setVenmo={setVenmo} discord={discord} setDiscord={setDiscord} user={user} />}
              {stepIndex === 3 && <StepAllSet />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="welcome-nav">
          {stepIndex > 0 ? (
            <button className="welcome-btn-back" onClick={() => go(-1)}>← Back</button>
          ) : (
            <button className="welcome-btn-skip" onClick={skipToEnd}>Skip</button>
          )}

          {stepIndex < STEPS.length - 1 ? (
            <button className="welcome-btn-next" onClick={() => go(1)}>
              {stepIndex === 2 ? 'Next →' : 'Next →'}
            </button>
          ) : (
            <button className="welcome-btn-finish" onClick={finish} disabled={saving}>
              {saving ? 'Loading…' : 'Go to the site →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function StepWelcome({ user }) {
  const name = user?.first_name || user?.username || 'there';
  return (
    <div className="welcome-step-content">
      <div className="welcome-step-icon">🏈</div>
      <h2>Hey {name}, you're in!</h2>
      <p>Welcome to the IYKYK League Hub — your home for standings, weekly matchups, and the BIG Playoff across all our leagues.</p>
    </div>
  );
}

function StepHowItWorks() {
  return (
    <div className="welcome-step-content">
      <h2>Here's how it works</h2>
      <div className="welcome-features">
        <div className="welcome-feature">
          <span className="welcome-feature-icon">📊</span>
          <div>
            <strong>Leagues &amp; standings</strong>
            <p>Live standings, records, and points for every team across all leagues.</p>
          </div>
        </div>
        <div className="welcome-feature">
          <span className="welcome-feature-icon">⚔️</span>
          <div>
            <strong>Weekly matchups</strong>
            <p>See every head-to-head score and player breakdown, week by week.</p>
          </div>
        </div>
        <div className="welcome-feature">
          <span className="welcome-feature-icon">🏆</span>
          <div>
            <strong>The BIG Playoff</strong>
            <p>A cross-league tournament where the best teams from every division compete for the title.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepSetup({ venmo, setVenmo, discord, setDiscord, user }) {
  return (
    <div className="welcome-step-content">
      <div className="welcome-step-icon">💸</div>
      <h2>One more thing</h2>
      <p>Add your handles so your commish can reach you. You can always update these later in your profile.</p>
      <div className="auth-field" style={{ marginTop: '1.25rem' }}>
        <label htmlFor="welcome-venmo">Venmo / Payment Handle</label>
        <input
          id="welcome-venmo"
          type="text"
          value={venmo}
          onChange={(e) => setVenmo(e.target.value)}
          placeholder="@your-venmo"
          autoComplete="off"
        />
      </div>
      {user?.payment_info && !venmo && (
        <p className="field-hint">Already set: {user.payment_info}</p>
      )}
      <div className="auth-field" style={{ marginTop: '1rem' }}>
        <label htmlFor="welcome-discord">Discord Username</label>
        <input
          id="welcome-discord"
          type="text"
          value={discord}
          onChange={(e) => setDiscord(e.target.value)}
          placeholder="username"
          autoComplete="off"
        />
      </div>
      {user?.discord_username && !discord && (
        <p className="field-hint">Already set: {user.discord_username}</p>
      )}
    </div>
  );
}

function StepAllSet() {
  return (
    <div className="welcome-step-content welcome-step-final">
      <div className="welcome-step-icon">✅</div>
      <h2>You're on the list!</h2>
      <p>Your commish will assign you to a league before the season kicks off. Come back then to see your team, matchups, and standings.</p>
      <p className="welcome-step-hint">Until then, feel free to explore the site — you can view all leagues and the current playoff bracket.</p>
    </div>
  );
}
