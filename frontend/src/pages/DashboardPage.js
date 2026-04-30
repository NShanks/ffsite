import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useSeason } from '../context/SeasonContext';
import PlayerSticker from '../components/PlayerSticker';
import { fetchMatchupsForWeek, fetchWeekStats } from '../api/sleeperApi';
import { pageVariants, pageTransition, listVariants, itemVariants } from '../utils/animations';
import './DashboardPage.css';
import './LeagueDetailPage.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTeamsMap(teams) {
  const map = {};
  (teams || []).forEach((t) => { map[t.roster_id] = t; });
  return map;
}

const SLOT_ABBR = {
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', K: 'K', DEF: 'DEF',
  FLEX: 'FLX', SUPER_FLEX: 'SF', IDP_FLEX: 'IDP', REC_FLEX: 'REC', WRRB_FLEX: 'WRRB',
};

function pairMatchups(matchupData) {
  const groups = {};
  (matchupData || []).forEach((m) => {
    if (!m.matchup_id) return;
    if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
    groups[m.matchup_id].push(m);
  });
  return Object.values(groups)
    .filter((pair) => pair.length === 2)
    // Sort cards by highest scorer descending
    .sort((a, b) => {
      const maxA = Math.max(a[0].points || 0, a[1].points || 0);
      const maxB = Math.max(b[0].points || 0, b[1].points || 0);
      return maxB - maxA;
    });
}

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerCell({ pid, players, weekStats, isRight }) {
  if (!pid || pid === '0') {
    return <div className={`player-cell${isRight ? ' player-cell-right' : ''} player-cell-empty`}><span>—</span></div>;
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

  const sticker = (
    <div className="player-row-sticker">
      <PlayerSticker
        player={{ name, position, avatar_url: avatarUrl }}
        detail={`${position}${p?.team ? ' · ' + p.team : ''}`}
      />
    </div>
  );

  const info = (
    <div className={`player-cell-info${isRight ? ' player-cell-info-right' : ' player-cell-info-left'}`}>
      <div className="player-cell-name">{name}</div>
      <div className="player-cell-pos">{position}{p?.team ? ` · ${p.team}` : ''}</div>
      {statLine && <div className="player-cell-stats">{statLine}</div>}
    </div>
  );

  // Left: [sticker][info], Right: [info][sticker] — both control order via JSX, not CSS reversal
  return (
    <div className={`player-cell${isRight ? ' player-cell-right' : ''}`}>
      {isRight ? <>{info}{sticker}</> : <>{sticker}{info}</>}
    </div>
  );
}

function MatchupRows({ home, away, players, weekStats, rosterPositions }) {
  // Derive the ordered starter slot labels (excludes bench/IR)
  const starterSlots = useMemo(
    () => (rosterPositions || []).filter((p) => p !== 'BN' && p !== 'IR'),
    [rosterPositions]
  );
  const count = Math.max(home.starters?.length || 0, away.starters?.length || 0);

  return (
    <div className="matchup-rows" onClick={(e) => e.stopPropagation()}>
      {Array.from({ length: count }, (_, i) => {
        const homePid = home.starters?.[i] || '0';
        const awayPid = away.starters?.[i] || '0';
        const homeScore = home.starters_points?.[i] ?? 0;
        const awayScore = away.starters_points?.[i] ?? 0;
        const homeWins = homeScore > awayScore;
        const awayWins = awayScore > homeScore;
        const slotLabel = SLOT_ABBR[starterSlots[i]] ?? starterSlots[i] ?? '—';

        return (
          <div key={i} className="matchup-row">
            <PlayerCell pid={homePid} players={players} weekStats={weekStats} />
            <div className="matchup-row-scores">
              <span className={`row-score${homeWins ? ' score-winner' : ''}`}>
                {homeScore.toFixed(1)}
              </span>
              <span className="row-slot-label">{slotLabel}</span>
              <span className={`row-score${awayWins ? ' score-winner' : ''}`}>
                {awayScore.toFixed(1)}
              </span>
            </div>
            <PlayerCell pid={awayPid} players={players} weekStats={weekStats} isRight />
          </div>
        );
      })}
    </div>
  );
}

function MatchupCard({ pair, teamsMap, players, weekStats, rosterPositions, isExpanded, onToggle }) {
  // Consistent left/right: lower roster_id always on the left
  const [left, right] =
    pair[0].roster_id <= pair[1].roster_id ? [pair[0], pair[1]] : [pair[1], pair[0]];
  const homeTeam = teamsMap[left.roster_id] || { team_name: 'Unknown', owner_name: '—' };
  const awayTeam = teamsMap[right.roster_id] || { team_name: 'Unknown', owner_name: '—' };
  const homeWon = (left.points || 0) > (right.points || 0);
  const awayWon = (right.points || 0) > (left.points || 0);

  return (
    <div
      className={`matchup-card${isExpanded ? ' expanded' : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
    >
      <div className="matchup-header">
        <div className={`matchup-team-side${homeWon ? ' winner' : ''}`}>
          <span className="matchup-team-name">{homeTeam.team_name}</span>
          <span className="matchup-owner-name">{homeTeam.owner_name}</span>
        </div>

        <div className="matchup-scores">
          <span className={`matchup-score${homeWon ? ' score-winner' : ''}`}>
            {(left.points || 0).toFixed(2)}
          </span>
          <span className="matchup-dash">—</span>
          <span className={`matchup-score${awayWon ? ' score-winner' : ''}`}>
            {(right.points || 0).toFixed(2)}
          </span>
        </div>

        <div className={`matchup-team-side matchup-team-side-right${awayWon ? ' winner' : ''}`}>
          <span className="matchup-team-name">{awayTeam.team_name}</span>
          <span className="matchup-owner-name">{awayTeam.owner_name}</span>
        </div>

        <div className="matchup-chevron">▼</div>
      </div>

      <div className={`matchup-expand-body${isExpanded ? ' open' : ''}`}>
        <div className="matchup-expand-inner">
          <MatchupRows
            home={left}
            away={right}
            players={players}
            weekStats={weekStats}
            rosterPositions={rosterPositions}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { loading, error, leagues, teamsByLeague, recentWeek, players, myIdentity } = useData();
  const { user } = useAuth();
  const { selectedSeason, seasonType } = useSeason();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subTab, setSubTab] = useState('standings');
  const [matchupWeek, setMatchupWeek] = useState(null);
  const [matchups, setMatchups] = useState([]);
  const [weekStats, setWeekStats] = useState(null);
  const [loadingMatchups, setLoadingMatchups] = useState(false);
  const [expandedMatchupId, setExpandedMatchupId] = useState(null);
  const cacheRef = useRef({});
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    if (recentWeek != null && matchupWeek === null) setMatchupWeek(recentWeek);
  }, [recentWeek, matchupWeek]);

  // Auto-select the user's league on first load
  useEffect(() => {
    if (hasAutoSelected.current || !myIdentity?.length || !leagues?.length) return;
    const idx = leagues.findIndex((l) => l.sleeperId === myIdentity[0].leagueId);
    if (idx >= 0) { setSelectedIndex(idx); hasAutoSelected.current = true; }
  }, [myIdentity, leagues]);

  const selectedLeague = leagues?.[selectedIndex];
  const teams = useMemo(
    () => (selectedLeague ? (teamsByLeague?.[selectedLeague.sleeperId] || []) : []),
    [selectedLeague, teamsByLeague]
  );
  const teamsMap = useMemo(() => buildTeamsMap(teams), [teams]);

  useEffect(() => {
    if (subTab !== 'matchups' || !selectedLeague || !matchupWeek) return;

    const mKey = `${selectedLeague.sleeperId}-${matchupWeek}`;
    const sKey = `stats-${selectedLeague.season}-${matchupWeek}`;

    if (cacheRef.current[mKey] && cacheRef.current[sKey]) {
      setMatchups(cacheRef.current[mKey]);
      setWeekStats(cacheRef.current[sKey]);
      return;
    }

    let cancelled = false;
    setLoadingMatchups(true);
    setMatchups([]);
    setWeekStats(null);

    const mFetch = cacheRef.current[mKey]
      ? Promise.resolve(cacheRef.current[mKey])
      : fetchMatchupsForWeek(selectedLeague.sleeperId, matchupWeek);

    const sFetch = cacheRef.current[sKey]
      ? Promise.resolve(cacheRef.current[sKey])
      : fetchWeekStats(selectedLeague.season, matchupWeek).catch(() => ({}));

    Promise.all([mFetch, sFetch])
      .then(([matchupData, statsData]) => {
        if (cancelled) return;
        cacheRef.current[mKey] = matchupData || [];
        cacheRef.current[sKey] = statsData || {};
        setMatchups(matchupData || []);
        setWeekStats(statsData || {});
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingMatchups(false); });

    return () => { cancelled = true; };
  }, [subTab, selectedLeague, matchupWeek]);

  useEffect(() => {
    setExpandedMatchupId(null);
  }, [selectedIndex, matchupWeek]);

  if (loading) return <div style={{ padding: '1rem 2rem' }}><p>Loading...</p></div>;
  if (error)   return <p style={{ color: 'red' }}>Error: {error.message}</p>;

  if (seasonType === 'pre_season') {
    const year = selectedSeason?.year || '';
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Standings aren't ready yet
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Leagues and matchups will appear here once the {year} season kicks off.
        </p>
        <a href="/" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>← Season preview</a>
      </div>
    );
  }

  const pairedMatchups = pairMatchups(matchups);

  return (
    <motion.div
      className="dashboard-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <h1>Leagues</h1>

      {!bannerDismissed && user && selectedSeason && (!myIdentity || myIdentity.length === 0) && (
        <div className="pending-banner">
          <span>You're registered for <strong>{selectedSeason.label}</strong>! Your commish will assign you to a league before things kick off.</span>
          <button className="pending-banner-dismiss" onClick={() => setBannerDismissed(true)}>✕</button>
        </div>
      )}

      <div className="tabs-container">
        <div className="league-tabs">
          {leagues?.map((league, i) => (
            <button
              key={league.sleeperId}
              className={`tab ${selectedIndex === i ? 'active' : ''}`}
              onClick={() => setSelectedIndex(i)}
            >
              {league.name.replace(/^.*? - /, '')}
            </button>
          ))}
        </div>

        <div className="sub-tabs">
          <button
            className={`sub-tab${subTab === 'standings' ? ' active' : ''}`}
            onClick={() => setSubTab('standings')}
          >
            Standings
          </button>
          <button
            className={`sub-tab${subTab === 'matchups' ? ' active' : ''}`}
            onClick={() => setSubTab('matchups')}
          >
            Matchups
          </button>
        </div>

        <div className="standings-content">
          {subTab === 'standings' && (
            teams.length === 0 ? (
              <p>No teams found for this league.</p>
            ) : (
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team Name</th>
                    <th>Record (W-L-T)</th>
                    <th>Points For</th>
                    <th style={{ textAlign: 'center' }}>Top Players (Week {recentWeek})</th>
                  </tr>
                </thead>
                <motion.tbody
                  key={selectedLeague?.sleeperId}
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                >
                  {teams.map((team, index) => {
                    const isMe = myIdentity?.some(
                      (m) => m.leagueId === selectedLeague?.sleeperId && m.rosterId === team.roster_id
                    );
                    return (
                      <motion.tr
                        key={team.id}
                        variants={itemVariants}
                        className={isMe ? 'my-team-row' : undefined}
                      >
                        <td>{index + 1}</td>
                        <td>{team.team_name}</td>
                        <td>{team.wins}-{team.losses}-{team.ties}</td>
                        <td>{team.points_for.toFixed(2)}</td>
                        <td>
                          <div className="player-avatars">
                            {team.top_three_players?.map((player) => (
                              <PlayerSticker
                                key={player.id}
                                player={player}
                                detail={`${player.total_points.toFixed(1)} pts`}
                              />
                            ))}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            )
          )}

          {subTab === 'matchups' && (
            <div className="matchups-view">
              <div className="week-selector">
                <span className="week-selector-label">Week</span>
                <div className="week-selector-pills">
                  <div className="week-pills-row">
                    {Array.from({ length: 9 }, (_, i) => i + 1).map((w) => (
                      <button
                        key={w}
                        className={`week-pill${matchupWeek === w ? ' active' : ''}`}
                        onClick={() => setMatchupWeek(w)}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <div className="week-pills-row week-pills-row-end">
                    {Array.from({ length: 8 }, (_, i) => i + 10).map((w) => (
                      <button
                        key={w}
                        className={`week-pill${matchupWeek === w ? ' active' : ''}`}
                        onClick={() => setMatchupWeek(w)}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loadingMatchups ? (
                <p style={{ textAlign: 'center', padding: '2rem' }}>Loading matchups...</p>
              ) : pairedMatchups.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem' }}>
                  No matchup data for Week {matchupWeek}.
                </p>
              ) : (
                <motion.div
                  className="matchup-list"
                  key={`matchups-${selectedLeague?.sleeperId}-${matchupWeek}`}
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                >
                  {pairedMatchups.map((pair) => {
                    const mid = pair[0].matchup_id;
                    return (
                      <motion.div key={mid} variants={itemVariants}>
                        <MatchupCard
                          pair={pair}
                          teamsMap={teamsMap}
                          players={players}
                          weekStats={weekStats}
                          rosterPositions={selectedLeague?.rosterPositions}
                          isExpanded={expandedMatchupId === mid}
                          onToggle={() =>
                            setExpandedMatchupId((prev) => (prev === mid ? null : mid))
                          }
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default DashboardPage;
