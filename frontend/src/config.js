// Fallback league IDs — only used when the backend's /api/seasons/ is unreachable
// (e.g. Render cold start). Normally league IDs come from the Season row in the DB.
export const LEAGUE_IDS = [
  '1394384841121759232', // Old Phones
  '1394372015707676672', // WWE Division
  '1394383725634023424', // ESPN 8 The Ocho
  '1394385049104678912', // Pokémon Division
  '1394384149992710144', // Cartoon Villains
  '1394384514641334272', // Animals Division
];

// Kept for reference — these live on the 2025 Season row for the archive view.
export const LEAGUE_IDS_2025 = [
  '1252705424256270336', // Old Phones
  '1252701932896657408', // WWE Division
  '1252704674759315456', // ESPN 8 The Ocho
  '1252705235122520064', // Pokémon Division
  '1252705690842050560', // Cartoon Villains
  '1252704914572849152', // ANIMAL Division
];

export const BIG_PLAYOFF_START_WEEK = 15;
