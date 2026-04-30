import React, { useState, useEffect, useMemo } from 'react';
import { fetchOrganizer, fetchSeasons, toggleSeasonDues } from '../api/authApi';
import './MemberRosterTab.css';

const SORT_KEYS = {
  name:     (m) => `${m.last_name} ${m.first_name}`.toLowerCase(),
  username: (m) => m.username.toLowerCase(),
  sleeper:  (m) => (m.sleeper_display_name ? 0 : 1),
  league:   (m) => (m.assigned_league_name || 'zzz').toLowerCase(),
  dues:     (m) => (m.dues_paid ? 0 : 1),
};

function SortTh({ label, sortKey, current, dir, onClick }) {
  const active = current === sortKey;
  return (
    <th className={`sortable-th ${active ? 'sort-active' : ''}`} onClick={() => onClick(sortKey)}>
      {label}
      <span className="sort-arrow">{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
    </th>
  );
}

export default function MemberRosterTab() {
  const [seasons,   setSeasons]   = useState([]);
  const [year,      setYear]      = useState(null);
  const [members,   setMembers]   = useState([]);
  const [leagues,   setLeagues]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [query,        setQuery]        = useState('');
  const [sortKey,      setSortKey]      = useState('name');
  const [sortDir,      setSortDir]      = useState('asc');
  const [togglingDues, setTogglingDues] = useState(new Set());

  useEffect(() => {
    fetchSeasons()
      .then((data) => {
        setSeasons(data);
        const active = data.find((s) => s.is_active) || data[0];
        if (active) setYear(active.year);
      })
      .catch(() => setError('Could not load seasons.'));
  }, []);

  useEffect(() => {
    if (!year) return;
    setLoading(true);
    setError(null);
    fetchOrganizer(year)
      .then((data) => {
        setMembers(data.members || []);
        setLeagues(data.leagues || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load member roster.');
        setLoading(false);
      });
  }, [year]);

  const leagueMap = useMemo(() => {
    const m = {};
    leagues.forEach((l) => { m[l.id] = l.name; });
    return m;
  }, [leagues]);

  const enriched = useMemo(() =>
    members.map((m) => ({
      ...m,
      assigned_league_name: m.assigned_league_id ? leagueMap[m.assigned_league_id] || 'Unknown' : null,
    })),
  [members, leagueMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q) ||
      (m.sleeper_display_name || '').toLowerCase().includes(q)
    );
  }, [enriched, query]);

  const sorted = useMemo(() => {
    const fn = SORT_KEYS[sortKey];
    return [...filtered].sort((a, b) => {
      const av = fn(a), bv = fn(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const handleDuesToggle = (memberId) => {
    if (!year || togglingDues.has(memberId)) return;
    setTogglingDues((prev) => new Set(prev).add(memberId));
    toggleSeasonDues(year, memberId)
      .then((data) => {
        setMembers((prev) =>
          prev.map((m) => m.id === memberId ? { ...m, dues_paid: data.paid } : m)
        );
      })
      .catch(() => {})
      .finally(() => {
        setTogglingDues((prev) => { const s = new Set(prev); s.delete(memberId); return s; });
      });
  };

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="member-roster">
      <div className="member-roster-toolbar">
        {seasons.length > 0 && (
          <select
            className="member-roster-year"
            value={year || ''}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {seasons.map((s) => (
              <option key={s.year} value={s.year}>
                {s.label || s.year}{s.is_active ? ' ✦' : ''}
              </option>
            ))}
          </select>
        )}
        <input
          className="member-roster-search"
          type="search"
          placeholder="Search by name or username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="member-roster-count">{sorted.length} member{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {error   && <p className="member-roster-error">{error}</p>}
      {loading && <p className="member-roster-loading">Loading…</p>}

      {!loading && !error && (
        <div className="member-roster-table-wrap">
          <table className="standings-table member-roster-table">
            <thead>
              <tr>
                <SortTh label="Name"     sortKey="name"     current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortTh label="Username" sortKey="username" current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortTh label="Sleeper"  sortKey="sleeper"  current={sortKey} dir={sortDir} onClick={handleSort} />
                <th>Email</th>
                <th>Phone</th>
                <th>Venmo</th>
                <SortTh label="League"   sortKey="league"   current={sortKey} dir={sortDir} onClick={handleSort} />
                <SortTh label="Dues"     sortKey="dues"     current={sortKey} dir={sortDir} onClick={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="member-roster-empty">No members found.</td>
                </tr>
              ) : (
                sorted.map((m) => (
                  <tr key={m.id}>
                    <td className="member-name-cell">
                      {m.first_name || m.last_name
                        ? `${m.first_name} ${m.last_name}`.trim()
                        : <span className="member-unset">—</span>}
                    </td>
                    <td>{m.username}</td>
                    <td className="member-check-cell">
                      {m.sleeper_display_name
                        ? <span className="member-badge member-badge-ok" title={m.sleeper_display_name}>✓</span>
                        : <span className="member-badge member-badge-no">—</span>}
                    </td>
                    <td className="member-contact">{m.email || <span className="member-unset">—</span>}</td>
                    <td className="member-contact">{m.phone || <span className="member-unset">—</span>}</td>
                    <td className="member-contact">{m.payment_info || <span className="member-unset">—</span>}</td>
                    <td>
                      {m.assigned_league_name
                        ? m.assigned_league_name
                        : <span className="member-badge member-badge-unassigned">Unassigned</span>}
                    </td>
                    <td className="member-check-cell">
                      <button
                        className={`member-dues-btn ${m.dues_paid ? 'member-dues-paid' : 'member-dues-unpaid'}`}
                        onClick={() => handleDuesToggle(m.id)}
                        disabled={togglingDues.has(m.id)}
                        title={m.dues_paid ? 'Mark unpaid' : 'Mark paid'}
                      >
                        {togglingDues.has(m.id) ? '…' : m.dues_paid ? '✓ Paid' : '✗ Unpaid'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
