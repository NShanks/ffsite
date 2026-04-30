import React from 'react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../utils/animations';
import './AboutPage.css';

// ── Small reusable components ─────────────────────────────────────────────────

function AboutCard({ icon, title, children }) {
  return (
    <div className="about-card">
      <div className="about-card-header">
        <span className="about-card-icon">{icon}</span>
        <h2 className="about-card-title">{title}</h2>
      </div>
      <div className="about-card-body">{children}</div>
    </div>
  );
}

function TodoBlock({ label }) {
  return (
    <div className="about-todo">
      <span className="about-todo-icon">✏️</span>
      <div>
        <strong>TODO</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}

// ── BIG Playoff elimination diagram ──────────────────────────────────────────

const ELIM_ROUNDS = [
  { week: 15, label: 'Week 15', teams: 12, bar: 1.0 },
  { week: 16, label: 'Week 16', teams: 6,  bar: 0.5 },
  { week: 17, label: 'Week 17', teams: 3,  bar: 0.25 },
  { week: 18, label: 'Week 18', teams: 1,  bar: 0.083, champion: true },
];

function ElimDiagram() {
  return (
    <div className="elim-diagram">
      {ELIM_ROUNDS.map((r) => (
        <div key={r.week} className={`elim-row${r.champion ? ' elim-champion' : ''}`}>
          <span className="elim-label">{r.label}</span>
          <div className="elim-bar-wrap">
            <div className="elim-bar" style={{ width: `${r.bar * 100}%` }} />
          </div>
          <span className="elim-count">
            {r.champion ? '🏆 Champion' : `~${r.teams} teams`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AboutPage() {
  return (
    <motion.div
      className="about-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {/* Hero */}
      <div className="about-hero">
        <h1 className="about-hero-title">IYKYK</h1>
        <p className="about-hero-sub">
          A multi-league fantasy football universe built on competition,
          tradition, and a little bit of chaos.
        </p>
      </div>

      {/* Cards */}
      <div className="about-cards">

        {/* Origin story */}
        <AboutCard icon="📖" title="How It Started">
          <TodoBlock label="Origin story coming soon — fill this in after talking to your friend. Describe when IYKYK started, who founded it, how it grew, and where the name came from." />
        </AboutCard>

        {/* How it works */}
        <AboutCard icon="⚙️" title="How It Works">
          <p>
            IYKYK runs across <strong>6 leagues simultaneously</strong> on Sleeper,
            with managers competing head-to-head every week of the NFL regular season.
          </p>
          <ul className="about-list">
            <li>
              <strong>Snake draft</strong> before each season — every manager builds their
              roster from scratch.
            </li>
            <li>
              <strong>Weekly matchups</strong> through weeks 1–14. Your roster scores points
              based on real NFL player performance.
            </li>
            <li>
              <strong>League playoffs</strong> in weeks 15–17 for the top teams in each league.
            </li>
            <li>
              <strong>League composition reshuffles</strong> each year — the commish organizes
              assignments before the draft so no rivalry ever gets stale.
            </li>
          </ul>
        </AboutCard>

        {/* BIG Playoff */}
        <AboutCard icon="🏆" title="The BIG Playoff">
          <p>
            Once the regular season ends, every team that qualified for a league playoff
            enters the <strong>BIG Playoff</strong> — a single cross-league elimination
            tournament running weeks 15–18.
          </p>
          <p>
            The format is simple and ruthless: each week, all remaining teams' scores are
            ranked. The <strong>bottom half is eliminated</strong>. The top half advances.
            This continues until one team is left standing as the BIG Playoff Champion.
          </p>
          <ElimDiagram />
          <p className="about-note">
            You can be eliminated from your league's own playoffs and still win the BIG
            Playoff — and vice versa. The two tournaments run in parallel.
          </p>
        </AboutCard>

        {/* Dues & Payouts */}
        <AboutCard icon="💸" title="Dues & Payouts">
          <table className="standings-table about-payout-table">
            <thead>
              <tr>
                <th>Prize</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Entry fee</td>
                <td><strong>$20</strong></td>
                <td>Due before the draft</td>
              </tr>
              <tr>
                <td>Weekly high score</td>
                <td><strong>$5</strong></td>
                <td>Highest single-league score each week, announced on Discord every Tuesday</td>
              </tr>
              <tr className="about-todo-row">
                <td>League winner</td>
                <td>—</td>
                <td><span className="about-todo-inline">✏️ TODO: fill in prize amount</span></td>
              </tr>
              <tr className="about-todo-row">
                <td>BIG Playoff Champion</td>
                <td>—</td>
                <td><span className="about-todo-inline">✏️ TODO: fill in prize amount</span></td>
              </tr>
            </tbody>
          </table>

          {/* Charity placeholder */}
          <div className="about-todo" style={{ marginTop: '1.5rem' }}>
            <span className="about-todo-icon">✏️</span>
            <div>
              <strong>TODO — CHARITY / DONATION DETAILS</strong>
              <p>
                {/* ===== EDIT THIS SECTION WITH CHARITY INFO ===== */}
                A portion of the pot goes to a charity chosen by the group each season.
                Fill in the details here once confirmed.
                {/* ============================================== */}
              </p>
            </div>
          </div>
        </AboutCard>

      </div>
    </motion.div>
  );
}

export default AboutPage;
