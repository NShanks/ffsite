const BASE = 'https://api.sleeper.app/v1';

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sleeper API ${res.status}: ${url}`);
  return res.json();
}

/**
 * Fetches all data needed for the app in one shot.
 * After getting NFL state (to determine the current week), all league
 * requests — info, users, rosters, and matchups — fire in parallel.
 */
export async function fetchAllLeagueData(leagueIds, bigPlayoffStartWeek = 15) {
  const nflState = await get(`${BASE}/state/nfl`);
  const currentWeek = nflState.week || nflState.display_week || 0;
  const isOffseason = nflState.season_type === 'off';

  // Which week to use for the "recent scores" widget (cap at 17, regular season only)
  const recentWeek = currentWeek > 0 ? Math.min(currentWeek, 17) : 17;
  // Last week that has matchup data (regular season caps at 17)
  const lastDataWeek = isOffseason ? 17 : Math.min(currentWeek, 17);

  const playoffWeeks =
    lastDataWeek >= bigPlayoffStartWeek
      ? Array.from(
          { length: lastDataWeek - bigPlayoffStartWeek + 1 },
          (_, i) => i + bigPlayoffStartWeek
        )
      : [];

  const leagues = await Promise.all(
    leagueIds.map(async (lid, index) => {
      // Fire every request for this league simultaneously
      const [leagueInfo, users, rosters, recentMatchups, ...playoffResults] =
        await Promise.all([
          get(`${BASE}/league/${lid}`),
          get(`${BASE}/league/${lid}/users`),
          get(`${BASE}/league/${lid}/rosters`),
          get(`${BASE}/league/${lid}/matchups/${recentWeek}`),
          ...playoffWeeks.map((w) => get(`${BASE}/league/${lid}/matchups/${w}`)),
        ]);

      const matchups = {};
      playoffWeeks.forEach((w, i) => {
        matchups[String(w)] = playoffResults[i] || [];
      });

      return {
        sleeperId: lid,
        index,
        name: leagueInfo.name,
        season: parseInt(leagueInfo.season, 10),
        rosterPositions: leagueInfo.roster_positions || [],
        users: users || [],
        rosters: rosters || [],
        recentMatchups: recentMatchups || [],
        recentMatchupWeek: recentWeek,
        matchups,
      };
    })
  );

  return { nflState, currentWeek, isOffseason, recentWeek, leagues };
}

/** Fetches the full NFL player database (~6 MB). Cached by the browser. */
export async function fetchPlayers() {
  return get(`${BASE}/players/nfl`);
}

/** Fetches matchup data for a single league + week. */
export async function fetchMatchupsForWeek(leagueId, week) {
  return get(`${BASE}/league/${leagueId}/matchups/${week}`);
}

/** Fetches player stats for a given season + week (e.g. season=2025, week=10). */
export async function fetchWeekStats(season, week) {
  return get(`${BASE}/stats/nfl/regular/${season}/${week}`);
}

/**
 * Fetches all 17 weeks of matchup data for every league — used for records.
 * Fires all requests in parallel; individual week failures return [] gracefully.
 */
export async function fetchAllWeeksHistory(leagueIds, totalWeeks = 17) {
  return Promise.all(
    leagueIds.map(async (lid) => {
      const weeks = await Promise.all(
        Array.from({ length: totalWeeks }, (_, i) =>
          fetch(`${BASE}/league/${lid}/matchups/${i + 1}`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        )
      );
      return { leagueId: lid, weeks };
    })
  );
}
