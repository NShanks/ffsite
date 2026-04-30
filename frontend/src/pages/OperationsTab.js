import React, { useState, useEffect } from 'react';
import api from '../api/localApi';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default function OperationsTab() {
  const [week,           setWeek]           = useState('');
  const [syncLoading,    setSyncLoading]    = useState(false);
  const [winnersLoading, setWinnersLoading] = useState(false);
  const [status,         setStatus]         = useState({ type: '', text: '' });

  // Pre-fill week from Sleeper's NFL state
  useEffect(() => {
    fetch(`${BASE}/nfl-state/`)
      .then((r) => r.json())
      .then((data) => {
        // Use the most recently completed week (current week - 1)
        const w = data.week > 1 ? data.week - 1 : data.week;
        if (w) setWeek(String(w));
      })
      .catch(() => {}); // non-fatal — user can type the week manually
  }, []);

  const handleSync = () => {
    setSyncLoading(true);
    setStatus({ type: '', text: '' });
    api.post('/admin/run-sync/', {})
      .then((res) => setStatus({ type: 'success', text: res.data?.message || 'Sync complete.' }))
      .catch((err) => setStatus({ type: 'error', text: err.response?.data?.message || 'Sync failed.' }))
      .finally(() => setSyncLoading(false));
  };

  const handlePostWinners = () => {
    if (!week) { setStatus({ type: 'error', text: 'Enter a week number.' }); return; }
    setWinnersLoading(true);
    setStatus({ type: '', text: '' });
    api.post('/admin/post-winners/', { week: Number(week) })
      .then((res) => setStatus({ type: 'success', text: res.data?.message || `Week ${week} winners posted.` }))
      .catch((err) => setStatus({ type: 'error', text: err.response?.data?.message || 'Failed to post winners.' }))
      .finally(() => setWinnersLoading(false));
  };

  return (
    <div className="ops-tab">
      {status.text && (
        <div className={`status-message ${status.type}`}>{status.text}</div>
      )}

      {/* ── Sync card ── */}
      <div className="ops-card">
        <div className="ops-card-header">
          <span className="ops-card-icon">🔄</span>
          <div>
            <h3 className="ops-card-title">Sync Sleeper Data</h3>
            <p className="ops-card-subtitle">Updates standings, scores, and rosters from the Sleeper API.</p>
          </div>
        </div>
        <button className="command-button" onClick={handleSync} disabled={syncLoading}>
          {syncLoading ? 'Syncing…' : 'Run Sync'}
        </button>
      </div>

      {/* ── Weekly winners card ── */}
      <div className="ops-card">
        <div className="ops-card-header">
          <span className="ops-card-icon">🏆</span>
          <div>
            <h3 className="ops-card-title">Post Weekly Winners</h3>
            <p className="ops-card-subtitle">
              Fetches the highest scorer in each league directly from Sleeper and posts to Discord.
              No sync required first.
            </p>
          </div>
        </div>
        <div className="ops-week-row">
          <label className="ops-week-label" htmlFor="winners-week">Week</label>
          <input
            id="winners-week"
            className="ops-week-input"
            type="number"
            min="1"
            max="18"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          />
          <button className="command-button" onClick={handlePostWinners} disabled={winnersLoading || !week}>
            {winnersLoading ? 'Posting…' : 'Post Winners'}
          </button>
        </div>
      </div>
    </div>
  );
}
