import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/localApi';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function getToken() { return localStorage.getItem('access'); }

async function authedGet(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export default function BigPlayoffTab() {
  const [leagues,        setLeagues]        = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [teams,          setTeams]          = useState([]);
  const [playoffStatus,  setPlayoffStatus]  = useState(null);
  const [elimWeek,       setElimWeek]       = useState('');
  const [initConfirm,    setInitConfirm]    = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [status,         setStatus]         = useState({ type: '', text: '' });

  const fetchStatus = useCallback(() => {
    authedGet('/playoff-status/')
      .then((data) => {
        setPlayoffStatus(data);
        if (data.current_week) setElimWeek(String(data.current_week));
      })
      .catch(() => {});
  }, []);

  // Load leagues + playoff status on mount
  useEffect(() => {
    api.get('/leagues/')
      .then((res) => {
        setLeagues(res.data);
        if (res.data.length > 0) setSelectedLeague(res.data[0].id);
      })
      .catch(() => {});
    fetchStatus();
  }, [fetchStatus]);

  // Load teams when selected league changes
  useEffect(() => {
    if (!selectedLeague) return;
    api.get(`/teams/?league=${selectedLeague}`)
      .then((res) => setTeams(res.data))
      .catch(() => {});
  }, [selectedLeague]);

  const flaggedCount = teams.filter((t) => t.made_league_playoffs).length
    + leagues.reduce((acc) => acc, 0); // placeholder — see note below

  // Count across all leagues is expensive; show a note instead
  const handleToggleFlag = (teamId) => {
    api.post(`/team/${teamId}/toggle-playoff-flag/`)
      .then((res) => {
        setTeams((prev) =>
          prev.map((t) =>
            t.id === teamId ? { ...t, made_league_playoffs: res.data.made_league_playoffs } : t
          )
        );
      })
      .catch(() => setStatus({ type: 'error', text: 'Failed to update flag.' }));
  };

  const handleInitialize = () => {
    setLoading(true);
    setStatus({ type: '', text: '' });
    api.post('/admin/start-playoff/', {})
      .then((res) => {
        setStatus({ type: 'success', text: res.data?.message || 'BIG Playoff initialized.' });
        setInitConfirm(false);
        fetchStatus();
      })
      .catch((err) => setStatus({ type: 'error', text: err.response?.data?.message || 'Initialization failed.' }))
      .finally(() => setLoading(false));
  };

  const handleElimination = () => {
    if (!elimWeek) { setStatus({ type: 'error', text: 'Enter a playoff week.' }); return; }
    setLoading(true);
    setStatus({ type: '', text: '' });
    api.post('/admin/run-elimination/', { week: Number(elimWeek) })
      .then((res) => {
        setStatus({ type: 'success', text: res.data?.message || `Week ${elimWeek} elimination complete.` });
        fetchStatus();
      })
      .catch((err) => setStatus({ type: 'error', text: err.response?.data?.message || 'Elimination failed.' }))
      .finally(() => setLoading(false));
  };

  const statusPill = () => {
    if (!playoffStatus) return null;
    if (!playoffStatus.initialized) {
      return <span className="playoff-status-pill pill-pending">Not initialized</span>;
    }
    if (playoffStatus.is_complete) {
      return <span className="playoff-status-pill pill-complete">Complete</span>;
    }
    return (
      <span className="playoff-status-pill pill-active">
        Week {playoffStatus.current_week} active — {playoffStatus.teams_remaining} of {playoffStatus.total_teams} teams remaining
      </span>
    );
  };

  return (
    <div className="big-playoff-tab">
      {status.text && (
        <div className={`status-message ${status.type}`}>{status.text}</div>
      )}

      {/* ── Section A: League Qualification ── */}
      <div className="ops-card">
        <div className="ops-card-header">
          <span className="ops-card-icon">📋</span>
          <div>
            <h3 className="ops-card-title">League Playoff Qualification</h3>
            <p className="ops-card-subtitle">
              Toggle which teams made their individual league playoffs. These teams will be seeded into the BIG Playoff bracket.
            </p>
          </div>
        </div>

        {/* League sub-tabs */}
        {leagues.length > 0 && (
          <div className="league-tabs" style={{ marginBottom: '1rem' }}>
            {leagues.map((l) => (
              <button
                key={l.id}
                className={`tab ${selectedLeague === l.id ? 'active' : ''}`}
                onClick={() => setSelectedLeague(l.id)}
              >
                {l.name}
              </button>
            ))}
          </div>
        )}

        <table className="standings-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Owner</th>
              <th>Record</th>
              <th>In BIG Playoff</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) =>
              team.owner ? (
                <tr key={team.id}>
                  <td>{team.team_name}</td>
                  <td>{team.owner.full_name}</td>
                  <td>{team.wins}-{team.losses}-{team.ties}</td>
                  <td>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={team.made_league_playoffs}
                        onChange={() => handleToggleFlag(team.id)}
                      />
                      <span className="slider" />
                    </label>
                  </td>
                </tr>
              ) : null
            )}
          </tbody>
        </table>
      </div>

      {/* ── Section B: Bracket Management ── */}
      <div className="ops-card">
        <div className="ops-card-header">
          <span className="ops-card-icon">🏆</span>
          <div>
            <h3 className="ops-card-title">Bracket Management</h3>
            <p className="ops-card-subtitle">Initialize the bracket from flagged teams, then run weekly eliminations.</p>
          </div>
        </div>

        <div className="bracket-status-row">
          <span className="bracket-status-label">Status:</span>
          {statusPill()}
        </div>

        <div className="bracket-actions">
          {/* Initialize */}
          <div className="bracket-action-group">
            {!initConfirm ? (
              <button
                className="command-button"
                disabled={loading || playoffStatus?.initialized}
                onClick={() => setInitConfirm(true)}
                title={playoffStatus?.initialized ? 'Bracket already initialized' : ''}
              >
                Initialize Bracket
              </button>
            ) : (
              <div className="bracket-confirm">
                <span className="bracket-confirm-label">Are you sure? This creates entries for all flagged teams.</span>
                <div className="bracket-confirm-btns">
                  <button className="command-button danger" onClick={handleInitialize} disabled={loading}>
                    {loading ? 'Initializing…' : 'Yes, initialize'}
                  </button>
                  <button className="command-button-ghost" onClick={() => setInitConfirm(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Run Elimination */}
          <div className="bracket-action-group">
            <div className="ops-week-row">
              <label className="ops-week-label" htmlFor="elim-week">Playoff Week</label>
              <input
                id="elim-week"
                className="ops-week-input"
                type="number"
                min="15"
                max="18"
                value={elimWeek}
                onChange={(e) => setElimWeek(e.target.value)}
                disabled={!playoffStatus?.initialized}
              />
              <button
                className="command-button danger"
                onClick={handleElimination}
                disabled={loading || !playoffStatus?.initialized || !elimWeek}
              >
                {loading ? 'Running…' : 'Run Elimination'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
