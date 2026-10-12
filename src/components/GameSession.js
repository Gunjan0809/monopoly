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

  // Loan state: { [playerId]: { hasActiveLoan: bool, principal: 500, interest: 25, totalDue: 525 } }
  const [loans, setLoans] = useState({});

  // Active modal: 'switchPlayer' | 'totalDeck' | 'remainingDeck' | 'loans' | 'log' | 'endGame' | 'addCard' | 'tradeDesk'
  const [activeModal, setActiveModal] = useState(null);

  // Trade Desk State
  const [tradePlayer1Id, setTradePlayer1Id] = useState(null);
  const [tradePlayer2Id, setTradePlayer2Id] = useState(null);
  const [tradeOfferedCards1, setTradeOfferedCards1] = useState([]); // Array of card IDs from Player 1
  const [tradeOfferedCards2, setTradeOfferedCards2] = useState([]); // Array of card IDs from Player 2
  const [isTradeAnimating, setIsTradeAnimating] = useState(false);

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

  // ================= LOAN SYSTEM LOGIC =================
  // Rule: Max ₹500 loan. Once given, limit is OVER. Next loan only allowed after repaying with 5% interest (₹525 total).
  const handleGrantLoan = (playerId) => {
    const player = gamePlayers.find((p) => p.id === playerId);
    if (loans[playerId]?.hasActiveLoan) {
      showToast(`Cannot issue loan: ${player?.name} already has an active loan limit!`);
      return;
    }
    setLoans((prev) => ({
      ...prev,
      [playerId]: {
        hasActiveLoan: true,
        principal: 500,
        interest: 25, // 5% of 500
        totalDue: 525,
      },
    }));
    setGameLogs((prev) => [
      `🏦 Bank granted ₹500 loan to ${player?.name}. (Limit reached. Repayment due: ₹525 with 5% interest)`,
      ...prev,
    ]);
    showToast(`₹500 loan approved for ${player?.name}!`);
  };

  const handleRepayLoan = (playerId) => {
    const player = gamePlayers.find((p) => p.id === playerId);
    if (!loans[playerId]?.hasActiveLoan) {
      showToast(`${player?.name} has no outstanding loans.`);
      return;
    }
    setLoans((prev) => ({
      ...prev,
      [playerId]: {
        hasActiveLoan: false,
        principal: 0,
        interest: 0,
        totalDue: 0,
      },
    }));
    setGameLogs((prev) => [
      `💳 ${player?.name} repaid full loan of ₹525 (₹500 principal + ₹25 5% interest). Loan limit restored!`,
      ...prev,
    ]);
    showToast(`Loan repaid! ₹500 limit restored for ${player?.name}.`);
  };

  // ================= TRADE DESK LOGIC =================
  // Toggle card selection in Player 1's trade box
  const toggleTradeCard1 = (cardId) => {
    setTradeOfferedCards1((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // Toggle card selection in Player 2's trade box
  const toggleTradeCard2 = (cardId) => {
    setTradeOfferedCards2((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // Direct 1-tap trade from Player 1 to Player 2
  const handleQuickSendToPlayer2 = (cardId) => {
    if (!tradePlayer2Id) {
      showToast('Select Trader 2 first!');
      return;
    }
    const card = allCards.find((c) => c._id === cardId);
    const p1 = gamePlayers.find((p) => p.id === tradePlayer1Id);
    const p2 = gamePlayers.find((p) => p.id === tradePlayer2Id);

    setOwnership((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], ownerId: tradePlayer2Id },
    }));

    setTradeOfferedCards1((prev) => prev.filter((id) => id !== cardId));
    setGameLogs((prev) => [`🤝 Trade: ${p1?.name} gave ${card?.name} to ${p2?.name}.`, ...prev]);
    showToast(`Transferred ${card?.name} to ${p2?.name}!`);
  };

  // Direct 1-tap trade from Player 2 to Player 1
  const handleQuickSendToPlayer1 = (cardId) => {
    if (!tradePlayer1Id) {
      showToast('Select Trader 1 first!');
      return;
    }
    const card = allCards.find((c) => c._id === cardId);
    const p1 = gamePlayers.find((p) => p.id === tradePlayer1Id);
    const p2 = gamePlayers.find((p) => p.id === tradePlayer2Id);

    setOwnership((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], ownerId: tradePlayer1Id },
    }));

    setTradeOfferedCards2((prev) => prev.filter((id) => id !== cardId));
    setGameLogs((prev) => [`🤝 Trade: ${p2?.name} gave ${card?.name} to ${p1?.name}.`, ...prev]);
    showToast(`Transferred ${card?.name} to ${p1?.name}!`);
  };

  // Execute full bilateral or unilateral trade of all selected cards
  const handleExecuteTrade = () => {
    if (!tradePlayer1Id || !tradePlayer2Id) {
      showToast('Please select both traders to execute trade.');
      return;
    }
    if (tradePlayer1Id === tradePlayer2Id) {
      showToast('Cannot trade between the same player.');
      return;
    }
    if (tradeOfferedCards1.length === 0 && tradeOfferedCards2.length === 0) {
      showToast('Select at least one deed from either trader to transfer.');
      return;
    }

    const p1 = gamePlayers.find((p) => p.id === tradePlayer1Id);
    const p2 = gamePlayers.find((p) => p.id === tradePlayer2Id);

    setIsTradeAnimating(true);

    setTimeout(() => {
      setOwnership((prev) => {
        const next = { ...prev };
        // Transfer all Player 1 selected cards to Player 2
        tradeOfferedCards1.forEach((cId) => {
          if (next[cId]) next[cId] = { ...next[cId], ownerId: tradePlayer2Id };
        });
        // Transfer all Player 2 selected cards to Player 1
        tradeOfferedCards2.forEach((cId) => {
          if (next[cId]) next[cId] = { ...next[cId], ownerId: tradePlayer1Id };
        });
        return next;
      });

      const cards1Names = allCards
        .filter((c) => tradeOfferedCards1.includes(c._id))
        .map((c) => c.name)
        .join(', ');
      const cards2Names = allCards
        .filter((c) => tradeOfferedCards2.includes(c._id))
        .map((c) => c.name)
        .join(', ');

      setGameLogs((prev) => [
        `🤝 Multi-Trade Completed between ${p1?.name} & ${p2?.name}: [${cards1Names || 'None'}] ⇄ [${cards2Names || 'None'}].`,
        ...prev,
      ]);

      setTradeOfferedCards1([]);
      setTradeOfferedCards2([]);
      setIsTradeAnimating(false);
      showToast(`Trade completed successfully! Deeds transferred.`);
    }, 600);
  };

  // Helper arrays
  const remainingCards = allCards.filter((card) => !ownership[card._id]);
  const activePlayer = gamePlayers[activePlayerIndex] || gamePlayers[0];
  const portfolioPlayer = gamePlayers.find((p) => p.id === viewingPortfolioPlayerId);
  const portfolioCards = allCards.filter((card) => ownership[card._id]?.ownerId === viewingPortfolioPlayerId);

  // Trade Desk Party Cards
  const trader1 = gamePlayers.find((p) => p.id === tradePlayer1Id);
  const trader2 = gamePlayers.find((p) => p.id === tradePlayer2Id);
  const trader1Cards = allCards.filter((card) => ownership[card._id]?.ownerId === tradePlayer1Id);
  const trader2Cards = allCards.filter((card) => ownership[card._id]?.ownerId === tradePlayer2Id);

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

              {/* Trade Desk Button */}
              <button
                type="button"
                className="nav-item-btn nav-btn-trade"
                onClick={() => setActiveModal('tradeDesk')}
                title="Open Bank Trade Desk"
              >
                <span className="nav-icon">🤝</span>
                <span>Trade Desk</span>
              </button>

              {/* Loans Button */}
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
                const playerLoan = loans[player.id];

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
                      {playerLoan?.hasActiveLoan && (
                        <span className="card-loan-active-badge" title="Active ₹525 Loan Due">
                          💰 LOAN
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
                  setTradePlayer1Id(portfolioPlayer.id);
                  setActiveModal('tradeDesk');
                }}
                title="Trade properties in Trade Desk"
              >
                🤝 Trade Desk
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
                              setTradePlayer1Id(portfolioPlayer.id);
                              setTradeOfferedCards1([card._id]);
                              setActiveModal('tradeDesk');
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

      {/* =========================================================================
          MODAL: TWO-BOX TRADE DESK (WITH VERTICAL CAROUSELS & SWAP ANIMATION)
          ========================================================================= */}
      {activeModal === 'tradeDesk' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content trade-desk-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header trade-modal-header">
              <div>
                <h3 className="trade-modal-title">🤝 Bank Property Trade Desk</h3>
                <p className="trade-modal-sub">
                  Select both traders to view their vertical card decks. Offer cards from either or both parties!
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>

            {/* TWO TRADING BOXES CONTAINER */}
            <div className={`trade-pods-grid ${isTradeAnimating ? 'trade-swapping-glow' : ''}`}>
              {/* ================= TRADER 1 BOX ================= */}
              <div className="trade-party-pod pod-left">
                {/* Header or Placeholder */}
                {trader1 ? (
                  <div className="trade-pod-header">
                    <div className="pod-header-user">
                      <span className="pod-avatar">{trader1.token?.icon || '👤'}</span>
                      <div>
                        <h4 className="pod-player-name">{trader1.name}</h4>
                        <span className="pod-card-counter">{trader1Cards.length} Properties</span>
                      </div>
                    </div>
                    <select
                      className="pod-change-select"
                      value={tradePlayer1Id || ''}
                      onChange={(e) => {
                        setTradePlayer1Id(Number(e.target.value));
                        setTradeOfferedCards1([]);
                      }}
                    >
                      {gamePlayers.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.id === tradePlayer2Id}>
                          {p.token?.icon} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="trade-pod-placeholder">
                    <div className="placeholder-icon">👤</div>
                    <h4>Trader 1 Placeholder</h4>
                    <p>Select first party for trade</p>
                    <select
                      className="placeholder-player-select"
                      value=""
                      onChange={(e) => {
                        setTradePlayer1Id(Number(e.target.value));
                        setTradeOfferedCards1([]);
                      }}
                    >
                      <option value="" disabled>Select Trader 1...</option>
                      {gamePlayers
                        .filter((p) => p.id !== tradePlayer2Id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.token?.icon} {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Vertical Carousel of Trader 1's Cards */}
                {trader1 && (
                  <div className="trade-vertical-carousel">
                    {trader1Cards.length === 0 ? (
                      <div className="pod-empty-cards">
                        <span>No deeds owned by {trader1.name}.</span>
                      </div>
                    ) : (
                      trader1Cards.map((card) => {
                        const isOffered = tradeOfferedCards1.includes(card._id);
                        const bColor = normalizeCardColor(card.color, card.type);
                        const own = ownership[card._id] || { erections: 0 };

                        return (
                          <div
                            key={card._id}
                            className={`vertical-trade-card ${isOffered ? 'card-offered' : ''}`}
                            onClick={() => toggleTradeCard1(card._id)}
                          >
                            <div className="v-card-strip" style={{ backgroundColor: bColor }} />
                            <div className="v-card-details">
                              <span className="v-card-title">{card.name}</span>
                              <span className="v-card-sub">
                                Buy: ₹{card.buyingCost} • Base: ₹{card.baseRent || card.rent1 || 0}
                                {own.erections > 0 && ` • (${own.erections}H)`}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={`v-offer-toggle-btn ${isOffered ? 'btn-active-offer' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTradeCard1(card._id);
                              }}
                            >
                              {isOffered ? '✓ Offered' : '+ Offer'}
                            </button>
                            {trader2 && (
                              <button
                                type="button"
                                className="v-quick-transfer-btn"
                                title={`Send directly to ${trader2.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickSendToPlayer2(card._id);
                                }}
                              >
                                Send ➔
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* ================= CENTRAL EXCHANGE HUB ================= */}
              <div className="trade-center-bridge">
                <div className="trade-direction-indicator">
                  {tradeOfferedCards1.length > 0 && tradeOfferedCards2.length > 0 ? (
                    <span className="bridge-arrow-icon mutual-pulse">⇄</span>
                  ) : tradeOfferedCards1.length > 0 ? (
                    <span className="bridge-arrow-icon right-pulse">➔</span>
                  ) : tradeOfferedCards2.length > 0 ? (
                    <span className="bridge-arrow-icon left-pulse">⬅</span>
                  ) : (
                    <span className="bridge-arrow-icon idle-pulse">🤝</span>
                  )}
                </div>

                <div className="trade-summary-pills">
                  {tradeOfferedCards1.length > 0 && (
                    <span className="summary-pill pill-send">
                      {trader1?.name || 'P1'} gives {tradeOfferedCards1.length} deed(s)
                    </span>
                  )}
                  {tradeOfferedCards2.length > 0 && (
                    <span className="summary-pill pill-recv">
                      {trader2?.name || 'P2'} gives {tradeOfferedCards2.length} deed(s)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="execute-trade-btn"
                  disabled={
                    !trader1 ||
                    !trader2 ||
                    trader1.id === trader2.id ||
                    (tradeOfferedCards1.length === 0 && tradeOfferedCards2.length === 0)
                  }
                  onClick={handleExecuteTrade}
                >
                  Execute Trade 🤝
                </button>
              </div>

              {/* ================= TRADER 2 BOX ================= */}
              <div className="trade-party-pod pod-right">
                {/* Header or Placeholder */}
                {trader2 ? (
                  <div className="trade-pod-header">
                    <div className="pod-header-user">
                      <span className="pod-avatar">{trader2.token?.icon || '👤'}</span>
                      <div>
                        <h4 className="pod-player-name">{trader2.name}</h4>
                        <span className="pod-card-counter">{trader2Cards.length} Properties</span>
                      </div>
                    </div>
                    <select
                      className="pod-change-select"
                      value={tradePlayer2Id || ''}
                      onChange={(e) => {
                        setTradePlayer2Id(Number(e.target.value));
                        setTradeOfferedCards2([]);
                      }}
                    >
                      {gamePlayers.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.id === tradePlayer1Id}>
                          {p.token?.icon} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="trade-pod-placeholder">
                    <div className="placeholder-icon">👤</div>
                    <h4>Trader 2 Placeholder</h4>
                    <p>Select second party for trade</p>
                    <select
                      className="placeholder-player-select"
                      value=""
                      onChange={(e) => {
                        setTradePlayer2Id(Number(e.target.value));
                        setTradeOfferedCards2([]);
                      }}
                    >
                      <option value="" disabled>Select Trader 2...</option>
                      {gamePlayers
                        .filter((p) => p.id !== tradePlayer1Id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.token?.icon} {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Vertical Carousel of Trader 2's Cards */}
                {trader2 && (
                  <div className="trade-vertical-carousel">
                    {trader2Cards.length === 0 ? (
                      <div className="pod-empty-cards">
                        <span>No deeds owned by {trader2.name}.</span>
                      </div>
                    ) : (
                      trader2Cards.map((card) => {
                        const isOffered = tradeOfferedCards2.includes(card._id);
                        const bColor = normalizeCardColor(card.color, card.type);
                        const own = ownership[card._id] || { erections: 0 };

                        return (
                          <div
                            key={card._id}
                            className={`vertical-trade-card ${isOffered ? 'card-offered' : ''}`}
                            onClick={() => toggleTradeCard2(card._id)}
                          >
                            <div className="v-card-strip" style={{ backgroundColor: bColor }} />
                            <div className="v-card-details">
                              <span className="v-card-title">{card.name}</span>
                              <span className="v-card-sub">
                                Buy: ₹{card.buyingCost} • Base: ₹{card.baseRent || card.rent1 || 0}
                                {own.erections > 0 && ` • (${own.erections}H)`}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={`v-offer-toggle-btn ${isOffered ? 'btn-active-offer' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTradeCard2(card._id);
                              }}
                            >
                              {isOffered ? '✓ Offered' : '+ Offer'}
                            </button>
                            {trader1 && (
                              <button
                                type="button"
                                className="v-quick-transfer-btn"
                                title={`Send directly to ${trader1.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickSendToPlayer1(card._id);
                                }}
                              >
                                ⬅ Send
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
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

      {/* =========================================================================
          MODAL: LOAN SYSTEM (₹500 LIMIT + 5% INTEREST REPAYMENT REQUIREMENT)
          ========================================================================= */}
      {activeModal === 'loans' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>🏦 Bank Lending Desk</h3>
                <p className="modal-subtitle-note">
                  Max Loan Limit: <strong>₹500</strong>. When taken, limit is over until repaid with <strong>5% interest (₹525 total)</strong>.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>

            {/* Loans Table for all players */}
            <div className="loans-manager-list">
              {gamePlayers.map((player) => {
                const pLoan = loans[player.id];
                const hasLoan = !!pLoan?.hasActiveLoan;

                return (
                  <div key={player.id} className={`loan-player-card ${hasLoan ? 'loan-locked' : 'loan-available'}`}>
                    <div className="loan-player-header">
                      <div className="loan-player-identity">
                        <span className="loan-token">{player.token?.icon || '👤'}</span>
                        <div>
                          <h4 className="loan-name">{player.name}</h4>
                          <span className={`loan-limit-tag ${hasLoan ? 'tag-limit-over' : 'tag-available'}`}>
                            {hasLoan ? '⛔ Limit Over (Active Loan)' : '✅ ₹500 Limit Available'}
                          </span>
                        </div>
                      </div>

                      {/* Repayment or Loan Amount Info */}
                      <div className="loan-financial-summary">
                        {hasLoan ? (
                          <div className="loan-due-breakdown">
                            <span className="due-total">Due: ₹525</span>
                            <span className="due-formula">(₹500 Principal + 5% Int ₹25)</span>
                          </div>
                        ) : (
                          <div className="loan-available-box">
                            <span className="avail-amount">Eligible for ₹500</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Loan Action Buttons */}
                    <div className="loan-card-actions">
                      {!hasLoan ? (
                        <button
                          type="button"
                          className="loan-btn btn-grant-loan"
                          onClick={() => handleGrantLoan(player.id)}
                        >
                          Grant ₹500 Loan 💰
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="loan-btn btn-repay-loan"
                          onClick={() => handleRepayLoan(player.id)}
                        >
                          Repay Loan (₹525) 💳
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
