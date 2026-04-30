/**
 * Local API layer for offline mode.
 * Reads sleeper_snapshot_2025.json and returns the same shapes as the Django API.
 * Place sleeper_snapshot_2025.json in frontend/public/ (copy from backend/).
 */

const SNAPSHOT_URL = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/sleeper_snapshot_2025.json`
  : "/sleeper_snapshot_2025.json";

let snapshotCache = null;

async function getSnapshot() {
  if (snapshotCache) return snapshotCache;
  const res = await fetch(SNAPSHOT_URL);
  if (!res.ok) throw new Error(`Failed to load snapshot: ${res.status}`);
  snapshotCache = await res.json();
  return snapshotCache;
}

function buildLeagueList(snapshot) {
  const leagues = snapshot.leagues || {};
  return Object.entries(leagues).map(([sleeperId, ld], i) => {
    const league = ld.league || {};
    return {
      id: i + 1,
      name: league.name || "League",
      sleeper_league_id: sleeperId,
      season: parseInt(league.season, 10) || 2025,
      commissioner: null,
    };
  });
}

function buildTeamNameMap(users) {
  const map = {};
  (users || []).forEach((u) => {
    const teamName = u.metadata?.team_name;
    if (u.user_id && teamName) map[u.user_id] = teamName;
  });
  return map;
}

function buildRosterPlayerPoints(matchups, players) {
  const rosterPoints = {};
  Object.values(matchups || {}).forEach((weekMatchups) => {
    (weekMatchups || []).forEach((m) => {
      const rid = m.roster_id;
      if (!rid) return;
      if (!rosterPoints[rid]) rosterPoints[rid] = {};
      const pp = m.players_points || {};
      Object.entries(pp).forEach(([pid, pts]) => {
        rosterPoints[rid][pid] = (rosterPoints[rid][pid] || 0) + (parseFloat(pts) || 0);
      });
    });
  });
  return rosterPoints;
}

function buildTopThreePlayers(rosterPoints, players) {
  const top = [];
  const sorted = Object.entries(rosterPoints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  sorted.forEach(([pid, score]) => {
    const p = players[pid] || players[String(pid)];
    const name = p ? (p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim()) : "Unknown";
    const pos = p?.position || "?";
    top.push({
      id: pid,
      name,
      position: pos,
      total_points: score,
      avatar_url: `https://sleepercdn.com/content/nfl/players/${pid}.jpg`,
    });
  });
  return top;
}

function getPlayoffRosterIds(ld) {
  const ids = new Set();
  const bracket = ld.winners_bracket || [];
  bracket.forEach((m) => {
    if (m.t1) ids.add(m.t1);
    if (m.t2) ids.add(m.t2);
  });
  return ids;
}

function buildTeamsForLeague(leagueId, sleeperLeagueId, ld, players, leagueIndex) {
  const users = ld.users || [];
  const rosters = ld.rosters || [];
  const matchups = ld.matchups || {};
  const teamNameMap = buildTeamNameMap(users);
  const rosterPlayerPoints = buildRosterPlayerPoints(matchups, players);
  const playoffIds = getPlayoffRosterIds(ld);

  const userByUserId = {};
  users.forEach((u) => {
    userByUserId[u.user_id] = u;
  });

  return rosters.map((r, i) => {
    const ownerId = r.owner_id;
    const user = ownerId ? userByUserId[ownerId] : null;
    const displayName = user?.display_name || "Owner";
    let teamName = teamNameMap[ownerId] || r.metadata?.team_name;
    if (!teamName && user) teamName = `Team ${displayName}`;
    if (!teamName) teamName = "Team Name Not Set";

    const settings = r.settings || {};
    const wins = settings.wins ?? 0;
    const losses = settings.losses ?? 0;
    const ties = settings.ties ?? 0;
    const pointsFor = settings.fpts ?? 0;

    const top3 = buildTopThreePlayers(rosterPlayerPoints[r.roster_id] || {}, players);
    const madePlayoffs = playoffIds.has(r.roster_id);

    return {
      id: leagueIndex * 1000 + r.roster_id,
      owner: {
        id: ownerId || `roster-${r.roster_id}`,
        full_name: displayName,
        payment_info: null,
        has_paid_dues: false,
      },
      league: leagueId,
      sleeper_roster_id: String(r.roster_id),
      team_name: teamName,
      made_league_playoffs: madePlayoffs,
      wins,
      losses,
      ties,
      points_for: String(pointsFor),
      top_three_players: top3,
    };
  }).sort((a, b) => parseFloat(b.points_for) - parseFloat(a.points_for));
}

function buildWeeklyWinners(snapshot, players) {
  const leagues = snapshot.leagues || {};
  const winners = [];
  let maxWeek = 0;

  Object.values(leagues).forEach((ld) => {
    const matchups = ld.matchups || {};
    Object.keys(matchups).forEach((w) => {
      const week = parseInt(w, 10);
      if (week > maxWeek) maxWeek = week;
    });
  });

  if (maxWeek < 1) return winners;

  Object.entries(leagues).forEach(([sleeperId, ld]) => {
    const league = ld.league || {};
    const leagueName = league.name || "League";
    const rosters = ld.rosters || [];
    const users = ld.users || [];
    const teamNameMap = buildTeamNameMap(users);
    const userByUserId = {};
    users.forEach((u) => {
      userByUserId[u.user_id] = u;
    });

    const weekMatchups = ld.matchups?.[String(maxWeek)] || [];
    let topScore = 0;
    weekMatchups.forEach((m) => {
      const pts = parseFloat(m.points) || 0;
      if (pts > topScore) topScore = pts;
    });

    weekMatchups.forEach((m) => {
      const mPts = parseFloat(m.points) || 0;
      if (mPts < topScore) return;

      const roster = rosters.find((r) => r.roster_id === m.roster_id);
      const ownerId = roster?.owner_id;
      const user = ownerId ? userByUserId[ownerId] : null;
      const teamName =
        teamNameMap[ownerId] || roster?.metadata?.team_name || (user ? `Team ${user.display_name}` : "Unknown");

      winners.push({
        week: maxWeek,
        team_name: teamName,
        owner_name: user?.display_name || "Owner",
        league_name: leagueName,
        score: mPts,
      });
    });
  });

  return winners;
}

function buildPowerRankings(snapshot) {
  const leagues = snapshot.leagues || {};
  const allTeams = [];

  Object.entries(leagues).forEach(([sleeperId, ld]) => {
    const league = ld.league || {};
    const leagueName = league.name || "League";
    const rosters = ld.rosters || [];
    const users = ld.users || [];
    const teamNameMap = buildTeamNameMap(users);
    const userByUserId = {};
    users.forEach((u) => {
      userByUserId[u.user_id] = u;
    });

    rosters.forEach((r) => {
      const ownerId = r.owner_id;
      const user = ownerId ? userByUserId[ownerId] : null;
      const teamName =
        teamNameMap[ownerId] || r.metadata?.team_name || (user ? `Team ${user.display_name}` : "Unknown");
      const settings = r.settings || {};
      allTeams.push({
        team_name: teamName,
        owner_name: user?.display_name || "Owner",
        points_for: parseFloat(settings.fpts) || 0,
        league_name: leagueName,
        record: `${settings.wins ?? 0}-${settings.losses ?? 0}-${settings.ties ?? 0}`,
      });
    });
  });

  return allTeams
    .sort((a, b) => b.points_for - a.points_for)
    .slice(0, 5);
}

function buildBigPlayoff(snapshot) {
  const leagues = snapshot.leagues || {};
  const PLAYOFF_START_WEEK = 15;
  const PLAYOFF_END_WEEK = 18;

  // Top 6 by total points_for per league
  const qualifiers = [];
  Object.entries(leagues).forEach(([sleeperId, ld]) => {
    const league = ld.league || {};
    const season = parseInt(league.season, 10) || 2025;
    const rosters = ld.rosters || [];
    const users = ld.users || [];
    const teamNameMap = buildTeamNameMap(users);
    const userByUserId = {};
    users.forEach((u) => { userByUserId[u.user_id] = u; });

    const sorted = [...rosters].sort(
      (a, b) => parseFloat(b.settings?.fpts || 0) - parseFloat(a.settings?.fpts || 0)
    );

    sorted.slice(0, 6).forEach((r) => {
      const ownerId = r.owner_id;
      const user = ownerId ? userByUserId[ownerId] : null;
      const displayName = user?.display_name || 'Owner';
      let teamName = teamNameMap[ownerId] || r.metadata?.team_name;
      if (!teamName && user) teamName = `Team ${displayName}`;
      if (!teamName) teamName = 'Team Name Not Set';
      qualifiers.push({ sleeperId, rosterId: r.roster_id, teamLabel: `${teamName} (${displayName})`, season });
    });
  });

  // Score lookup: sleeperId → week → rosterId → points
  const scoreLookup = {};
  Object.entries(leagues).forEach(([sleeperId, ld]) => {
    scoreLookup[sleeperId] = {};
    for (let w = PLAYOFF_START_WEEK; w <= PLAYOFF_END_WEEK; w++) {
      scoreLookup[sleeperId][w] = {};
      (ld.matchups?.[String(w)] || []).forEach((m) => {
        if (m.roster_id != null) scoreLookup[sleeperId][w][m.roster_id] = parseFloat(m.points) || 0;
      });
    }
  });

  // Simulate elimination rounds
  const allEntries = [];
  let entryId = 1;
  let active = qualifiers.map((q) => ({ ...q }));

  for (let week = PLAYOFF_START_WEEK; week <= PLAYOFF_END_WEEK; week++) {
    if (active.length === 0) break;

    const weekEntries = active
      .map((q) => ({ ...q, weekScore: scoreLookup[q.sleeperId]?.[week]?.[q.rosterId] || 0 }))
      .sort((a, b) => b.weekScore - a.weekScore);

    const numAdvancing = Math.ceil(weekEntries.length / 2);

    weekEntries.forEach((entry, index) => {
      const rank = index + 1;
      allEntries.push({
        id: entryId++,
        team: entry.teamLabel,
        season: entry.season,
        playoff_week: week,
        week_score: entry.weekScore.toFixed(2),
        is_eliminated: rank > numAdvancing,
        final_rank: rank,
      });
    });

    active = weekEntries.slice(0, numAdvancing);
  }

  return allEntries;
}

function buildPlayerAverageScores(snapshot) {
  const playerTotals = {};
  Object.values(snapshot.leagues || {}).forEach((ld) => {
    Object.values(ld.matchups || {}).forEach((weekMatchups) => {
      (weekMatchups || []).forEach((m) => {
        Object.entries(m.players_points || {}).forEach(([pid, pts]) => {
          const score = parseFloat(pts);
          if (score > 0) {
            if (!playerTotals[pid]) playerTotals[pid] = { total: 0, weeks: 0 };
            playerTotals[pid].total += score;
            playerTotals[pid].weeks += 1;
          }
        });
      });
    });
  });
  const averages = {};
  Object.entries(playerTotals).forEach(([pid, { total, weeks }]) => {
    averages[pid] = weeks > 0 ? total / weeks : 0;
  });
  return averages;
}

function buildCommonPlayers(snapshot, players) {
  const leagues = snapshot.leagues || {};
  const playerCounts = {};

  Object.values(leagues).forEach((ld) => {
    const playoffIds = getPlayoffRosterIds(ld);
    const rosters = ld.rosters || [];

    rosters.forEach((r) => {
      if (!playoffIds.has(r.roster_id)) return;
      (r.players || []).forEach((pid) => {
        playerCounts[pid] = (playerCounts[pid] || 0) + 1;
      });
    });
  });

  const sorted = Object.entries(playerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const playerAvgScores = buildPlayerAverageScores(snapshot);
  const result = [];
  let rank = 1;

  sorted.forEach(([pid, count]) => {
    const p = players[pid] || players[String(pid)];
    if (!p) return;
    if (p.position === "DEF") return;

    const name = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();

    result.push({
      rank: rank++,
      player_name: name,
      player_id: pid,
      position: p.position,
      nfl_team: p.team,
      count,
      average_score: playerAvgScores[pid] || 0,
    });
  });

  return result.slice(0, 10);
}

const api = {
  get: async (path) => {
    const snapshot = await getSnapshot();
    const pathNorm = path.replace(/^\//, "");
    const url = new URL(pathNorm, "http://localhost");
    const pathname = url.pathname.replace(/^\/api/, "").replace(/^\//, "");
    const searchParams = url.searchParams;

    // /leagues/
    if (pathname === "leagues/" || pathname === "leagues") {
      const data = buildLeagueList(snapshot);
      return { data };
    }

    // /leagues/:id/
    const leagueDetailMatch = pathname.match(/^leagues\/(\d+)\/?$/);
    if (leagueDetailMatch) {
      const id = parseInt(leagueDetailMatch[1], 10);
      const list = buildLeagueList(snapshot);
      const league = list.find((l) => l.id === id);
      if (!league) return { data: null };
      return { data: league };
    }

    // /teams/?league=X
    if (pathname === "teams/" || pathname === "teams") {
      const leagueId = parseInt(searchParams.get("league"), 10);
      const list = buildLeagueList(snapshot);
      const league = list.find((l) => l.id === leagueId);
      if (!league) return { data: [] };

      const sleeperId = league.sleeper_league_id;
      const ld = snapshot.leagues[sleeperId];
      if (!ld) return { data: [] };

      const leagueIndex = list.findIndex((l) => l.id === leagueId);
      const data = buildTeamsForLeague(
        leagueId,
        sleeperId,
        ld,
        snapshot.players || {},
        leagueIndex
      );
      return { data };
    }

    // /widget/weekly-winner/
    if (pathname.includes("weekly-winner")) {
      const data = buildWeeklyWinners(snapshot, snapshot.players || {});
      return { data };
    }

    // /widget/power-rankings/
    if (pathname.includes("power-rankings")) {
      const data = buildPowerRankings(snapshot);
      return { data };
    }

    // /widget/common-players/
    if (pathname.includes("common-players")) {
      const data = buildCommonPlayers(snapshot, snapshot.players || {});
      return { data };
    }

    // /playoff-entries/
    if (pathname.includes("playoff-entries")) {
      const data = buildBigPlayoff(snapshot);
      return { data };
    }

    return { data: null };
  },

  post: async () => {
    return Promise.reject(
      new Error("Offline mode: Admin commands require the Django backend.")
    );
  },
};

export default api;
