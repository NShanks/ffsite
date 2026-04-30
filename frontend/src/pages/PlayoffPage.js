import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useSeason } from '../context/SeasonContext';
import PlayerSticker from '../components/PlayerSticker';
import { fetchMatchupsForWeek, fetchWeekStats } from '../api/sleeperApi';
import { pageVariants, pageTransition, listVariants, itemVariants } from '../utils/animations';
import './PlayoffPage.css';

// ─── Helpers (mirrored from DashboardPage) ────────────────────────────────────

const SLOT_ABBR = {
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', K: 'K', DEF: 'DEF',
  FLEX: 'FLX', SUPER_FLEX: 'SF', IDP_FLEX: 'IDP', REC_FLEX: 'REC', WRRB_FLEX: 'WRRB',
};

function getStatLine(position, stats) {
  if (!stats) return null;
  const n = (v) => v || 0;
  switch (position) {
    case 'QB': {
      const parts = [`${n(stats.pass_cmp)}/${n(stats.pass_att)}, ${n(stats.pass_yd)} yd, ${n(stats.pass_td)} TD`];
      if (stats.pass_int) parts.push(`${stats.pass_int} INT`);
      if (stats.rush_yd) parts.push(`${n(stats.rush_att)} rush, ${n(stats.rush_yd)} yd`);
      return parts.join(' · ');
    }
    case 'RB': {
      const parts = [`${n(stats.rush_att)} att, ${n(stats.rush_yd)} yd`];
      if (stats.rush_td) parts.push(`${stats.rush_td} TD`);
      if (stats.rec) parts.push(`${n(stats.rec)}/${n(stats.rec_tgt)} rec, ${n(stats.rec_yd)} yd`);
      return parts.join(' · ');
    }
    case 'WR':
    case 'TE': {
      const parts = [`${n(stats.rec)}/${n(stats.rec_tgt)} rec, ${n(stats.rec_yd)} yd`];
      if (stats.rec_td) parts.push(`${stats.rec_td} TD`);
      if (stats.rush_att) parts.push(`${n(stats.rush_att)} rush, ${n(stats.rush_yd)} yd`);
      return parts.join(' · ');
    }
    case 'K':
      return `${n(stats.fgm)}/${n(stats.fga)} FG, ${n(stats.xpm)} XP`;
    case 'DEF': {
      const parts = [];
      if (stats.pts_allow != null) parts.push(`${stats.pts_allow} PA`);
      if (stats.sack) parts.push(`${stats.sack} SK`);
      if (stats.def_int) parts.push(`${stats.def_int} INT`);
      if (stats.fum_rec) parts.push(`${stats.fum_rec} FR`);
      if (stats.safe) parts.push(`${stats.safe} SF`);
      return parts.join(', ') || null;
    }
    default:
      return null;
  }
}

function splitTeamLabel(label) {
  const match = (label || '').match(/^(.*?)\s*\(([^)]+)\)$/);
  return match ? { teamName: match[1], ownerName: match[2] } : { teamName: label, ownerName: '' };
}

// ─── Single starter row ───────────────────────────────────────────────────────

function StarterRow({ pid, slotLabel, score, players, weekStats }) {
  if (!pid || pid === '0') {
    return (
      <div className="playoff-starter-row">
        <span className="playoff-slot-label">—</span>
        <div className="playoff-player-empty">Empty</div>
        <span className="playoff-starter-score">—</span>
      </div>
    );
  }

  const p = players?.[pid];
  const name = p
    ? (p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown')
    : '...';
  const position = p?.position || '?';
  const avatarUrl =
    position === 'DEF'
      ? `https://sleepercdn.com/images/team_logos/nfl/${pid}.jpg`
      : `https://sleepercdn.com/content/nfl/players/${pid}.jpg`;
  const statLine = p ? getStatLine(position, weekStats?.[pid]) : null;

  return (
    <div className="playoff-starter-row">
      <span className="playoff-slot-label">{slotLabel}</span>
      <div className="playoff-player-cell">
        <div className="playoff-player-sticker">
          <PlayerSticker
            player={{ name, position, avatar_url: avatarUrl }}
            detail={[p?.team, score != null ? `${score.toFixed(1)} pts` : null].filter(Boolean).join(' · ')}
          />
        </div>
        <div className="playoff-player-info">
          <span className="playoff-player-name">{name}</span>
          <span className="playoff-player-pos">{position}{p?.team ? ` · ${p.team}` : ''}</span>
          {statLine && <span className="playoff-player-stats">{statLine}</span>}
        </div>
      </div>
      <span className="playoff-starter-score">{score != null ? score.toFixed(1) : '—'}</span>
    </div>
  );
}

// ─── Team lineup (fetched on expand) ─────────────────────────────────────────

function TeamLineup({ entry, leagues, players, cacheRef, active }) {
  const [matchupEntry, setMatchupEntry] = useState(null);
  const [weekStats, setWeekStats]       = useState(null);
  const [fetching, setFetching]         = useState(false);

  const league = useMemo(
    () => (leagues || []).find((l) => l.sleeperId === entry.leagueId),
    [leagues, entry.leagueId]
  );

  const starterSlots = useMemo(
    () => (league?.rosterPositions || []).filter((p) => p !== 'BN' && p !== 'IR'),
    [league]
  );

  useEffect(() => {
    if (!active || !entry.leagueId || !entry.rosterId || !entry.playoff_week) return;

    const mKey = `${entry.leagueId}-${entry.playoff_week}`;
    const sKey = `stats-${league?.season}-${entry.playoff_week}`;

    const cached = cacheRef.current[mKey];
    const cachedStats = cacheRef.current[sKey];

    if (cached && cachedStats) {
      const me = cached.find((m) => m.roster_id === entry.rosterId);
      setMatchupEntry(me || null);
      setWeekStats(cachedStats);
      return;
    }

    let cancelled = false;
    setFetching(true);

    const mFetch = cached
      ? Promise.resolve(cached)
      : fetchMatchupsForWeek(entry.leagueId, entry.playoff_week);

    const sFetch = cachedStats
      ? Promise.resolve(cachedStats)
      : fetchWeekStats(league?.season, entry.playoff_week).catch(() => ({}));

    Promise.all([mFetch, sFetch])
      .then(([matchupData, statsData]) => {
        if (cancelled) return;
        cacheRef.current[mKey] = matchupData || [];
        cacheRef.current[sKey] = statsData || {};
        const me = (matchupData || []).find((m) => m.roster_id === entry.rosterId);
        setMatchupEntry(me || null);
        setWeekStats(statsData || {});
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setFetching(false); });

    return () => { cancelled = true; };
  }, [active, entry.leagueId, entry.rosterId, entry.playoff_week, league, cacheRef]);

  if (fetching) {
    return <div className="playoff-lineup-loading">Loading lineup…</div>;
  }

  if (!matchupEntry) {
    return <div className="playoff-lineup-empty">No lineup data available.</div>;
  }

  const starters = matchupEntry.starters || [];
  const starterPts = matchupEntry.starters_points || [];

  return (
    <div className="playoff-lineup" onClick={(e) => e.stopPropagation()}>
      <div className="playoff-lineup-header">
        <span className="playoff-lineup-col-slot">Slot</span>
        <span className="playoff-lineup-col-player">Player</span>
        <span className="playoff-lineup-col-score">Pts</span>
      </div>
      {starters.map((pid, i) => (
        <StarterRow
          key={i}
          pid={pid}
          slotLabel={SLOT_ABBR[starterSlots[i]] ?? starterSlots[i] ?? '—'}
          score={starterPts[i] ?? null}
          players={players}
          weekStats={weekStats}
        />
      ))}
      <div className="playoff-lineup-total">
        <span>Total</span>
        <span>{parseFloat(matchupEntry.points || 0).toFixed(2)} pts</span>
      </div>
    </div>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, isChampion, isFinalWeek, isMe, leagues, players, cacheRef }) {
  const [expanded, setExpanded] = useState(false);
  const { teamName, ownerName } = splitTeamLabel(entry.team);

  const isOut = entry.is_eliminated || (isFinalWeek && !isChampion);

  const statusClass = isChampion ? 'status-champion' : isOut ? 'status-eliminated' : 'status-advanced';
  const statusLabel = isChampion ? 'Champion'        : isOut ? 'Eliminated'        : 'Advanced';

  return (
    <div
      className={`playoff-entry-card ${statusClass}${expanded ? ' expanded' : ''}${isMe ? ' is-me' : ''}`}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
    >
      <div className="playoff-entry-header">
        <div className="playoff-entry-rank-block">
          <span className="playoff-entry-rank">#{entry.final_rank}</span>
          {isMe && <span className="playoff-you-badge">You</span>}
        </div>

        <div className="playoff-entry-team">
          <span className="playoff-entry-team-name">{teamName}</span>
          {ownerName && <span className="playoff-entry-owner">{ownerName}</span>}
        </div>

        <div className="playoff-entry-right">
          <span className="playoff-entry-score">{entry.week_score}</span>
          <span className={`playoff-status-badge ${statusClass}`}>{statusLabel}</span>
          <span className="playoff-chevron">▼</span>
        </div>
      </div>

      <div className={`playoff-expand-body${expanded ? ' open' : ''}`}>
        <div className="playoff-expand-inner">
          <TeamLineup
            entry={entry}
            leagues={leagues}
            players={players}
            cacheRef={cacheRef}
            active={expanded}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PlayoffPage() {
  const { loading, error, bigPlayoffEntries, leagues, players, myIdentity } = useData();
  const { seasonType, selectedSeason } = useSeason();
  const cacheRef = useRef({});

  const { weeks, entriesByWeek } = useMemo(() => {
    const byWeek = {};
    (bigPlayoffEntries || []).forEach((e) => {
      if (!byWeek[e.playoff_week]) byWeek[e.playoff_week] = [];
      byWeek[e.playoff_week].push(e);
    });
    const sortedWeeks = Object.keys(byWeek)
      .map(Number)
      .sort((a, b) => a - b);
    return { weeks: sortedWeeks, entriesByWeek: byWeek };
  }, [bigPlayoffEntries]);

  const [selectedWeek, setSelectedWeek] = useState(null);

  useEffect(() => {
    if (weeks.length && selectedWeek === null) {
      setSelectedWeek(weeks[weeks.length - 1]);
    }
  }, [weeks, selectedWeek]);

  const currentEntries = useMemo(
    () => (selectedWeek ? (entriesByWeek[selectedWeek] || []) : []),
    [selectedWeek, entriesByWeek]
  );

  // Is this the final week? If so, rank 1 is the champion
  const isFinalWeek = weeks.length > 0 && selectedWeek === weeks[weeks.length - 1];
  const finalWeekHasWinner = isFinalWeek && currentEntries.some((e) => !e.is_eliminated);

  if (seasonType === 'pre_season') {
    const year = selectedSeason?.year || '';
    return (
      <div className="playoff-page" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          BIG Playoff hasn't started yet
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          The bracket will appear here once the {year} season is underway.
        </p>
        <a href="/" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>← Season preview</a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="playoff-page">
        <p style={{ padding: '2rem', color: 'var(--text-tertiary)' }}>Loading playoff data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="playoff-page">
        <p style={{ padding: '2rem', color: 'red' }}>Error: {error.message}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="playoff-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <header className="playoff-hero">
        <h1>BIG Playoff</h1>
        <p>Top 6 from each league compete in a cross-association points battle.</p>
      </header>

      {weeks.length === 0 ? (
        <div className="playoff-empty">
          <p>The BIG Playoff has not started yet. Check back after Week 15!</p>
        </div>
      ) : (
        <>
          <div className="playoff-week-bar">
            <span className="playoff-week-bar-label">Week</span>
            <div className="playoff-week-pills">
              {weeks.map((w) => (
                <button
                  key={w}
                  className={`playoff-week-pill${selectedWeek === w ? ' active' : ''}`}
                  onClick={() => setSelectedWeek(w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedWeek}
              className="playoff-entries"
              variants={listVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              {currentEntries.map((entry) => {
                const isChampion =
                  finalWeekHasWinner &&
                  entry.final_rank === 1 &&
                  !entry.is_eliminated;
                const isMe = myIdentity?.some(
                  (m) => m.leagueId === entry.leagueId && m.rosterId === entry.rosterId
                );
                return (
                  <motion.div key={entry.id} variants={itemVariants}>
                    <EntryCard
                      entry={entry}
                      isChampion={isChampion}
                      isFinalWeek={isFinalWeek}
                      isMe={isMe}
                      leagues={leagues}
                      players={players}
                      cacheRef={cacheRef}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

export default PlayoffPage;
