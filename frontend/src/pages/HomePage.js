import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useSeason } from '../context/SeasonContext';
import PlayerSticker from '../components/PlayerSticker';
import PreSeasonHomePage from './PreSeasonHomePage';
import { pageVariants, pageTransition, listVariants, itemVariants } from '../utils/animations';
import './HomePage.css';

const shortName = (name) => (name || '').replace(/^.*? - /, '');

// ─── League Matchups Slider ───────────────────────────────────────────────────

function LeagueMatchupsSlider({ leagueMatchups, recentWeek }) {
  const sliderRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((i) => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.offsetWidth, behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    setActiveIndex(Math.round(el.scrollLeft / el.offsetWidth));
  }, []);

  const active = leagueMatchups[activeIndex];
  const total = leagueMatchups.length;

  return (
    <div className="bento-box slider-box">
      <div className="slider-header">
        <div className="slider-title-block">
          <h2>Week {recentWeek} Matchups</h2>
          <span className="slider-league-label">{shortName(active?.leagueName)}</span>
        </div>
        <div className="slider-controls">
          <button
            className="slider-arrow"
            onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            aria-label="Previous league"
          >‹</button>
          <div className="slider-dots">
            {leagueMatchups.map((_, i) => (
              <button
                key={i}
                className={`slider-dot${activeIndex === i ? ' active' : ''}`}
                onClick={() => scrollToIndex(i)}
                aria-label={`League ${i + 1}`}
              />
            ))}
          </div>
          <button
            className="slider-arrow"
            onClick={() => scrollToIndex(Math.min(total - 1, activeIndex + 1))}
            disabled={activeIndex === total - 1}
            aria-label="Next league"
          >›</button>
        </div>
      </div>

      <div className="matchup-slider" ref={sliderRef} onScroll={handleScroll}>
        {leagueMatchups.map((ld) => (
          <div key={ld.leagueId} className="matchup-slide">
            {ld.pairs.length === 0 ? (
              <p className="slider-empty">No matchup data available.</p>
            ) : (
              ld.pairs.map((pair) => {
                const leftWon  = pair.left.points  > pair.right.points;
                const rightWon = pair.right.points > pair.left.points;
                return (
                  <div key={pair.matchup_id} className="slider-matchup-row">
                    <span className={`slider-team${leftWon ? ' winner' : ''}`}>
                      {pair.left.teamName}
                    </span>
                    <div className="slider-scores">
                      <span className={leftWon ? 'score-winner' : ''}>
                        {pair.left.points.toFixed(2)}
                      </span>
                      <span className="slider-dash">—</span>
                      <span className={rightWon ? 'score-winner' : ''}>
                        {pair.right.points.toFixed(2)}
                      </span>
                    </div>
                    <span className={`slider-team slider-team-right${rightWon ? ' winner' : ''}`}>
                      {pair.right.teamName}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Standings Snapshot ───────────────────────────────────────────────────────

function StandingsSnapshot({ leagues, teamsByLeague }) {
  return (
    <div className="bento-box snapshot-box">
      <h2>Standings Snapshot</h2>
      <div className="snapshot-grid">
        {(leagues || []).map((league) => {
          const teams = teamsByLeague?.[league.sleeperId] || [];
          return (
            <div key={league.sleeperId} className="snapshot-card">
              <div className="snapshot-league-name">{shortName(league.name)}</div>
              {teams.slice(0, 3).map((team, i) => (
                <div key={team.id} className="snapshot-row">
                  <span className="snapshot-rank">{i + 1}</span>
                  <span className="snapshot-name">{team.team_name}</span>
                  <span className="snapshot-record">{team.wins}–{team.losses}</span>
                </div>
              ))}
              {teams.length === 0 && (
                <p className="snapshot-empty">No data</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BIG Playoff Bracket ──────────────────────────────────────────────────────

function PlayoffBracket({ bigPlayoffEntries }) {
  const rounds = useMemo(() => {
    const byWeek = {};
    (bigPlayoffEntries || []).forEach((e) => {
      if (!byWeek[e.playoff_week]) byWeek[e.playoff_week] = [];
      byWeek[e.playoff_week].push(e);
    });
    return Object.entries(byWeek)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, teams]) => ({
        week: Number(week),
        teams: [...teams].sort((a, b) => a.final_rank - b.final_rank),
      }));
  }, [bigPlayoffEntries]);

  if (!rounds.length) {
    return (
      <div className="bento-box bracket-box">
        <h2>BIG Playoff Bracket</h2>
        <p style={{ color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
          Bracket begins Week 15.
        </p>
      </div>
    );
  }

  return (
    <div className="bento-box bracket-box">
      <h2>BIG Playoff Bracket</h2>
      <div className="bracket-rounds">
        {rounds.map(({ week, teams }) => {
          const advancing = teams.filter((t) => !t.is_eliminated).length;
          return (
            <div key={week} className="bracket-round">
              <div className="bracket-round-header">
                <span className="bracket-week-label">Week {week}</span>
                <span className="bracket-count">{teams.length} teams</span>
              </div>
              <div className="bracket-team-list">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className={`bracket-entry${t.is_eliminated ? ' eliminated' : ' advanced'}`}
                  >
                    <span className="bracket-rank">#{t.final_rank}</span>
                    <span className="bracket-name">{t.team.split(' (')[0]}</span>
                    <span className="bracket-score">{t.week_score}</span>
                  </div>
                ))}
              </div>
              <div className="bracket-round-footer">
                {advancing} advanced
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Association Records ──────────────────────────────────────────────────────

function RecordCard({ label, value, sub }) {
  return (
    <div className="record-card">
      <div className="record-label">{label}</div>
      <div className="record-value">{value}</div>
      <div className="record-sub">{sub}</div>
    </div>
  );
}

function RecordsBox({ records, historyLoading }) {
  return (
    <div className="bento-box records-box">
      <h2>Association Records</h2>
      <h3>All-time across all 6 leagues</h3>
      {historyLoading || !records ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
          Loading historical data…
        </p>
      ) : (
        <div className="records-grid">
          {records.highScore && (
            <RecordCard
              label="Highest Single-Week Score"
              value={`${records.highScore.points.toFixed(2)} pts`}
              sub={`${records.highScore.teamName} · Wk ${records.highScore.week} · ${shortName(records.highScore.leagueName)}`}
            />
          )}
          {records.lowScore && (
            <RecordCard
              label="Lowest Single-Week Score"
              value={`${records.lowScore.points.toFixed(2)} pts`}
              sub={`${records.lowScore.teamName} · Wk ${records.lowScore.week} · ${shortName(records.lowScore.leagueName)}`}
            />
          )}
          {records.bigBlowout && (
            <RecordCard
              label="Biggest Blowout"
              value={`+${records.bigBlowout.margin.toFixed(2)} margin`}
              sub={`${records.bigBlowout.winTeam} def. ${records.bigBlowout.losTeam} · ${records.bigBlowout.winPts.toFixed(2)}–${records.bigBlowout.losPts.toFixed(2)} · Wk ${records.bigBlowout.week} · ${shortName(records.bigBlowout.leagueName)}`}
            />
          )}
          {records.closestGame && (
            <RecordCard
              label="Closest Game"
              value={`${records.closestGame.margin.toFixed(2)} pt margin`}
              sub={`${records.closestGame.winTeam} def. ${records.closestGame.losTeam} · ${records.closestGame.winPts.toFixed(2)}–${records.closestGame.losPts.toFixed(2)} · Wk ${records.closestGame.week} · ${shortName(records.closestGame.leagueName)}`}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Existing widgets (preserved) ────────────────────────────────────────────

function WeeklyWinnersBox({ weeklyWinners, recentWeek, loading }) {
  return (
    <div className="bento-box">
      <h2>Last Week's High Scorers</h2>
      {loading ? <p>Loading...</p> :
       !weeklyWinners?.length ? <p>No scores found for last week.</p> : (
        <div>
          <h3>Winners (Week {recentWeek})</h3>
          <ul className="bento-widget-list">
            {weeklyWinners.map((winner, i) => (
              <li key={i}>
                <div>
                  <span className="team-name">{winner.team_name}</span>
                  <span className="team-details">{winner.owner_name} ({shortName(winner.league_name)})</span>
                </div>
                <span className="team-score">{winner.score} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PowerRankingsBox({ powerRankings, loading }) {
  return (
    <div className="bento-box">
      <h2>Association Power Rankings</h2>
      <h3>Top total scores</h3>
      {loading ? <p>Loading...</p> : (
        <ol className="bento-widget-list">
          {powerRankings?.map((team, i) => (
            <li key={i}>
              <div>
                <span className="team-name">{i + 1}. {team.team_name}</span>
                <span className="team-details">{team.owner_name} ({shortName(team.league_name)})</span>
              </div>
              <span className="team-score">{team.points_for} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CommonPlayersBox({ commonPlayers, loading }) {
  return (
    <div className="bento-box">
      <h2>Playoff Meta</h2>
      <h3>Players on the most Playoff Teams</h3>
      {loading ? <p>Loading...</p> :
       !commonPlayers?.length ? <p>No data available yet.</p> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
          {commonPlayers.map((player) => (
            <PlayerSticker
              key={player.rank}
              player={{
                name: player.player_name,
                position: player.position,
                avatar_url: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg`,
              }}
              detail={
                <>
                  {player.count} rosters
                  <br />
                  {Number(player.average_score).toFixed(1)} avg
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── My Matchup ──────────────────────────────────────────────────────────────

function MyMatchupBox({ myIdentity, leagueMatchups, recentWeek }) {
  const match = useMemo(() => {
    if (!myIdentity?.length || !leagueMatchups?.length) return null;
    for (const identity of myIdentity) {
      const ld = leagueMatchups.find((l) => l.leagueId === identity.leagueId);
      if (!ld) continue;
      const pair = ld.pairs.find(
        (p) => p.left.rosterId === identity.rosterId || p.right.rosterId === identity.rosterId
      );
      if (pair) return { leagueName: ld.leagueName, pair, myRosterId: identity.rosterId };
    }
    return null;
  }, [myIdentity, leagueMatchups]);

  if (!match) return null;

  const { leagueName, pair } = match;
  const myIsLeft   = pair.left.rosterId  === match.myRosterId;
  const me         = myIsLeft ? pair.left  : pair.right;
  const them       = myIsLeft ? pair.right : pair.left;
  const iWon       = me.points  > them.points;
  const theyWon    = them.points > me.points;

  return (
    <div className="bento-box my-matchup-box">
      <h3>Your Week {recentWeek} Matchup</h3>
      <span className="my-matchup-league">{shortName(leagueName)}</span>
      <div className="my-matchup-scores">
        <div className={`my-matchup-side${iWon ? ' winner' : ''}`}>
          <span className="my-matchup-team">{me.teamName}</span>
          <span className="my-matchup-pts">{me.points.toFixed(2)}</span>
          <span className="my-matchup-label">You</span>
        </div>
        <span className="my-matchup-dash">vs</span>
        <div className={`my-matchup-side my-matchup-side-right${theyWon ? ' winner' : ''}`}>
          <span className="my-matchup-team">{them.teamName}</span>
          <span className="my-matchup-pts">{them.points.toFixed(2)}</span>
          <span className="my-matchup-label">Opponent</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function HomePage() {
  const {
    loading,
    weeklyWinners,
    powerRankings,
    commonPlayers,
    leagueMatchups,
    bigPlayoffEntries,
    leagues,
    teamsByLeague,
    recentWeek,
    records,
    historyLoading,
    myIdentity,
  } = useData();
  const { user } = useAuth();
  const { selectedSeason, seasonType } = useSeason();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  if (seasonType === 'pre_season') return <PreSeasonHomePage />;

  const showPendingBanner =
    !bannerDismissed &&
    user &&
    selectedSeason &&
    (!myIdentity || myIdentity.length === 0);

  return (
    <motion.div
      className="home-container"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <header className="home-hero">
        <h1>Welcome to the IYKYK League Hub</h1>
        <p>
          The central source of truth for all 6 leagues. Track standings,
          follow the BIG Playoff, and see who's running the association.
        </p>
      </header>

      {showPendingBanner && (
        <div className="pending-banner">
          <span>You're registered for <strong>{selectedSeason.label}</strong>! Your commish will assign you to a league before things kick off.</span>
          <button className="pending-banner-dismiss" onClick={() => setBannerDismissed(true)}>✕</button>
        </div>
      )}

      <motion.main
        className="bento-grid"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        {myIdentity?.length > 0 && (
          <motion.div variants={itemVariants} style={{ gridColumn: '1 / -1' }}>
            <MyMatchupBox
              myIdentity={myIdentity}
              leagueMatchups={leagueMatchups}
              recentWeek={recentWeek}
            />
          </motion.div>
        )}

        {leagueMatchups?.length > 0 && (
          <motion.div variants={itemVariants} style={{ gridColumn: '1 / -1' }}>
            <LeagueMatchupsSlider leagueMatchups={leagueMatchups} recentWeek={recentWeek} />
          </motion.div>
        )}

        <motion.div variants={itemVariants} style={{ gridColumn: '1 / -1' }}>
          <StandingsSnapshot leagues={leagues} teamsByLeague={teamsByLeague} />
        </motion.div>

        <motion.div variants={itemVariants} style={{ gridColumn: '1 / -1' }}>
          <PlayoffBracket bigPlayoffEntries={bigPlayoffEntries} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <WeeklyWinnersBox weeklyWinners={weeklyWinners} recentWeek={recentWeek} loading={loading} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <PowerRankingsBox powerRankings={powerRankings} loading={loading} />
        </motion.div>

        <motion.div variants={itemVariants} style={{ gridColumn: '1 / -1' }}>
          <RecordsBox records={records} historyLoading={historyLoading} />
        </motion.div>

        <motion.div variants={itemVariants} style={{ gridColumn: '1 / -1' }}>
          <CommonPlayersBox commonPlayers={commonPlayers} loading={loading} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link to="/dashboard" className="bento-box">
            <h2>View Standings</h2>
            <p>Full standings, matchup breakdowns, and player lineups for all 6 leagues.</p>
            <span className="cta-text">Go to Leagues Hub &rarr;</span>
          </Link>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Link to="/about" className="bento-box">
            <h2>About The League</h2>
            <p>The history, rules, and format of the IYKYK Fantasy Association.</p>
            <span className="cta-text">Learn More &rarr;</span>
          </Link>
        </motion.div>
      </motion.main>
    </motion.div>
  );
}

export default HomePage;
