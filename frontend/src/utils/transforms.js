const BIG_PLAYOFF_TEAMS_PER_LEAGUE = 6;

// ─── Shared helpers ──────────────────────────────────────────────────────────

function getUserMap(users) {
  const byId = {};
  const teamNames = {};
  (users || []).forEach((u) => {
    byId[u.user_id] = u;
    if (u.metadata?.team_name) teamNames[u.user_id] = u.metadata.team_name;
  });
  return { byId, teamNames };
}

function resolveTeamName(roster, userMap) {
  const { byId, teamNames } = userMap;
  const ownerId = roster.owner_id;
  const user = ownerId ? byId[ownerId] : null;
  const teamName =
    teamNames[ownerId] ||
    roster.metadata?.team_name ||
    (user ? `Team ${user.display_name}` : 'Team Name Not Set');
  return { teamName, displayName: user?.display_name || 'Owner' };
}

function getTop6RosterIds(ld) {
  const sorted = [...(ld.rosters || [])].sort(
    (a, b) => parseFloat(b.settings?.fpts || 0) - parseFloat(a.settings?.fpts || 0)
  );
  return new Set(sorted.slice(0, BIG_PLAYOFF_TEAMS_PER_LEAGUE).map((r) => r.roster_id));
}

// ─── Standings ───────────────────────────────────────────────────────────────

/**
 * Builds the team list for a single league, sorted by wins then points.
 * top_three_players shows this week's top scorers per roster; requires the
 * player DB to be loaded — returns empty arrays until then.
 */
export function buildTeamsByLeague(ld, players) {
  const userMap = getUserMap(ld.users);

  // Accumulate player points from the most recent week's matchup data
  const rosterTopPlayers = {};
  if (players) {
    const rosterPoints = {};
    (ld.recentMatchups || []).forEach((m) => {
      const rid = m.roster_id;
      if (!rid) return;
      if (!rosterPoints[rid]) rosterPoints[rid] = {};
      Object.entries(m.players_points || {}).forEach(([pid, pts]) => {
        rosterPoints[rid][pid] = (rosterPoints[rid][pid] || 0) + (parseFloat(pts) || 0);
      });
    });

    Object.entries(rosterPoints).forEach(([rid, pmap]) => {
      const top = Object.entries(pmap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      rosterTopPlayers[rid] = top.map(([pid, score]) => {
        const p = players[pid] || {};
        const name =
          p.full_name ||
          `${p.first_name || ''} ${p.last_name || ''}`.trim() ||
          'Unknown';
        return {
          id: pid,
          name,
          position: p.position || '?',
          total_points: score,
          avatar_url: `https://sleepercdn.com/content/nfl/players/${pid}.jpg`,
        };
      });
    });
  }

  return (ld.rosters || [])
    .map((r) => {
      const { teamName, displayName } = resolveTeamName(r, userMap);
      const s = r.settings || {};
      return {
        id: `${ld.sleeperId}-${r.roster_id}`,
        team_name: teamName,
        owner_name: displayName,
        wins: s.wins ?? 0,
        losses: s.losses ?? 0,
        ties: s.ties ?? 0,
        points_for: parseFloat(s.fpts || 0),
        roster_id: r.roster_id,
        top_three_players: rosterTopPlayers[r.roster_id] || [],
      };
    })
    .sort((a, b) => b.wins - a.wins || b.points_for - a.points_for);
}

// ─── League matchup pairs (for homepage slider) ──────────────────────────────

export function buildLeagueMatchups(leagues) {
  return (leagues || []).map((ld) => {
    const userMap = getUserMap(ld.users);
    const rosterMap = {};
    (ld.rosters || []).forEach((r) => {
      const { teamName, displayName } = resolveTeamName(r, userMap);
      rosterMap[r.roster_id] = { teamName, displayName, rosterId: r.roster_id };
    });

    const groups = {};
    (ld.recentMatchups || []).forEach((m) => {
      if (!m.matchup_id) return;
      if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
      groups[m.matchup_id].push(m);
    });

    const pairs = Object.values(groups)
      .filter((pair) => pair.length === 2)
      .map((pair) => {
        const [a, b] =
          pair[0].roster_id <= pair[1].roster_id ? [pair[0], pair[1]] : [pair[1], pair[0]];
        return {
          matchup_id: a.matchup_id,
          left:  { points: parseFloat(a.points) || 0, ...(rosterMap[a.roster_id] || {}) },
          right: { points: parseFloat(b.points) || 0, ...(rosterMap[b.roster_id] || {}) },
        };
      })
      .sort(
        (a, b) =>
          Math.max(b.left.points, b.right.points) -
          Math.max(a.left.points, a.right.points)
      );

    return {
      leagueId: ld.sleeperId,
      leagueName: ld.name,
      week: ld.recentMatchupWeek,
      pairs,
    };
  });
}

// ─── Weekly winners widget ────────────────────────────────────────────────────

export function buildWeeklyWinners(leagues) {
  const winners = [];
  (leagues || []).forEach((ld) => {
    const matchups = ld.recentMatchups || [];
    if (!matchups.length) return;

    const topScore = Math.max(...matchups.map((m) => parseFloat(m.points) || 0));
    if (topScore === 0) return;

    const userMap = getUserMap(ld.users);
    matchups.forEach((m) => {
      const pts = parseFloat(m.points) || 0;
      if (pts < topScore) return;
      const roster = (ld.rosters || []).find((r) => r.roster_id === m.roster_id);
      if (!roster) return;
      const { teamName, displayName } = resolveTeamName(roster, userMap);
      winners.push({
        week: ld.recentMatchupWeek,
        team_name: teamName,
        owner_name: displayName,
        league_name: ld.name,
        score: pts,
      });
    });
  });
  return winners;
}

// ─── Power rankings widget ────────────────────────────────────────────────────

export function buildPowerRankings(leagues) {
  const all = [];
  (leagues || []).forEach((ld) => {
    const userMap = getUserMap(ld.users);
    (ld.rosters || []).forEach((r) => {
      const { teamName, displayName } = resolveTeamName(r, userMap);
      const s = r.settings || {};
      all.push({
        team_name: teamName,
        owner_name: displayName,
        points_for: parseFloat(s.fpts || 0),
        league_name: ld.name,
        record: `${s.wins ?? 0}-${s.losses ?? 0}-${s.ties ?? 0}`,
      });
    });
  });
  return all.sort((a, b) => b.points_for - a.points_for).slice(0, 5);
}

// ─── Common playoff players widget ───────────────────────────────────────────

function buildPlayerAverageScores(leagues) {
  const totals = {};
  (leagues || []).forEach((ld) => {
    Object.values(ld.matchups || {}).forEach((weekMatchups) => {
      (weekMatchups || []).forEach((m) => {
        Object.entries(m.players_points || {}).forEach(([pid, pts]) => {
          const score = parseFloat(pts);
          if (score > 0) {
            if (!totals[pid]) totals[pid] = { total: 0, weeks: 0 };
            totals[pid].total += score;
            totals[pid].weeks += 1;
          }
        });
      });
    });
  });
  const avgs = {};
  Object.entries(totals).forEach(([pid, { total, weeks }]) => {
    avgs[pid] = weeks > 0 ? total / weeks : 0;
  });
  return avgs;
}

export function buildCommonPlayers(leagues, players) {
  if (!players) return [];

  const counts = {};
  (leagues || []).forEach((ld) => {
    const playoffIds = getTop6RosterIds(ld);
    (ld.rosters || []).forEach((r) => {
      if (!playoffIds.has(r.roster_id)) return;
      (r.players || []).forEach((pid) => {
        counts[pid] = (counts[pid] || 0) + 1;
      });
    });
  });

  const avgScores = buildPlayerAverageScores(leagues);
  const result = [];
  let rank = 1;

  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([pid, count]) => {
      const p = players[pid];
      if (!p || p.position === 'DEF') return;
      const name =
        p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
      result.push({
        rank: rank++,
        player_name: name,
        player_id: pid,
        position: p.position,
        nfl_team: p.team,
        count,
        average_score: avgScores[pid] || 0,
      });
    });

  return result.slice(0, 10);
}

// ─── Association records ──────────────────────────────────────────────────────

export function buildRecords(historyData, leagues) {
  // Build roster name lookup: leagueId → rosterId → { teamName, ownerName }
  const rosterNames = {};
  (leagues || []).forEach((ld) => {
    rosterNames[ld.sleeperId] = {};
    const userMap = getUserMap(ld.users);
    (ld.rosters || []).forEach((r) => {
      const { teamName, displayName } = resolveTeamName(r, userMap);
      rosterNames[ld.sleeperId][r.roster_id] = { teamName, ownerName: displayName };
    });
  });

  let highScore   = null;
  let lowScore    = null;
  let bigBlowout  = null;
  let closestGame = null;

  (historyData || []).forEach(({ leagueId, weeks }) => {
    const ld = (leagues || []).find((l) => l.sleeperId === leagueId);
    const leagueName = ld?.name || leagueId;
    const names = rosterNames[leagueId] || {};

    weeks.forEach((weekMatchups, weekIndex) => {
      const week = weekIndex + 1;

      // High / low single-week team score
      (weekMatchups || []).forEach((m) => {
        const pts = parseFloat(m.points) || 0;
        if (pts <= 0) return;
        const team = names[m.roster_id] || {};
        if (!highScore || pts > highScore.points)
          highScore = { points: pts, teamName: team.teamName || '?', ownerName: team.ownerName || '', week, leagueName };
        if (!lowScore || pts < lowScore.points)
          lowScore  = { points: pts, teamName: team.teamName || '?', ownerName: team.ownerName || '', week, leagueName };
      });

      // Matchup-level records (blowout / closest)
      const groups = {};
      (weekMatchups || []).forEach((m) => {
        if (!m.matchup_id) return;
        if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
        groups[m.matchup_id].push(m);
      });

      Object.values(groups)
        .filter((pair) => pair.length === 2)
        .forEach(([a, b]) => {
          const apts = parseFloat(a.points) || 0;
          const bpts = parseFloat(b.points) || 0;
          if (apts <= 0 || bpts <= 0) return;

          const margin  = Math.abs(apts - bpts);
          const winPts  = Math.max(apts, bpts);
          const losPts  = Math.min(apts, bpts);
          const winner  = apts > bpts ? a : b;
          const loser   = apts > bpts ? b : a;
          const winTeam = names[winner.roster_id]?.teamName || '?';
          const losTeam = names[loser.roster_id]?.teamName  || '?';

          if (!bigBlowout || margin > bigBlowout.margin)
            bigBlowout  = { margin, winTeam, losTeam, winPts, losPts, week, leagueName };
          if (!closestGame || margin < closestGame.margin)
            closestGame = { margin, winTeam, losTeam, winPts, losPts, week, leagueName };
        });
    });
  });

  return { highScore, lowScore, bigBlowout, closestGame };
}

// ─── BIG Playoff simulation ───────────────────────────────────────────────────

export function buildBigPlayoff(leagues, startWeek = 15) {
  // Score lookup: sleeperId → week → rosterId → points
  const scoreLookup = {};
  (leagues || []).forEach((ld) => {
    scoreLookup[ld.sleeperId] = {};
    Object.entries(ld.matchups || {}).forEach(([w, matchups]) => {
      const week = parseInt(w, 10);
      scoreLookup[ld.sleeperId][week] = {};
      (matchups || []).forEach((m) => {
        if (m.roster_id != null)
          scoreLookup[ld.sleeperId][week][m.roster_id] = parseFloat(m.points) || 0;
      });
    });
  });

  // Qualifiers: top 6 by total season points per league
  const qualifiers = [];
  (leagues || []).forEach((ld) => {
    const userMap = getUserMap(ld.users);
    const sorted = [...(ld.rosters || [])].sort(
      (a, b) => parseFloat(b.settings?.fpts || 0) - parseFloat(a.settings?.fpts || 0)
    );
    sorted.slice(0, BIG_PLAYOFF_TEAMS_PER_LEAGUE).forEach((r) => {
      const { teamName, displayName } = resolveTeamName(r, userMap);
      qualifiers.push({
        sleeperId: ld.sleeperId,
        rosterId: r.roster_id,
        teamLabel: `${teamName} (${displayName})`,
        season: ld.season,
      });
    });
  });

  // Collect available playoff weeks across all leagues
  const availableWeeks = new Set();
  (leagues || []).forEach((ld) => {
    Object.keys(ld.matchups || {}).forEach((w) => availableWeeks.add(parseInt(w, 10)));
  });
  const sortedWeeks = [...availableWeeks]
    .filter((w) => w >= startWeek)
    .sort((a, b) => a - b);

  // Simulate elimination rounds
  const allEntries = [];
  let entryId = 1;
  let active = [...qualifiers];

  for (const week of sortedWeeks) {
    if (active.length === 0) break;

    const weekEntries = active
      .map((q) => ({
        ...q,
        weekScore: scoreLookup[q.sleeperId]?.[week]?.[q.rosterId] || 0,
      }))
      .sort((a, b) => b.weekScore - a.weekScore);

    const numAdvancing = Math.ceil(weekEntries.length / 2);

    weekEntries.forEach((entry, i) => {
      allEntries.push({
        id: entryId++,
        team: entry.teamLabel,
        leagueId: entry.sleeperId,
        rosterId: entry.rosterId,
        season: entry.season,
        playoff_week: week,
        week_score: entry.weekScore.toFixed(2),
        is_eliminated: i + 1 > numAdvancing,
        final_rank: i + 1,
      });
    });

    active = weekEntries.slice(0, numAdvancing);
  }

  return allEntries;
}
