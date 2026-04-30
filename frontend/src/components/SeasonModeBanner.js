import React, { useState, useEffect } from 'react';
import { useSeason } from '../context/SeasonContext';
import './SeasonModeBanner.css';

export default function SeasonModeBanner() {
  const { seasonType, selectedSeason } = useSeason();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal when the year changes
  useEffect(() => {
    setDismissed(false);
  }, [selectedSeason?.year]);

  if (seasonType === 'active' || dismissed || !selectedSeason) return null;

  const label = selectedSeason.label || String(selectedSeason.year);

  if (seasonType === 'pre_season') {
    return (
      <div className="season-mode-banner banner-preseason">
        <span className="banner-icon">⏳</span>
        <span className="banner-text">{label} — Season preview</span>
        <button className="banner-dismiss" onClick={() => setDismissed(true)}>✕</button>
      </div>
    );
  }

  // completed
  return (
    <div className="season-mode-banner banner-archive">
      <span className="banner-icon">📦</span>
      <span className="banner-text">Viewing the {label} archive</span>
      <button className="banner-dismiss" onClick={() => setDismissed(true)}>✕</button>
    </div>
  );
}
