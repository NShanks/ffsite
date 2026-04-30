import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { fetchAllLeagueData, fetchPlayers, fetchAllWeeksHistory } from '../api/sleeperApi';
import { LEAGUE_IDS, BIG_PLAYOFF_START_WEEK } from '../config';
import { useSeason } from './SeasonContext';
import {
  buildTeamsByLeague,
  buildLeagueMatchups,
  buildWeeklyWinners,
  buildPowerRankings,
  buildCommonPlayers,
  buildBigPlayoff,
  buildRecords,
} from '../utils/transforms';
import { useAuth } from './AuthContext';

// Returns true if we're currently inside an NFL game window (ET).
// Used to decide whether to poll every 60 seconds.
function isGameWindow() {
  const etStr = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const et = new Date(etStr);
  const day = et.getDay();   // 0 = Sun, 1 = Mon, 4 = Thu, 6 = Sat
  const hour = et.getHours();
  return (
    (day === 4 && hour >= 19) || // Thursday night
    (day === 0 && hour >= 12) || // Sunday (1 PM kick-offs onward)
    (day === 1 && hour >= 19) || // Monday night
    (day === 6 && hour >= 12)    // Saturday (playoff weeks)
  );
}

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const { activeLeagueIds, selectedYear } = useSeason();
  // SeasonContext now handles the LEAGUE_IDS fallback; never null here.
  // Empty array means a pre-season year is selected — skip all Sleeper fetches.
  const leagueIds = activeLeagueIds;

  const [rawData, setRawData]         = useState(null);
  const [players, setPlayers]         = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchAllLeagueData(leagueIds, BIG_PLAYOFF_START_WEEK);
      setRawData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [leagueIds]);

  // Reload when year changes
  useEffect(() => {
    setRawData(null);
    setHistoryData(null);

    if (leagueIds.length === 0) {
      // Pre-season year selected — no Sleeper data to fetch
      setLoading(false);
      setHistoryLoading(false);
      return;
    }

    setLoading(true);
    loadData();
    setHistoryLoading(true);
    fetchAllWeeksHistory(leagueIds)
      .then(setHistoryData)
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, [selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial player fetch (players DB doesn't change by year)
  useEffect(() => {
    fetchPlayers().then(setPlayers).catch(console.error);
  }, []);

  // Poll every 60 s during game windows; idle otherwise
  useEffect(() => {
    const id = setInterval(() => {
      if (isGameWindow()) loadData();
    }, 60_000);
    return () => clearInterval(id);
  }, [loadData]);

  // All derived data recomputes when rawData, players, or historyData changes
  const derived = useMemo(() => {
    if (!rawData) return {};
    return {
      currentWeek:      rawData.currentWeek,
      isOffseason:      rawData.isOffseason,
      recentWeek:       rawData.recentWeek,
      // Slim league list used for tabs/routing
      leagues: rawData.leagues.map(({ sleeperId, index, name, season, rosterPositions }) => ({
        sleeperId, index, name, season, rosterPositions,
      })),
      // Standings per league; player stickers appear once players DB is loaded
      teamsByLeague: Object.fromEntries(
        rawData.leagues.map((ld) => [ld.sleeperId, buildTeamsByLeague(ld, players)])
      ),
      leagueMatchups:   buildLeagueMatchups(rawData.leagues),
      weeklyWinners:    buildWeeklyWinners(rawData.leagues),
      powerRankings:    buildPowerRankings(rawData.leagues),
      commonPlayers:    buildCommonPlayers(rawData.leagues, players),
      bigPlayoffEntries: buildBigPlayoff(rawData.leagues, BIG_PLAYOFF_START_WEEK),
      records:           historyData ? buildRecords(historyData, rawData.leagues) : null,
      historyLoading,
      // Cross-reference logged-in user's sleeper_id against roster owner_ids
      myIdentity: user?.sleeper_id
        ? rawData.leagues
            .map((ld) => {
              const roster = (ld.rosters || []).find((r) => r.owner_id === user.sleeper_id);
              return roster
                ? { leagueId: ld.sleeperId, leagueIndex: ld.index, rosterId: roster.roster_id }
                : null;
            })
            .filter(Boolean)
        : [],
    };
  }, [rawData, players, historyData, historyLoading, user]);

  return (
    <DataContext.Provider
      value={{ loading, error, lastUpdated, players, refresh: loadData, ...derived }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
