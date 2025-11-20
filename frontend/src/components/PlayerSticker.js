import React, { useState } from 'react';
import './PlayerSticker.css';

function PlayerSticker({ player, detail }) {
  // Helper to generate random rotation between -6 and 6 deg
  const getRandomRotation = () => (Math.random() * 20 - 10).toFixed(1);

  // 1. Initialize state with a random number
  const [rotation, setRotation] = useState(getRandomRotation());

  // 2. Handler: When mouse leaves, pick a NEW random number
  // This causes the "Slam" transition to land in a different spot!
  const handleMouseLeave = () => {
    setRotation(getRandomRotation());
  };

  return (
    <div 
      className="sticker-wrapper"
      style={{ "--rotation": `${rotation}deg` }}
      onMouseLeave={handleMouseLeave}
      tabIndex="0"      /* Makes it clickable/focusable */
      role="button"     /* Tells accessibility tools it's a button */
    >
      {/* Background Silhouette */}
      <img 
        src={player.avatar_url} 
        alt="" 
        className="sticker-bg"
      />
      
      {/* Real Photo */}
      <img 
        src={player.avatar_url} 
        alt={player.name} 
        className="sticker-img"
      />

      {/* Tooltip */}
      <div className="sticker-tooltip">
        <strong>{player.name}</strong>
        <span style={{ display: 'block', marginTop: '2px', opacity: 0.8 }}>
          {player.position} • {detail}
        </span>
      </div>
    </div>
  );
}

export default PlayerSticker;