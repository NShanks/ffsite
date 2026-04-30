import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchSeasons } from '../api/authApi';
import { LEAGUE_IDS } from '../config';

const SeasonContext = createContext(null);

function deriveSeasonType(season) {
  if (!season) return 'active';
  // Use backend-provided field if available; otherwise derive locally
  if (season.season_type) return season.season_type;
  if (season.league_ids?.length && season.is_active)  return 'active';
  if (season.league_ids?.length && !season.is_active) return 'completed';
  return 'pre_season';
}

export function SeasonProvider({ children }) {
  const [seasons,      setSeasons]      = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    fetchSeasons()
      .then((data) => {
        if (!Array.isArray(data)) return;
        setSeasons(data);
        const active = data.find((s) => s.is_active);
        if (active) setSelectedYear(active.year);
      })
      .catch(() => {
        // No seasons in DB — fall back to hardcoded LEAGUE_IDS
      });
  }, []);

  const selectedSeason = seasons.find((s) => s.year === selectedYear) ?? null;

  // League IDs for the currently selected year.
  // Only falls back to hardcoded LEAGUE_IDS when NO seasons exist in the DB at all
  // (offline / first-run mode). If the selected season has no league_ids (pre-season),
  // returns [] intentionally so DataContext skips the Sleeper fetch.
  const activeLeagueIds = (() => {
    if (seasons.length === 0)              return LEAGUE_IDS; // no DB records → offline fallback
    if (selectedSeason?.league_ids?.length) return selectedSeason.league_ids;
    return [];                                               // pre-season: no data yet
  })();

  const seasonType = seasons.length === 0 ? 'active' : deriveSeasonType(selectedSeason);

  return (
    <SeasonContext.Provider value={{
      seasons, selectedYear, setSelectedYear,
      selectedSeason, activeLeagueIds, seasonType,
    }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  return useContext(SeasonContext);
}
