'use client';

import React, { useState, useEffect } from 'react';
import '../styles/game-session.css';

// Color mapper to cleanly display database colors
const normalizeCardColor = (color, type) => {
  if (type === 'station') return '#334155';
  if (type === 'utility') return '#0369a1';
  const c = color ? String(color).toLowerCase().trim() : '';
  const map = {
    brown: '#8B4513',
    blue: '#2563eb',
    pink: '#ec4899',
    orange: '#ff9933',
    '#ff9933': '#ff9933',
    red: '#ef4444',
    yellow: '#eab308',
    green: '#16a34a',
    purple: '#7c3aed',
  };
  return map[c] || color || '#3b82f6';
};

// Enhanced themes matching requested pastel palette
const PLAYER_THEMES = [
  {
    bg: 'linear-gradient(165deg, #adc8f9 0%, #89b4f7 50%, #6fa0ef 100%)',
    glow: 'rgba(111, 160, 239, 0.55)',
    border: 'rgba(255, 255, 255, 0.6)',
    token: '🎩',
  },
  {
    bg: 'linear-gradient(165deg, #bfe7c7 0%, #9ce0a9 50%, #7fd391 100%)',
    glow: 'rgba(127, 211, 145, 0.55)',
    border: 'rgba(255, 255, 255, 0.6)',
    token: '🚗',
  },
  {
    bg: 'linear-gradient(165deg, #fed5a0 0%, #fbbd72 50%, #f2a44b 100%)',
    glow: 'rgba(242, 164, 75, 0.55)',
    border: 'rgba(255, 255, 255, 0.6)',
    token: '🐕',
  },
  {
    bg: 'linear-gradient(165deg, #dabbea 0%, #c597e2 50%, #ae74d8 100%)',
    glow: 'rgba(174, 116, 216, 0.55)',
    border: 'rgba(255, 255, 255, 0.6)',
    token: '🚢',
  },
  {
    bg: 'linear-gradient(165deg, #fca7a7 0%, #f77f7f 50%, #ea5c5c 100%)',
    glow: 'rgba(234, 92, 92, 0.55)',
    border: 'rgba(255, 255, 255, 0.6)',
    token: '👞',
  },
  {
    bg: 'linear-gradient(165deg, #fef08a 0%, #fde047 50%, #eab308 100%)',
    glow: 'rgba(234, 179, 8, 0.55)',
    border: 'rgba(255, 255, 255, 0.6)',
    token: '🐱',
  },
  {
    bg: 'linear-gradient(165deg, #99f6e4 0%, #5eead4 50%, #2dd4bf 100%)',
    glow: 'rgba(45, 212, 191, 0.55)',
    border: 'rgba(255, 255, 255, 0.6)',
    token: '🚂',
  },
  {
    bg: 'linear-gradient(165deg, #fbcfe8 0%, #f472b6 50%, #db2777 100%)',
    glow: 'rgba(219, 39, 119, 0.55)',
    border: 'rgba(255, 255, 255, 0.6)',
    token: '✈️',
  },
];

export default function GameSession({ players, onBackToHome, onRestartSetup }) {
  // Ensure default 5 players if none passed, matching user screenshot
  const gamePlayers = (players && players.length > 0)
    ? players
    : [
        { id: 1, name: 'Player 1' },
        { id: 2, name: 'Player 2' },
        { id: 3, name: 'Player 3' },
        { id: 4, name: 'Player 4' },
        { id: 5, name: 'Player 5' },
      ];

  const [activePlayerIndex, setActivePlayerIndex] = useState(0);

  // When a player box is tapped, this stores their id to open their Portfolio Page
  // null = Main Boxes Stage; number = Portfolio View for that player
  const [viewingPortfolioPlayerId, setViewingPortfolioPlayerId] = useState(null);

  // Real Database Cards State (No placeholders!)
  const [allCards, setAllCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);

  // Ownership state: { [cardId]: { ownerId: playerId, erections: 0..5 } }
  // Starts completely clean with zero placeholders!
  const [ownership, setOwnership] = useState({});

  const [activeModal, setActiveModal] = useState(null); // 'switchPlayer' | 'totalDeck' | 'remainingDeck' | 'trade' | 'loans' | 'log' | 'endGame' | 'addCard' | 'tradeCard'
  const [tradeSelectedCardId, setTradeSelectedCardId] = useState(null);
  const [tradeTargetPlayerId, setTradeTargetPlayerId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [gameLogs, setGameLogs] = useState([
    `Game session initialized with ${gamePlayers.length} players.`,
    `Current turn: ${gamePlayers[0]?.name || 'Player 1'}.`,
  ]);

  // Fetch real properties directly from MongoDB Atlas via /api/properties
  useEffect(() => {
    fetchCardsFromDB();
  }, []);

  const fetchCardsFromDB = async () => {
    try {
      setLoadingCards(true);
      const res = await fetch('/api/properties');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAllCards(data.data);
        setGameLogs((prev) => [
          `Connected to MongoDB Atlas: Loaded ${data.data.length} official properties.`,
          ...prev,
        ]);
      } else {
        console.error('Failed to load properties:', data.error);
      }
    } catch (err) {
      console.error('Error fetching cards from database:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleSwitchPlayer = (index) => {
    setActivePlayerIndex(index);
    setActiveModal(null);
    const pName = gamePlayers[index]?.name || `Player ${index + 1}`;
    setGameLogs((prev) => [`Switched active turn to ${pName}.`, ...prev]);
    showToast(`Turn switched to ${pName}`);
  };

  // ================= ASSET VALUE CALCULATION =================
  // Formula specified by user: 0.9 * (land value + no of erections * erection cost)
  const calculatePlayerAssetValue = (playerId) => {
    let rawTotal = 0;
    allCards.forEach((card) => {
      const own = ownership[card._id];
      if (own && own.ownerId === playerId) {
        const landValue = Number(card.buyingCost) || 0;
        const erectionCount = Number(own.erections) || 0;
        const erectionCost = Number(card.buildingCost) || 0;
        rawTotal += landValue + (erectionCount * erectionCost);
      }
    });
    return Math.round(0.9 * rawTotal);
  };

  // Calculate rent for a card given its erection level from DB fields
  const getCardCurrentRent = (card, erections = 0) => {
    if (card.type === 'station') {
      const base = Number(card.rent1) || Number(card.baseRent) || 25;
      return base * Math.max(1, erections);
    }
    if (card.type === 'utility') {
      const base = Number(card.baseRent) || 10;
      return base * (erections > 0 ? 10 : 4);
    }
    if (erections === 0) return Number(card.baseRent) || Number(card.rent1) || 0;
    if (erections === 1) return Number(card.rent1) || (Number(card.baseRent) * 5) || 0;
    if (erections === 2) return Number(card.rent2) || (Number(card.rent1) * 3) || 0;
    if (erections === 3) return Number(card.rent3) || (Number(card.rent2) * 3) || 0;
    if (erections === 4) return Number(card.rent4) || (Number(card.rent3) * 1.5) || 0;
    if (erections === 5) return Number(card.hotelRent) || (Number(card.rent4) * 1.5) || 0;
    return Number(card.baseRent) || 0;
  };

  // Add Card to Player Portfolio
  const handleAddCardToPlayer = (cardId, playerId) => {
    setOwnership((prev) => ({
      ...prev,
      [cardId]: { ownerId: playerId, erections: 0 },
    }));
    const card = allCards.find((c) => c._id === cardId);
    const player = gamePlayers.find((p) => p.id === playerId);
    setGameLogs((prev) => [`Banker granted ${card?.name} to ${player?.name}.`, ...prev]);
    showToast(`Added ${card?.name} to ${player?.name}`);
    setActiveModal(null);
  };

  // Take Back Card from Player to Bank
  const handleTakeBackCard = (cardId) => {
    const card = allCards.find((c) => c._id === cardId);
    const currentOwner = gamePlayers.find((p) => p.id === ownership[cardId]?.ownerId);
    setOwnership((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
    setGameLogs((prev) => [`Banker took back ${card?.name} from ${currentOwner?.name} to Bank Vault.`, ...prev]);
    showToast(`Returned ${card?.name} to Bank Vault`);
  };

  // Trade Card from Player to Another Player
  const handleTradeCard = (cardId, toPlayerId) => {
    if (!toPlayerId) return;
    const card = allCards.find((c) => c._id === cardId);
    const fromPlayer = gamePlayers.find((p) => p.id === ownership[cardId]?.ownerId);
    const toPlayer = gamePlayers.find((p) => p.id === Number(toPlayerId));

    setOwnership((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], ownerId: Number(toPlayerId) },
    }));

    setGameLogs((prev) => [`Traded ${card?.name} from ${fromPlayer?.name} to ${toPlayer?.name}.`, ...prev]);
    showToast(`Traded ${card?.name} to ${toPlayer?.name}!`);
    setActiveModal(null);
    setTradeSelectedCardId(null);
    setTradeTargetPlayerId(null);
  };

  // Increment/Decrement Erections on a card
  const handleUpdateErections = (cardId, delta) => {
    const current = ownership[cardId]?.erections || 0;
    const nextVal = Math.max(0, Math.min(5, current + delta));
    setOwnership((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], erections: nextVal },
    }));
    const label = nextVal === 5 ? 'Hotel' : `${nextVal} houses`;
    showToast(`Updated to ${label}`);
  };

  // Unowned cards in Bank Vault
  const remainingCards = allCards.filter((card) => !ownership[card._id]);
  const activePlayer = gamePlayers[activePlayerIndex] || gamePlayers[0];
  const portfolioPlayer = gamePlayers.find((p) => p.id === viewingPortfolioPlayerId);
  const portfolioCards = allCards.filter((card) => ownership[card._id]?.ownerId === viewingPortfolioPlayerId);

  return (
    <div className="mobile-game-wrapper">
      {/* Background ambient lighting */}
      <div className="ambient-backdrop-glow glow-top" />
      <div className="ambient-backdrop-glow glow-bottom" />

      {/* =========================================================================
          VIEW A: MAIN PLAYER BOXES ARENA (When viewingPortfolioPlayerId is null)
          ========================================================================= */}
      {viewingPortfolioPlayerId === null && (
        <>
          {/* FLOATING GLASS NAVBAR */}
          <nav className="game-navbar-wrapper">
            <div className="game-navbar">
              <button
                type="button"
                className="nav-item-btn"
                onClick={() => setActiveModal('switchPlayer')}
                title="Switch Active Player"
              >
                <span className="nav-icon">🔄</span>
                <span>Switch Player</span>
              </button>

              <button
                type="button"
                className="nav-item-btn"
                onClick={() => setActiveModal('totalDeck')}
                title="View Total Deck"
              >
                <span className="nav-icon">🎴</span>
                <span>Total Deck ({allCards.length})</span>
              </button>

              <button
                type="button"
                className="nav-item-btn"
                onClick={() => setActiveModal('remainingDeck')}
                title="View Remaining Deck"
              >
                <span className="nav-icon">🏦</span>
                <span>Remaining Deck ({remainingCards.length})</span>
              </button>

              <button
                type="button"
                className="nav-item-btn nav-btn-locked"
                onClick={() => showToast('🔒 Trade feature is locked (Coming soon)')}
                title="Trade Properties (Locked)"
              >
                <span className="nav-icon">🤝</span>
                <span>Trade (Locked)</span>
              </button>

              <button
                type="button"
                className="nav-item-btn"
                onClick={() => setActiveModal('loans')}
                title="Bank Loans"
              >
                <span className="nav-icon">💰</span>
                <span>Loans</span>
              </button>

              <button
                type="button"
                className="nav-item-btn"
                onClick={() => setActiveModal('log')}
                title="Game Logs"
              >
                <span className="nav-icon">📋</span>
                <span>Log</span>
              </button>

              <button
                type="button"
                className="nav-item-btn nav-btn-end"
                onClick={() => setActiveModal('endGame')}
                title="End Game Session"
              >
                <span className="nav-icon">🚪</span>
                <span>End Game</span>
              </button>
            </div>
          </nav>

          {/* MAIN PLAYER BOXES CONTAINER (Tap opens Portfolio!) */}
          <main className="player-boxes-stage" style={{ '--player-count': gamePlayers.length }}>
            <div className="cards-deck-container">
              {gamePlayers.map((player, index) => {
                const theme = PLAYER_THEMES[index % PLAYER_THEMES.length];
                const isActive = index === activePlayerIndex;
                const assetVal = calculatePlayerAssetValue(player.id);
                const cardCount = allCards.filter((c) => ownership[c._id]?.ownerId === player.id).length;

                return (
                  <div
                    key={player.id || index}
                    className={`player-box-card ${isActive ? 'is-active-turn' : ''}`}
                    style={{
                      background: theme.bg,
                      '--card-glow': theme.glow,
                    }}
                    onClick={() => {
                      // Tap box to open this player's portfolio page!
                      setViewingPortfolioPlayerId(player.id);
                    }}
                    title={`Tap to view ${player.name}'s Portfolio`}
                  >
                    {/* Glossy Reflection Sheen */}
                    <div className="card-sheen-glare" />

                    {/* Card Header */}
                    <div className="card-header-accent">
                      <span className="card-token-icon">
                        {player.token?.icon || theme.token}
                      </span>
                      {isActive && (
                        <span className="card-active-pill">
                          👑 TURN
                        </span>
                      )}
                    </div>

                    {/* Player Name Centerpiece */}
                    <div className="card-name-wrapper">
                      <h2 className="player-box-name">{player.name}</h2>
                      <span className="card-preview-subtitle">
                        {cardCount} Deeds • ₹{assetVal} Asset
                      </span>
                    </div>

                    {/* Tap hint footer */}
                    <div className="card-footer-groove">
                      <span className="tap-portfolio-hint">Tap for Portfolio →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </>
      )}

      {/* =========================================================================
          VIEW B: DEDICATED PLAYER PORTFOLIO SCREEN (When viewingPortfolioPlayerId is set)
          ========================================================================= */}
      {viewingPortfolioPlayerId !== null && portfolioPlayer && (
        <div className="portfolio-screen-view">
          {/* PORTFOLIO TOP NAVBAR */}
          <nav className="portfolio-navbar">
            <button
              type="button"
              className="portfolio-back-btn"
              onClick={() => setViewingPortfolioPlayerId(null)}
              title="Return to Main Board"
            >
              ← Back
            </button>

            {/* Player Switcher Chips */}
            <div className="portfolio-player-pill">
              <span className="player-pill-token">
                {portfolioPlayer.token?.icon || '👤'}
              </span>
              <span className="player-pill-name">{portfolioPlayer.name}</span>
            </div>

            {/* Asset Value Tag: 0.9 * (land + erections * buildingCost) */}
            <div className="portfolio-asset-tag">
              <span className="asset-tag-label">0.9x Asset Value</span>
              <span className="asset-tag-value">
                ₹{calculatePlayerAssetValue(portfolioPlayer.id)}
              </span>
            </div>

            {/* Banker Actions in Navbar */}
            <div className="portfolio-navbar-actions">
              <button
                type="button"
                className="portfolio-nav-action-btn btn-add-card"
                onClick={() => setActiveModal('addCard')}
                title="Banker: Add Property from Database to Portfolio"
              >
                ➕ Add Card
              </button>

              <button
                type="button"
                className="portfolio-nav-action-btn"
                onClick={() => {
                  if (portfolioCards.length === 0) {
                    showToast('No cards to trade in this portfolio!');
                  } else {
                    setActiveModal('tradeCard');
                  }
                }}
                title="Trade a card to another player"
              >
                🔄 Trade Card
              </button>
            </div>
          </nav>

          {/* MAIN SCREEN: CAROUSEL OF CARDS OWNED BY THIS PLAYER */}
          <main className="portfolio-carousel-stage">
            {loadingCards ? (
              <div className="portfolio-empty-state">
                <div className="empty-state-icon">⏳</div>
                <h3>Loading Database Properties...</h3>
                <p>Connecting securely to MongoDB Atlas...</p>
              </div>
            ) : portfolioCards.length === 0 ? (
              <div className="portfolio-empty-state">
                <div className="empty-state-icon">📜</div>
                <h3>{portfolioPlayer.name} Has No Deeds Yet</h3>
                <p>The banker can grant available properties from the Bank Vault ({remainingCards.length} in vault).</p>
                <button
                  type="button"
                  className="empty-state-add-btn"
                  onClick={() => setActiveModal('addCard')}
                >
                  ➕ Add First Property
                </button>
              </div>
            ) : (
              <div className="deeds-carousel-track">
                {portfolioCards.map((card) => {
                  const cardOwn = ownership[card._id] || { erections: 0 };
                  const erections = cardOwn.erections || 0;
                  const currentRent = getCardCurrentRent(card, erections);
                  const canErect = card.type === 'property' && (Number(card.buildingCost) || 0) > 0;
                  const erectionCost = Number(card.buildingCost) || 0;
                  const singleCardAssetVal = Math.round(0.9 * ((Number(card.buyingCost) || 0) + (erections * erectionCost)));
                  const bannerColor = normalizeCardColor(card.color, card.type);

                  return (
                    <div key={card._id} className="deed-carousel-card">
                      {/* Top Color Banner */}
                      <div
                        className="deed-card-banner"
                        style={{ backgroundColor: bannerColor }}
                      >
                        <span className="banner-type-tag">
                          {card.type === 'station' ? '🚂 RAILWAY STATION' : card.type === 'utility' ? '⚡ UTILITY' : 'TITLE DEED'}
                        </span>
                        <h3 className="banner-card-name">{card.name}</h3>
                      </div>

                      {/* Card Content Body */}
                      <div className="deed-card-body">
                        {/* Current Rent Highlight */}
                        <div className="deed-rent-box">
                          <span className="rent-box-label">CURRENT RENT</span>
                          <span className="rent-box-amount">₹{currentRent}</span>
                        </div>

                        {/* Erection Stepper (Houses / Hotel) */}
                        {canErect && (
                          <div className="deed-erection-section">
                            <div className="erection-title-row">
                              <span className="erection-label">Houses / Hotel:</span>
                              <span className="erection-cost-hint">₹{erectionCost}/house</span>
                            </div>

                            <div className="erection-stepper">
                              <button
                                type="button"
                                className="stepper-btn"
                                onClick={() => handleUpdateErections(card._id, -1)}
                                disabled={erections <= 0}
                              >
                                –
                              </button>

                              <div className="stepper-indicator">
                                {erections === 0 && <span className="erection-zero">Plot Only</span>}
                                {erections > 0 && erections < 5 && (
                                  <span className="erection-houses">
                                    {'🏠'.repeat(erections)} ({erections}H)
                                  </span>
                                )}
                                {erections === 5 && (
                                  <span className="erection-hotel">🏨 Hotel</span>
                                )}
                              </div>

                              <button
                                type="button"
                                className="stepper-btn"
                                onClick={() => handleUpdateErections(card._id, 1)}
                                disabled={erections >= 5}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Single Card 0.9x Asset Breakdown */}
                        <div className="deed-asset-breakdown">
                          <span>Deed Asset: <strong>₹{singleCardAssetVal}</strong></span>
                          <span className="formula-hint">0.9×(₹{card.buyingCost} + {erections}×₹{erectionCost})</span>
                        </div>

                        {/* Action Buttons: Trade & Return to Bank */}
                        <div className="deed-card-actions">
                          <button
                            type="button"
                            className="deed-action-btn btn-trade"
                            onClick={() => {
                              setTradeSelectedCardId(card._id);
                              setActiveModal('tradeCard');
                            }}
                          >
                            🤝 Trade Card
                          </button>

                          <button
                            type="button"
                            className="deed-action-btn btn-takeback"
                            onClick={() => handleTakeBackCard(card._id)}
                            title="Banker takes card back to Bank Vault"
                          >
                            🏦 Return to Bank
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      )}

      {/* ================= TOAST NOTIFICATION ================= */}
      {toastMessage && (
        <div className="floating-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= MODAL: ADD CARD TO PORTFOLIO FROM DB ================= */}
      {activeModal === 'addCard' && viewingPortfolioPlayerId && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Database Deed to {portfolioPlayer?.name}&rsquo;s Portfolio</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>
            <p className="modal-description">
              Select any available property from the Bank Vault ({remainingCards.length} remaining in DB):
            </p>

            {remainingCards.length === 0 ? (
              <div className="modal-empty-state">No unowned cards remaining in the Bank Vault!</div>
            ) : (
              <div className="modal-cards-grid">
                {remainingCards.map((card) => {
                  const bColor = normalizeCardColor(card.color, card.type);
                  return (
                    <div
                      key={card._id}
                      className="deck-card-item card-clickable"
                      onClick={() => handleAddCardToPlayer(card._id, viewingPortfolioPlayerId)}
                    >
                      <div className="card-color-strip" style={{ backgroundColor: bColor }} />
                      <div className="deck-card-info">
                        <span className="card-name">{card.name}</span>
                        <span className="card-cost">₹{card.buyingCost}</span>
                      </div>
                      <span className="card-rent">Rent: ₹{card.baseRent || card.rent1 || 0}</span>
                      <button type="button" className="card-claim-chip">
                        + Add to {portfolioPlayer?.name}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: TRADE CARD TO ANOTHER PLAYER ================= */}
      {activeModal === 'tradeCard' && viewingPortfolioPlayerId && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Trade Property from {portfolioPlayer?.name}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>
            <p className="modal-description">
              Select the deed to transfer and the receiving player:
            </p>

            {/* Select Card to trade */}
            <div className="trade-select-group">
              <label>1. Select Deed to Trade:</label>
              <select
                className="trade-dropdown"
                value={tradeSelectedCardId || (portfolioCards[0]?._id || '')}
                onChange={(e) => setTradeSelectedCardId(e.target.value)}
              >
                {portfolioCards.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} (Value: ₹{c.buyingCost})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Target Player */}
            <div className="trade-select-group">
              <label>2. Transfer To Player:</label>
              <select
                className="trade-dropdown"
                value={tradeTargetPlayerId || ''}
                onChange={(e) => setTradeTargetPlayerId(e.target.value)}
              >
                <option value="" disabled>Select Target Player...</option>
                {gamePlayers
                  .filter((p) => p.id !== viewingPortfolioPlayerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.token?.icon || '👤'} {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="trade-actions-row">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm-trade"
                disabled={!tradeTargetPlayerId}
                onClick={() => {
                  const cardId = tradeSelectedCardId || portfolioCards[0]?._id;
                  handleTradeCard(cardId, tradeTargetPlayerId);
                }}
              >
                Complete Trade 🤝
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SWITCH PLAYER ================= */}
      {activeModal === 'switchPlayer' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Switch Active Player</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>
            <p className="modal-description">Select the player whose turn it is now:</p>
            <div className="modal-players-list">
              {gamePlayers.map((p, idx) => {
                const theme = PLAYER_THEMES[idx % PLAYER_THEMES.length];
                return (
                  <button
                    key={p.id || idx}
                    type="button"
                    className={`modal-player-choice ${idx === activePlayerIndex ? 'current-active' : ''}`}
                    style={{ borderLeftColor: theme.glow }}
                    onClick={() => handleSwitchPlayer(idx)}
                  >
                    <span className="choice-name">
                      {p.token?.icon || theme.token} {p.name}
                    </span>
                    {idx === activePlayerIndex && <span className="active-badge">Current Turn</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TOTAL DECK (FROM DB) ================= */}
      {activeModal === 'totalDeck' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Official Database Card Deck ({allCards.length})</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>
            <p className="modal-description">All properties loaded from MongoDB Atlas:</p>
            <div className="modal-cards-grid">
              {allCards.map((card) => {
                const owner = gamePlayers.find((p) => p.id === ownership[card._id]?.ownerId);
                const bColor = normalizeCardColor(card.color, card.type);
                return (
                  <div key={card._id} className="deck-card-item">
                    <div className="card-color-strip" style={{ backgroundColor: bColor }} />
                    <div className="deck-card-info">
                      <span className="card-name">{card.name}</span>
                      <span className="card-cost">₹{card.buyingCost}</span>
                    </div>
                    <span className="card-rent">Rent: ₹{card.baseRent || card.rent1 || 0}</span>
                    <span className="card-owner-tag">
                      {owner ? `Owned by ${owner.name}` : 'In Bank Vault'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REMAINING DECK (FROM DB) ================= */}
      {activeModal === 'remainingDeck' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Remaining Bank Deck ({remainingCards.length})</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>
            <p className="modal-description">Unowned property cards currently held in Bank Vault:</p>
            {remainingCards.length === 0 ? (
              <div className="modal-empty-state">All database properties are currently owned by players!</div>
            ) : (
              <div className="modal-cards-grid">
                {remainingCards.map((card) => {
                  const bColor = normalizeCardColor(card.color, card.type);
                  return (
                    <div key={card._id} className="deck-card-item">
                      <div className="card-color-strip" style={{ backgroundColor: bColor }} />
                      <div className="deck-card-info">
                        <span className="card-name">{card.name}</span>
                        <span className="card-cost">₹{card.buyingCost}</span>
                      </div>
                      <span className="card-rent">Rent: ₹{card.baseRent || card.rent1 || 0}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: LOANS ================= */}
      {activeModal === 'loans' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bank Loans</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>
            <p className="modal-description">
              Borrow capital from the Bank against your mortgaged deeds.
            </p>
            <div className="loan-placeholder-panel">
              <div className="loan-icon">🏦</div>
              <h4>Bank Lending Desk</h4>
              <p>Player: <strong>{activePlayer.name}</strong></p>
              <p className="loan-note">
                Loan interest rate: 10% on repayment.<br />
                Mortgage properties to release 50% property value.
              </p>
              <button
                type="button"
                className="loan-action-btn"
                onClick={() => {
                  showToast('Loan desk feature will be connected in next phase!');
                  setActiveModal(null);
                }}
              >
                Request ₹500 Emergency Cash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: GAME LOG ================= */}
      {activeModal === 'log' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Game Activity Log</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>
            <div className="log-entries-list">
              {gameLogs.map((entry, idx) => (
                <div key={idx} className="log-entry-item">
                  <span className="log-bullet">•</span>
                  <span className="log-text">{entry}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: END GAME ================= */}
      {activeModal === 'endGame' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>End Game Session?</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>
            <p className="modal-description">
              Are you sure you want to exit the current Monopoly game session?
            </p>
            <div className="end-game-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setActiveModal(null)}
              >
                Keep Playing
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (onBackToHome) onBackToHome();
                  else if (onRestartSetup) onRestartSetup();
                }}
              >
                Exit to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
