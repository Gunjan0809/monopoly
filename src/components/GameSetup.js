'use client';

import React, { useState, useEffect } from 'react';
import '../styles/setup.css';

const DEFAULT_TOKENS = [
  { icon: '🎩', name: 'Top Hat', color: '#ff4b4b' },
  { icon: '🚗', name: 'Race Car', color: '#00d2ff' },
  { icon: '🐕', name: 'Scottie Dog', color: '#f5c518' },
  { icon: '🚢', name: 'Battleship', color: '#7b2ff7' },
  { icon: '👞', name: 'Boot', color: '#00f2a9' },
  { icon: '🐱', name: 'Cat', color: '#ff758c' },
  { icon: '🚂', name: 'Train', color: '#ff9933' },
  { icon: '✈️', name: 'Aeroplane', color: '#a8ff78' },
];

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function GameSetup({ onBackToHome, onStartGameSession }) {
  // Steps: 'count' -> 'names' -> 'minigame' -> 'results'
  const [step, setStep] = useState('count');
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState([
    { id: 1, name: 'Player 1', token: DEFAULT_TOKENS[0] },
    { id: 2, name: 'Player 2', token: DEFAULT_TOKENS[1] },
    { id: 3, name: 'Player 3', token: DEFAULT_TOKENS[2] },
    { id: 4, name: 'Player 4', token: DEFAULT_TOKENS[3] },
  ]);

  // Mini-game state
  // mysteryCards: array of objects: { id, value (number 1..N), flipped: bool, pickedBy: playerObj | null }
  const [mysteryCards, setMysteryCards] = useState([]);
  const [currentPickerIndex, setCurrentPickerIndex] = useState(0);
  const [lastPickedInfo, setLastPickedInfo] = useState(null);

  // Sync players list when playerCount changes
  const handleCountChange = (count) => {
    const num = Math.max(2, Math.min(8, count));
    setPlayerCount(num);
    setPlayers((prev) => {
      const next = [];
      for (let i = 0; i < num; i++) {
        if (prev[i]) {
          next.push(prev[i]);
        } else {
          next.push({
            id: i + 1,
            name: `Player ${i + 1}`,
            token: DEFAULT_TOKENS[i % DEFAULT_TOKENS.length],
          });
        }
      }
      return next;
    });
  };

  const handleNameChange = (index, value) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: value };
      return updated;
    });
  };

  const handleTokenChange = (index, token) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], token };
      return updated;
    });
  };

  // Initialize and shuffle mystery cards
  const startMiniGame = () => {
    // Generate numbers 1 to playerCount and shuffle them
    const numbers = [];
    for (let i = 1; i <= playerCount; i++) numbers.push(i);
    const shuffled = shuffleArray(numbers);

    const cards = shuffled.map((val, idx) => ({
      cardId: idx,
      number: val,
      flipped: false,
      pickedBy: null,
    }));

    setMysteryCards(cards);
    setCurrentPickerIndex(0);
    setLastPickedInfo(null);
    setStep('minigame');
  };

  // When a player clicks a card in the mini game
  const handleCardClick = (cardIndex) => {
    const card = mysteryCards[cardIndex];
    if (card.flipped) return; // already picked
    if (currentPickerIndex >= players.length) return; // all picked

    const activePlayer = players[currentPickerIndex];

    // Flip this card
    const updatedCards = mysteryCards.map((c, i) => {
      if (i === cardIndex) {
        return {
          ...c,
          flipped: true,
          pickedBy: activePlayer,
        };
      }
      return c;
    });

    setMysteryCards(updatedCards);
    setLastPickedInfo({
      player: activePlayer,
      number: card.number,
    });

    const nextIndex = currentPickerIndex + 1;
    setCurrentPickerIndex(nextIndex);

    // If all players have picked, move to results after a brief moment
    if (nextIndex >= players.length) {
      setTimeout(() => {
        setStep('results');
      }, 1600);
    }
  };

  // Format order suffix (1st, 2nd, 3rd, 4th, etc.)
  const getOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Sorted final results
  const sortedResults = [...mysteryCards]
    .filter((c) => c.pickedBy)
    .sort((a, b) => a.number - b.number);

  return (
    <div className="setup-container">
      {/* Top Header */}
      <div className="setup-nav-bar">
        <button type="button" className="setup-back-btn" onClick={onBackToHome}>
          ← Back to Menu
        </button>
        <div className="setup-steps-indicator">
          <span className={`step-dot ${step === 'count' ? 'active' : ''}`}>1. Players</span>
          <span className="step-arrow">→</span>
          <span className={`step-dot ${step === 'names' ? 'active' : ''}`}>2. Names</span>
          <span className="step-arrow">→</span>
          <span className={`step-dot ${step === 'minigame' ? 'active' : ''}`}>3. Pick Cards</span>
          <span className="step-arrow">→</span>
          <span className={`step-dot ${step === 'results' ? 'active' : ''}`}>4. Turn Order</span>
        </div>
      </div>

      {/* ================= STEP 1: PLAYER COUNT ================= */}
      {step === 'count' && (
        <div className="setup-card glass-panel fade-in">
          <div className="setup-badge">START GAME SETUP</div>
          <h1 className="setup-title">How Many Players?</h1>
          <p className="setup-desc">
            Choose the number of players participating in this Monopoly match (2 to 8 players).
          </p>

          <div className="count-selector-box">
            <div className="count-big-display">
              <span className="count-number">{playerCount}</span>
              <span className="count-label">PLAYERS</span>
            </div>

            <div className="count-chips-grid">
              {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`count-chip ${playerCount === num ? 'active' : ''}`}
                  onClick={() => handleCountChange(num)}
                >
                  {num} Players
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="setup-primary-btn"
            onClick={() => setStep('names')}
          >
            Continue to Player Names →
          </button>
        </div>
      )}

      {/* ================= STEP 2: PLAYER NAMES & TOKENS ================= */}
      {step === 'names' && (
        <div className="setup-card glass-panel fade-in">
          <div className="setup-badge">STEP 2 OF 3</div>
          <h1 className="setup-title">Enter Player Names & Tokens</h1>
          <p className="setup-desc">
            Personalize each player and pick their signature token for the board.
          </p>

          <div className="players-input-list">
            {players.map((p, idx) => (
              <div key={p.id} className="player-input-card">
                <div
                  className="player-token-display"
                  style={{ borderColor: p.token.color }}
                  title="Player Token"
                >
                  <span className="token-emoji">{p.token.icon}</span>
                </div>
                <div className="player-input-fields">
                  <label className="player-field-label">Player {idx + 1}</label>
                  <input
                    type="text"
                    className="player-name-field"
                    value={p.name}
                    placeholder={`Player ${idx + 1}`}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                  />
                </div>
                {/* Token picker mini chips */}
                <div className="token-picker-row">
                  {DEFAULT_TOKENS.map((tok) => (
                    <button
                      key={tok.name}
                      type="button"
                      className={`token-small-btn ${p.token.name === tok.name ? 'selected' : ''}`}
                      onClick={() => handleTokenChange(idx, tok)}
                      title={tok.name}
                    >
                      {tok.icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="setup-action-row">
            <button
              type="button"
              className="setup-secondary-btn"
              onClick={() => setStep('count')}
            >
              ← Back
            </button>
            <button
              type="button"
              className="setup-primary-btn glow-btn"
              onClick={startMiniGame}
            >
              Start Pick-The-Card Mini-Game 🃏
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PICK THE CARD MINI-GAME ================= */}
      {step === 'minigame' && (
        <div className="setup-card glass-panel fade-in minigame-card">
          <div className="setup-badge">TURN ORDER ASSIGNMENT</div>
          <h1 className="setup-title">🃏 Pick The Mystery Card!</h1>
          <p className="setup-desc">
            Each player picks one card. The number on the back determines who plays 1st, 2nd, 3rd, etc.
          </p>

          {/* Active Player Prompt */}
          {currentPickerIndex < players.length ? (
            <div className="active-turn-banner pulse-glow">
              <span className="active-turn-token">
                {players[currentPickerIndex].token.icon}
              </span>
              <div>
                <span className="active-turn-tag">Current Turn:</span>
                <h2 className="active-turn-name">
                  {players[currentPickerIndex].name}, pick your card!
                </h2>
              </div>
            </div>
          ) : (
            <div className="active-turn-banner finished-banner">
              <span className="active-turn-token">🎉</span>
              <div>
                <h2 className="active-turn-name">All players have picked! Calculating sequence...</h2>
              </div>
            </div>
          )}

          {/* Flash feedback for last pick */}
          {lastPickedInfo && (
            <div className="last-pick-feedback fade-in">
              ✨ <strong>{lastPickedInfo.player.name}</strong> drew card{' '}
              <span className="pick-num-badge">#{lastPickedInfo.number}</span> (Plays{' '}
              {getOrdinal(lastPickedInfo.number)}!)
            </div>
          )}

          {/* Face-down cards row */}
          <div className="mystery-cards-grid">
            {mysteryCards.map((card, idx) => {
              const isFlipped = card.flipped;
              const isCurrentPickerAllowed = currentPickerIndex < players.length;

              return (
                <div
                  key={card.cardId}
                  className={`flip-card-wrapper ${isFlipped ? 'flipped' : ''} ${
                    !isFlipped && isCurrentPickerAllowed ? 'clickable' : ''
                  }`}
                  onClick={() => !isFlipped && handleCardClick(idx)}
                >
                  <div className="flip-card-inner">
                    {/* Front Face: Mystery Face Down */}
                    <div className="flip-card-front">
                      <div className="card-mystery-seal">
                        <span className="mystery-icon">❓</span>
                        <span className="mystery-brand">MONOPOLY</span>
                        <span className="mystery-cue">CLICK TO DRAW</span>
                      </div>
                    </div>

                    {/* Back Face: Revealed Number & Player */}
                    <div className="flip-card-back">
                      <div className="revealed-content">
                        <span className="revealed-order-tag">
                          {card.number === 1 ? '👑 1st to play' : `${getOrdinal(card.number)} to play`}
                        </span>
                        <div className="revealed-big-number">#{card.number}</div>
                        {card.pickedBy && (
                          <div className="revealed-player-tag">
                            <span className="tag-icon">{card.pickedBy.token.icon}</span>
                            <span className="tag-name">{card.pickedBy.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="minigame-footer">
            <span className="minigame-hint">
              Cards remaining: {mysteryCards.filter((c) => !c.flipped).length} of {playerCount}
            </span>
            <button
              type="button"
              className="setup-secondary-btn"
              onClick={startMiniGame}
            >
              🔄 Reshuffle Cards
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: FINAL RESULTS ================= */}
      {step === 'results' && (
        <div className="setup-card glass-panel fade-in results-card">
          <div className="setup-badge">FINAL PLAYING SEQUENCE</div>
          <h1 className="setup-title">🏆 Official Turn Order</h1>
          <p className="setup-desc">
            The positions have been decided! Here is the order of play around the Monopoly board:
          </p>

          <div className="results-podium-list">
            {sortedResults.map((item, idx) => {
              const isFirst = item.number === 1;
              return (
                <div
                  key={item.cardId}
                  className={`podium-item ${isFirst ? 'podium-first' : ''}`}
                >
                  <div className="podium-rank-badge">
                    {isFirst ? '👑 #1' : `#${item.number}`}
                  </div>
                  <div className="podium-token">
                    {item.pickedBy.token.icon}
                  </div>
                  <div className="podium-details">
                    <h3 className="podium-player-name">{item.pickedBy.name}</h3>
                    <span className="podium-status">
                      {isFirst ? 'Starts First (Leader)' : `Plays in position ${item.number}`}
                    </span>
                  </div>
                  <div className="podium-order-chip">
                    {getOrdinal(item.number)} Turn
                  </div>
                </div>
              );
            })}
          </div>

          <div className="results-actions-row">
            <button
              type="button"
              className="setup-primary-btn glow-btn"
              onClick={() => {
                if (onStartGameSession) {
                  const finalPlayers = sortedResults.map((r) => ({
                    ...r.pickedBy,
                    turnOrder: r.number,
                  }));
                  onStartGameSession(finalPlayers);
                }
              }}
            >
              Enter Game as Banker 🎲
            </button>
            <button
              type="button"
              className="setup-secondary-btn"
              onClick={startMiniGame}
            >
              🎲 Draw Again
            </button>
            <button
              type="button"
              className="setup-secondary-btn"
              onClick={() => setStep('count')}
            >
              👥 Change Players
            </button>
            <button
              type="button"
              className="setup-secondary-btn"
              onClick={onBackToHome}
            >
              🏠 Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
