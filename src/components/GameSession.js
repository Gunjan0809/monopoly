'use client';

import React, { useState, useEffect } from 'react';
import '../styles/game-session.css';

const UTILITY_CARDS = [
  {
    _id: 'utility-electric',
    type: 'utility',
    name: 'Electric Company',
    buyingCost: 150,
    mortgage: 75,
    icon: '⚡',
  },
  {
    _id: 'utility-water',
    type: 'utility',
    name: 'Waterworks',
    buyingCost: 150,
    mortgage: 75,
    icon: '💧',
  },
];

export default function GameSession({
  players = [],
  onBackToHome,
  onRestartSetup,
  forceLandscape = false,
  onToggleLandscape,
}) {
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'players' (Player Portfolios) | 'ledger' (Banker's Master Ledger) | 'bank' (Remaining Cards)
  const [activeTab, setActiveTab] = useState('players');

  // Player whose assets are currently opened (null = show all player cards centered in the middle!)
  const [openedPlayerId, setOpenedPlayerId] = useState(null);

  // Game Players state with Cash and Loans tracking
  const [gamePlayers, setGamePlayers] = useState(() => {
    const list = players && players.length > 0 ? players : [
      { id: 1, name: 'Player 1', token: { icon: '🎩', name: 'Top Hat', color: '#ff4b4b' }, turnOrder: 1 },
      { id: 2, name: 'Player 2', token: { icon: '🚗', name: 'Race Car', color: '#00d2ff' }, turnOrder: 2 },
    ];
    return list.map((p) => ({
      ...p,
      cash: p.cash ?? 15000,
      loans: p.loans ?? 0,
    }));
  });

  // Ownership state: { [cardId]: { ownerId: playerId, erections: 0..5 } }
  const [ownership, setOwnership] = useState({});

  // Drawer modal for adding cards via swipe/drag from bank
  const [isDeedDrawerOpen, setIsDeedDrawerOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState({});
  const [swipedCardId, setSwipedCardId] = useState(null);

  // Filter for Master Ledger: 'all' | 'remaining' | 'owned'
  const [ledgerFilter, setLedgerFilter] = useState('all');

  useEffect(() => {
    fetchCards();
  }, []);

  // Update players list if prop changes
  useEffect(() => {
    if (players && players.length > 0) {
      setGamePlayers((prev) =>
        players.map((p) => {
          const existing = prev.find((ep) => ep.id === p.id);
          return {
            ...p,
            cash: existing?.cash ?? 15000,
            loans: existing?.loans ?? 0,
          };
        })
      );
    }
  }, [players]);

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/properties');
      const data = await res.json();
      if (data.success) {
        setAllCards([...UTILITY_CARDS, ...data.data]);
      } else {
        setAllCards([...UTILITY_CARDS]);
      }
    } catch (err) {
      console.error('Failed to load cards:', err);
      setAllCards([...UTILITY_CARDS]);
    } finally {
      setLoading(false);
    }
  };

  // Helper for card color gradient
  const getColorGradient = (color) => {
    const map = {
      brown: 'linear-gradient(135deg, #8B4513 0%, #a0522d 100%)',
      blue: 'linear-gradient(135deg, #1a73e8 0%, #4fc3f7 100%)',
      pink: 'linear-gradient(135deg, #e91e8c 0%, #f48fb1 100%)',
      safron: 'linear-gradient(135deg, #ff9933 0%, #ffcc02 100%)',
      red: 'linear-gradient(135deg, #e60000 0%, #ff5252 100%)',
      yellow: 'linear-gradient(135deg, #f5c518 0%, #ffe082 100%)',
      green: 'linear-gradient(135deg, #0f9d58 0%, #66bb6a 100%)',
      purple: 'linear-gradient(135deg, #7b2ff7 0%, #b388ff 100%)',
    };
    return map[color] || `linear-gradient(135deg, ${color} 0%, ${color} 100%)`;
  };

  // Get active owner of a card
  const getCardOwner = (cardId) => {
    const record = ownership[cardId];
    if (!record || !record.ownerId) return null;
    return gamePlayers.find((p) => p.id === record.ownerId) || null;
  };

  // Get erection level (0 to 5)
  const getCardErections = (cardId) => {
    return ownership[cardId]?.erections || 0;
  };

  // Assign or transfer a card to a player
  const assignCardToPlayer = (cardId, playerId) => {
    setOwnership((prev) => ({
      ...prev,
      [cardId]: {
        ownerId: playerId,
        erections: prev[cardId]?.erections || 0,
      },
    }));
  };

  // Release a card back to the Bank
  const releaseCardToBank = (cardId) => {
    setOwnership((prev) => {
      const updated = { ...prev };
      delete updated[cardId];
      return updated;
    });
  };

  // Update erection level (0 to 5)
  const setCardErections = (cardId, newLevel) => {
    const clamped = Math.max(0, Math.min(5, newLevel));
    setOwnership((prev) => {
      const current = prev[cardId] || {};
      return {
        ...prev,
        [cardId]: {
          ...current,
          erections: clamped,
        },
      };
    });
  };

  // ================= LOAN FUNCTIONALITY =================
  // Fixed Loan: ₹500, Interest: 5% (₹25), Repay: ₹525
  const handleTakeLoan = (playerId) => {
    setGamePlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            cash: p.cash + 500,
            loans: (p.loans || 0) + 1,
          };
        }
        return p;
      })
    );
  };

  const handleRepayLoan = (playerId) => {
    setGamePlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId && (p.loans || 0) > 0) {
          return {
            ...p,
            cash: p.cash - 525,
            loans: Math.max(0, (p.loans || 0) - 1),
          };
        }
        return p;
      })
    );
  };

  // ================= SWIPE-TO-ADD FUNCTIONALITY =================
  const handleCardSwipeAdd = (cardId, playerId) => {
    setSwipedCardId(cardId);
    setTimeout(() => {
      assignCardToPlayer(cardId, playerId);
      setSwipedCardId(null);
    }, 300);
  };

  // Calculation helpers
  const getCardsOwnedByPlayer = (playerId) => {
    return allCards.filter((card) => ownership[card._id]?.ownerId === playerId);
  };

  const remainingBankCards = allCards.filter(
    (card) => !ownership[card._id] || !ownership[card._id].ownerId
  );

  const totalBuildingsOnBoard = Object.values(ownership).reduce(
    (acc, val) => {
      if (val.erections === 5) acc.hotels += 1;
      else if (val.erections > 0) acc.houses += val.erections;
      return acc;
    },
    { houses: 0, hotels: 0 }
  );

  const totalLoansInGame = gamePlayers.reduce((acc, p) => acc + (p.loans || 0), 0);

  // Compute current effective rent
  const getCurrentRent = (card) => {
    if (card.type === 'utility') return '4× / 10× Dice';
    if (card.type === 'station') return `₹${card.rent1 || 25} (Base)`;
    const erections = getCardErections(card._id);
    if (erections === 0) return `₹${card.baseRent ?? 0}`;
    if (erections === 1) return `₹${card.rent1 ?? 0}`;
    if (erections === 2) return `₹${card.rent2 ?? 0}`;
    if (erections === 3) return `₹${card.rent3 ?? 0}`;
    if (erections === 4) return `₹${card.rent4 ?? 0}`;
    if (erections === 5) return `₹${card.hotelRent ?? 0}`;
    return `₹${card.baseRent ?? 0}`;
  };

  const activeOpenedPlayer = gamePlayers.find((p) => p.id === openedPlayerId);
  const activePlayerDeeds = activeOpenedPlayer
    ? getCardsOwnedByPlayer(activeOpenedPlayer.id)
    : [];

  return (
    <div className={`game-session-container ${forceLandscape ? 'force-horizontal-view' : ''}`}>
      {/* ================= TOP BANKER HEADER BAR ================= */}
      <header className="banker-header-panel glass-panel">
        <div className="banker-brand-row">
          <div className="banker-brand-group">
            <button type="button" className="banker-menu-btn" onClick={onBackToHome}>
              ← Main Menu
            </button>
            <div>
              <h1 className="banker-title">Banker Desk &amp; Game Engine</h1>
              <p className="banker-subtitle">
                Interactive Player Portfolios, Bank Loans &amp; Master Board Ledger
              </p>
            </div>
          </div>

          {/* Quick Horizontal View Toggle Button */}
          {onToggleLandscape && (
            <button
              type="button"
              className={`landscape-toggle-btn ${forceLandscape ? 'active' : ''}`}
              onClick={onToggleLandscape}
              title="Toggle Horizontal Mode for Mobile (Laptop Experience)"
            >
              {forceLandscape ? '📱 Standard View' : '🖥️ Horizontal Laptop View'}
            </button>
          )}
        </div>

        {/* Global Live Statistics */}
        <div className="banker-stats-pills">
          <div className="stat-pill">
            <span className="pill-label">Total Deeds</span>
            <span className="pill-val">{allCards.length}</span>
          </div>
          <div className="stat-pill highlight-pill">
            <span className="pill-label">In Bank Vault</span>
            <span className="pill-val">{remainingBankCards.length}</span>
          </div>
          <div className="stat-pill">
            <span className="pill-label">Player Owned</span>
            <span className="pill-val">{allCards.length - remainingBankCards.length}</span>
          </div>
          <div className="stat-pill houses-pill">
            <span className="pill-label">Buildings</span>
            <span className="pill-val">
              {totalBuildingsOnBoard.houses}🏠 | {totalBuildingsOnBoard.hotels}🏨
            </span>
          </div>
          <div className="stat-pill loan-pill">
            <span className="pill-label">Active Loans</span>
            <span className="pill-val">
              {totalLoansInGame} (₹{totalLoansInGame * 500})
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="banker-tab-nav">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
            onClick={() => setActiveTab('players')}
          >
            👥 Player Cards ({gamePlayers.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            📋 Master Ledger ({allCards.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank')}
          >
            🏦 Remaining in Bank ({remainingBankCards.length})
          </button>
        </div>
      </header>

      {/* ================= TAB 1: PLAYER CARDS & ASSETS ================= */}
      {activeTab === 'players' && (
        <div className="players-tab-content">
          {/* VIEW A: ALL PLAYER CARDS IN THE MIDDLE (CENTER STAGE) */}
          {openedPlayerId === null ? (
            <div className="players-center-stage fade-in">
              <div className="stage-header">
                <h2 className="stage-title">👥 Monopoly Players Deck</h2>
                <p className="stage-sub">
                  Tap any player card to view their owned assets, erect houses, or swipe to add deeds!
                </p>
              </div>

              {/* Centered Player Cards Grid */}
              <div className="players-cards-middle-grid">
                {gamePlayers.map((p) => {
                  const deeds = getCardsOwnedByPlayer(p.id);
                  const hasLoan = (p.loans || 0) > 0;

                  return (
                    <div
                      key={p.id}
                      className="player-middle-card"
                      onClick={() => setOpenedPlayerId(p.id)}
                    >
                      <div className="card-top-shine" />

                      {/* Turn Rank & Token */}
                      <div className="player-card-header">
                        <span className="player-turn-rank">Turn #{p.turnOrder || p.id}</span>
                        <div className="player-big-avatar" style={{ borderColor: p.token?.color || '#00f2fe' }}>
                          <span className="avatar-icon">{p.token?.icon || '🎩'}</span>
                        </div>
                        <h3 className="player-card-name">{p.name}</h3>
                      </div>

                      {/* Key Stats: Cash & Deeds */}
                      <div className="player-metrics-box">
                        <div className="metric-item">
                          <span className="metric-label">Cash Funds</span>
                          <span className="metric-value cash-val">₹{p.cash.toLocaleString()}</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Deeds Owned</span>
                          <span className="metric-value deeds-val">{deeds.length} Deeds</span>
                        </div>
                      </div>

                      {/* Loan Status Box */}
                      <div className={`loan-status-badge ${hasLoan ? 'has-loan' : 'no-loan'}`}>
                        {hasLoan ? (
                          <div className="loan-info-line">
                            <span className="loan-alert-icon">⚠️</span>
                            <span>
                              Loan: ₹{p.loans * 500} &bull; <strong>Repay: ₹{p.loans * 525}</strong>
                            </span>
                          </div>
                        ) : (
                          <span>✅ No Active Loans</span>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="card-footer-action">
                        <span className="inspect-prompt">
                          Open Assets &amp; Deeds Deck →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VIEW B: OPENED PLAYER PORTFOLIO & ASSETS VIEW */
            <div className="opened-player-portfolio glass-panel fade-in">
              {/* Back to All Players Bar */}
              <div className="portfolio-top-bar">
                <button
                  type="button"
                  className="back-players-btn"
                  onClick={() => setOpenedPlayerId(null)}
                >
                  ← Back to All Players
                </button>
                <div className="portfolio-player-badge">
                  <span className="badge-token">{activeOpenedPlayer?.token?.icon}</span>
                  <span className="badge-name">{activeOpenedPlayer?.name}</span>
                  <span className="badge-turn">Turn #{activeOpenedPlayer?.turnOrder || activeOpenedPlayer?.id}</span>
                </div>
              </div>

              {/* Player Summary & Loan Desk Banner */}
              <div className="player-hero-banner">
                <div className="hero-left">
                  <div className="hero-token-display">
                    {activeOpenedPlayer?.token?.icon}
                  </div>
                  <div>
                    <h2 className="hero-player-title">{activeOpenedPlayer?.name}&rsquo;s Asset Deck</h2>
                    <p className="hero-player-cash">
                      Available Cash: <strong>₹{activeOpenedPlayer?.cash.toLocaleString()}</strong> &bull;{' '}
                      Properties: <strong>{activePlayerDeeds.length} Owned</strong>
                    </p>
                  </div>
                </div>

                {/* Loan Manager Card (₹500 Loan + 5% Interest = ₹525 Repayment) */}
                <div className="bank-loan-control-box">
                  <div className="loan-box-header">
                    <span className="loan-title">🏦 Bank Loan Desk</span>
                    <span className="loan-rule-note">₹500 Fixed + 5% Interest (Repay ₹525)</span>
                  </div>

                  <div className="loan-box-content">
                    <div className="loan-status-text">
                      {(activeOpenedPlayer?.loans || 0) > 0 ? (
                        <span className="loan-due-warning">
                          ⚠️ {activeOpenedPlayer?.loans} Active Loan ({activeOpenedPlayer?.loans * 500} rs) &bull;{' '}
                          Due: <strong>₹{activeOpenedPlayer?.loans * 525}</strong>
                        </span>
                      ) : (
                        <span className="loan-clean-status">No Loans Active</span>
                      )}
                    </div>

                    <div className="loan-actions-group">
                      <button
                        type="button"
                        className="take-loan-btn"
                        onClick={() => handleTakeLoan(activeOpenedPlayer.id)}
                        title="Bank gives player ₹500 loan"
                      >
                        + Take ₹500 Loan
                      </button>

                      {(activeOpenedPlayer?.loans || 0) > 0 && (
                        <button
                          type="button"
                          className="repay-loan-btn"
                          onClick={() => handleRepayLoan(activeOpenedPlayer.id)}
                          title="Player repays ₹500 principal + ₹25 interest (₹525 total)"
                        >
                          ✓ Repay ₹525 (with 5% int.)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Card from Bank Button */}
                <div
                  className="add-deed-action-card"
                  onClick={() => setIsDeedDrawerOpen(true)}
                  title="Open available deeds to swipe into portfolio"
                >
                  <span className="add-icon-glow">✨</span>
                  <span className="add-card-label">➕ Add Card from Bank</span>
                  <span className="add-card-sub">({remainingBankCards.length} in Vault &bull; Swipe to Add)</span>
                </div>
              </div>

              {/* Owned Deeds Section */}
              <div className="portfolio-deeds-container">
                <h3 className="section-subtitle">
                  Owned Deeds &amp; Building Plots ({activePlayerDeeds.length})
                </h3>

                {activePlayerDeeds.length === 0 ? (
                  <div className="empty-deeds-notice">
                    <span className="empty-symbol">📜</span>
                    <h4>No Properties Claimed Yet</h4>
                    <p>
                      Click <strong>&ldquo;➕ Add Card from Bank&rdquo;</strong> above to swipe any deed from the bank vault into {activeOpenedPlayer?.name}&rsquo;s deck!
                    </p>
                  </div>
                ) : (
                  <div className="deeds-interactive-grid">
                    {activePlayerDeeds.map((card) => {
                      const erections = getCardErections(card._id);
                      const isProperty = card.type === 'property' || !card.type;

                      return (
                        <div key={card._id} className="game-property-card">
                          {/* Color Band */}
                          <div
                            className="card-color-band"
                            style={{
                              background:
                                card.type === 'utility'
                                  ? 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'
                                  : card.type === 'station'
                                  ? 'linear-gradient(135deg, #232526, #414345)'
                                  : getColorGradient(card.color),
                            }}
                          >
                            <button
                              type="button"
                              className="deed-release-btn"
                              title="Release deed back to Bank Vault"
                              onClick={() => releaseCardToBank(card._id)}
                            >
                              ↩ Bank
                            </button>
                            <h4 className="card-name">{card.name}</h4>
                            <span className="card-badge">
                              {card.type === 'station'
                                ? 'STATION'
                                : card.type === 'utility'
                                ? 'UTILITY'
                                : 'TITLE DEED'}
                            </span>
                          </div>

                          {/* Card Details */}
                          <div className="card-details">
                            {/* Live Rent */}
                            <div className="live-rent-banner">
                              <span className="rent-tag">Current Rent:</span>
                              <span className="rent-amount">{getCurrentRent(card)}</span>
                            </div>

                            {/* Tactile Construction Bay for Properties */}
                            {isProperty && (
                              <div className="construction-bay-box">
                                <div className="construction-bay-header">
                                  <span className="bay-title">Erections Plot</span>
                                  <span className="bay-status">
                                    {erections === 0 && 'Base (0 Houses)'}
                                    {erections >= 1 && erections <= 4 && `${erections} 🏠 Houses`}
                                    {erections === 5 && '🏨 Grand Hotel'}
                                  </span>
                                </div>

                                {/* 5 Architectural Sockets */}
                                <div className="construction-sockets-row">
                                  {[1, 2, 3, 4].map((slotNum) => {
                                    const isBuilt = erections >= slotNum;
                                    return (
                                      <div
                                        key={slotNum}
                                        className={`construction-socket house-socket ${
                                          isBuilt ? 'built' : 'empty'
                                        }`}
                                        onClick={() =>
                                          setCardErections(
                                            card._id,
                                            erections === slotNum ? slotNum - 1 : slotNum
                                          )
                                        }
                                        title={
                                          isBuilt
                                            ? `Tap to demolish house ${slotNum}`
                                            : `Tap to build up to house ${slotNum}`
                                        }
                                      >
                                        {isBuilt ? '🏠' : <span className="plot-dot" />}
                                        <span className="socket-num">{slotNum}</span>
                                      </div>
                                    );
                                  })}

                                  <div
                                    className={`construction-socket hotel-socket ${
                                      erections === 5 ? 'built hotel-active' : 'empty'
                                    }`}
                                    onClick={() =>
                                      setCardErections(card._id, erections === 5 ? 4 : 5)
                                    }
                                    title={
                                      erections === 5
                                        ? 'Tap to downgrade to 4 houses'
                                        : 'Tap to build Grand Hotel'
                                    }
                                  >
                                    {erections === 5 ? '🏨' : '👑'}
                                    <span className="socket-num">Hotel</span>
                                  </div>
                                </div>

                                {/* Tactile Range Slider */}
                                <div className="tactile-slider-wrap">
                                  <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    value={erections}
                                    className="tactile-range-input"
                                    onChange={(e) =>
                                      setCardErections(card._id, Number(e.target.value))
                                    }
                                  />
                                  <div className="slider-ticks">
                                    <span>0</span>
                                    <span>1🏠</span>
                                    <span>2🏠</span>
                                    <span>3🏠</span>
                                    <span>4🏠</span>
                                    <span>🏨</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Rent Rates reference list */}
                            {isProperty && (
                              <div className="compact-rent-list">
                                <div className={`mini-rent-row ${erections === 0 ? 'active' : ''}`}>
                                  <span>Base Rent</span>
                                  <strong>₹{card.baseRent ?? 0}</strong>
                                </div>
                                <div className={`mini-rent-row ${erections === 1 ? 'active' : ''}`}>
                                  <span>1 House</span>
                                  <strong>₹{card.rent1 ?? 0}</strong>
                                </div>
                                <div className={`mini-rent-row ${erections === 2 ? 'active' : ''}`}>
                                  <span>2 Houses</span>
                                  <strong>₹{card.rent2 ?? 0}</strong>
                                </div>
                                <div className={`mini-rent-row ${erections === 3 ? 'active' : ''}`}>
                                  <span>3 Houses</span>
                                  <strong>₹{card.rent3 ?? 0}</strong>
                                </div>
                                <div className={`mini-rent-row ${erections === 4 ? 'active' : ''}`}>
                                  <span>4 Houses</span>
                                  <strong>₹{card.rent4 ?? 0}</strong>
                                </div>
                                <div className={`mini-rent-row ${erections === 5 ? 'active hotel' : ''}`}>
                                  <span>🏨 Hotel</span>
                                  <strong>₹{card.hotelRent ?? 0}</strong>
                                </div>
                              </div>
                            )}

                            {card.type === 'station' && (
                              <div className="station-rates-box">
                                <div className="mini-rent-row"><span>1 Station</span><strong>₹{card.rent1}</strong></div>
                                <div className="mini-rent-row"><span>2 Stations</span><strong>₹{card.rent2}</strong></div>
                                <div className="mini-rent-row"><span>3 Stations</span><strong>₹{card.rent3}</strong></div>
                                <div className="mini-rent-row"><span>4 Stations</span><strong>₹{card.rent4}</strong></div>
                              </div>
                            )}

                            {card.type === 'utility' && (
                              <div className="card-rule-box">
                                <p>1 Utility = <strong>4×</strong> dice</p>
                                <p>2 Utilities = <strong>10×</strong> dice</p>
                              </div>
                            )}

                            <div className="detail-row mortgage-row">
                              <span>Mortgage Value</span>
                              <span className="detail-value">₹{card.mortgage}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: BANKER MASTER LEDGER ================= */}
      {activeTab === 'ledger' && (
        <div className="ledger-full-layout glass-panel fade-in">
          <div className="ledger-header">
            <div>
              <h2 className="ledger-title">📋 Master Cards Ledger &amp; Board Audit</h2>
              <p className="ledger-sub">
                Track all {allCards.length} cards, active owners, building erection levels, and current rents.
              </p>
            </div>

            <div className="ledger-filter-row">
              <button
                type="button"
                className={`ledger-filter-btn ${ledgerFilter === 'all' ? 'active' : ''}`}
                onClick={() => setLedgerFilter('all')}
              >
                All Cards ({allCards.length})
              </button>
              <button
                type="button"
                className={`ledger-filter-btn ${ledgerFilter === 'owned' ? 'active' : ''}`}
                onClick={() => setLedgerFilter('owned')}
              >
                Player Owned ({allCards.length - remainingBankCards.length})
              </button>
              <button
                type="button"
                className={`ledger-filter-btn ${ledgerFilter === 'remaining' ? 'active' : ''}`}
                onClick={() => setLedgerFilter('remaining')}
              >
                In Bank Vault ({remainingBankCards.length})
              </button>
            </div>
          </div>

          <div className="ledger-table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Card Name</th>
                  <th>Type</th>
                  <th>Cost</th>
                  <th>Current Owner</th>
                  <th>Erections Level</th>
                  <th>Active Rent</th>
                  <th>Transfer / Manage</th>
                </tr>
              </thead>
              <tbody>
                {allCards
                  .filter((card) => {
                    const owner = getCardOwner(card._id);
                    if (ledgerFilter === 'owned') return Boolean(owner);
                    if (ledgerFilter === 'remaining') return !owner;
                    return true;
                  })
                  .map((card) => {
                    const owner = getCardOwner(card._id);
                    const erections = getCardErections(card._id);
                    const isProperty = card.type === 'property' || !card.type;

                    return (
                      <tr key={card._id} className={owner ? 'row-owned' : 'row-bank'}>
                        <td className="cell-card-name">
                          <span
                            className="color-swatch"
                            style={{
                              background:
                                card.type === 'station'
                                  ? '#414345'
                                  : card.type === 'utility'
                                  ? '#302b63'
                                  : getColorGradient(card.color),
                            }}
                          />
                          <span className="card-title-text">{card.name}</span>
                        </td>
                        <td>
                          <span className="type-chip">
                            {card.type === 'station'
                              ? '🚂 Station'
                              : card.type === 'utility'
                              ? '⚡ Utility'
                              : '🏙️ Property'}
                          </span>
                        </td>
                        <td className="cell-num">₹{card.buyingCost}</td>
                        <td>
                          {owner ? (
                            <div className="owner-badge">
                              <span className="owner-icon">{owner.token?.icon}</span>
                              <span className="owner-name">{owner.name}</span>
                              <span className="owner-turn">Turn #{owner.turnOrder || owner.id}</span>
                            </div>
                          ) : (
                            <span className="bank-reserve-tag">🏦 In Bank</span>
                          )}
                        </td>
                        <td>
                          {isProperty ? (
                            <div className="erection-status-cell">
                              {erections === 0 && <span className="status-dim">0 Houses</span>}
                              {erections >= 1 && erections <= 4 && (
                                <span className="status-houses">{erections} 🏠 Houses</span>
                              )}
                              {erections === 5 && <span className="status-hotel">🏨 Grand Hotel</span>}
                            </div>
                          ) : (
                            <span className="status-dim">N/A</span>
                          )}
                        </td>
                        <td className="cell-rent">{getCurrentRent(card)}</td>
                        <td>
                          <select
                            className="ledger-assign-select"
                            value={owner?.id || 'bank'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'bank') releaseCardToBank(card._id);
                              else assignCardToPlayer(card._id, Number(val));
                            }}
                          >
                            <option value="bank">🏦 Bank Vault</option>
                            {gamePlayers.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.token?.icon} {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: BANK VAULT (REMAINING CARDS) ================= */}
      {activeTab === 'bank' && (
        <div className="bank-vault-layout glass-panel fade-in">
          <div className="vault-header">
            <div>
              <h2 className="vault-title">🏦 Bank Vault — Remaining Cards ({remainingBankCards.length})</h2>
              <p className="vault-sub">
                These cards are in the bank stock. Select a player to assign or swipe them!
              </p>
            </div>
          </div>

          {remainingBankCards.length === 0 ? (
            <div className="empty-vault-box">
              <span>🎉</span>
              <h3>All Deeds Owned!</h3>
              <p>Every single property on the board has been purchased by the players.</p>
            </div>
          ) : (
            <div className="vault-cards-grid">
              {remainingBankCards.map((card) => (
                <div key={card._id} className="vault-card-item">
                  <div
                    className="vault-card-banner"
                    style={{
                      background:
                        card.type === 'station'
                          ? 'linear-gradient(135deg, #232526, #414345)'
                          : card.type === 'utility'
                          ? 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'
                          : getColorGradient(card.color),
                    }}
                  >
                    <span className="vault-card-name">{card.name}</span>
                    <span className="vault-card-cost">₹{card.buyingCost}</span>
                  </div>

                  <div className="vault-card-body">
                    <div className="vault-base-rent">
                      <span>Base Rent:</span>
                      <strong>₹{card.baseRent ?? card.rent1 ?? 0}</strong>
                    </div>

                    <div className="vault-assign-row">
                      <label>Give to:</label>
                      <select
                        className="vault-player-select"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            assignCardToPlayer(card._id, Number(e.target.value));
                          }
                        }}
                      >
                        <option value="" disabled>Select Player...</option>
                        {gamePlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.token?.icon} {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL DRAWER: SWIPE-TO-ADD CARD ================= */}
      {isDeedDrawerOpen && activeOpenedPlayer && (
        <div className="drawer-backdrop" onClick={() => setIsDeedDrawerOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 className="drawer-title">
                  Swipe Deed into {activeOpenedPlayer.name}&rsquo;s Deck
                </h3>
                <p className="drawer-sub">
                  Swipe right on any card below or tap &ldquo;Swipe into Deck&rdquo; to add it to this player!
                </p>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setIsDeedDrawerOpen(false)}
              >
                ✕
              </button>
            </div>

            {remainingBankCards.length === 0 ? (
              <div className="drawer-empty">
                <p>No remaining properties in the Bank Vault.</p>
              </div>
            ) : (
              <div className="drawer-cards-swipe-list">
                {remainingBankCards.map((card) => {
                  const isSwiping = swipedCardId === card._id;

                  return (
                    <div
                      key={card._id}
                      className={`swipe-card-row ${isSwiping ? 'swiped-success' : ''}`}
                    >
                      <div
                        className="swipe-card-color-strip"
                        style={{
                          background:
                            card.type === 'station'
                              ? '#414345'
                              : card.type === 'utility'
                              ? '#302b63'
                              : getColorGradient(card.color),
                        }}
                      />

                      <div className="swipe-card-details">
                        <div className="swipe-card-headline">
                          <h4 className="swipe-card-title">{card.name}</h4>
                          <span className="swipe-card-price">₹{card.buyingCost}</span>
                        </div>
                        <span className="swipe-card-rent-hint">
                          Base Rent: ₹{card.baseRent ?? card.rent1 ?? 0}
                        </span>
                      </div>

                      {/* Interactive Swipe / Claim Button */}
                      <button
                        type="button"
                        className="swipe-claim-btn"
                        onClick={() => handleCardSwipeAdd(card._id, activeOpenedPlayer.id)}
                      >
                        👉 Swipe to Add
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
