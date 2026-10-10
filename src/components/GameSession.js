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

export default function GameSession({ players, onBackToHome, onRestartSetup }) {
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'players' (Player Portfolios) | 'ledger' (Banker's Master Ledger) | 'bank' (Remaining Cards)
  const [activeTab, setActiveTab] = useState('players');

  // Selected player for viewing details or assigning cards
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id || 1);

  // Ownership state: { [cardId]: { ownerId: playerId, erections: 0..5 } }
  // erections: 0 = base rent, 1 = 1 house, 2 = 2 houses, 3 = 3 houses, 4 = 4 houses, 5 = hotel
  const [ownership, setOwnership] = useState({});

  // Drawer modal for assigning cards to the currently selected player
  const [isDeedDrawerOpen, setIsDeedDrawerOpen] = useState(false);
  const [drawerPlayerId, setDrawerPlayerId] = useState(null);

  // Filter for Master Ledger: 'all' | 'remaining' | 'owned'
  const [ledgerFilter, setLedgerFilter] = useState('all');

  // Mobile horizontal mode state
  const [forceLandscape, setForceLandscape] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [hideRotateBanner, setHideRotateBanner] = useState(false);

  useEffect(() => {
    fetchCards();

    // Check device orientation
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        const portrait = window.innerHeight > window.innerWidth && window.innerWidth <= 900;
        setIsPortrait(portrait);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRequestLandscape = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    } catch (e) {}
    setForceLandscape(true);
    setHideRotateBanner(true);
  };

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

  // Helper to get card color gradient
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
    return players.find((p) => p.id === record.ownerId) || null;
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

  // Release a card back to the Bank (unowned)
  const releaseCardToBank = (cardId) => {
    setOwnership((prev) => {
      const updated = { ...prev };
      delete updated[cardId];
      return updated;
    });
  };

  // Cool Method for Building: directly update erection level (0 to 5)
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

  // Open the Deed Acquisition Drawer for a player
  const openDeedDrawer = (playerId) => {
    setDrawerPlayerId(playerId);
    setIsDeedDrawerOpen(true);
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

  // Compute current effective rent for a property card
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

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || players[0];
  const selectedPlayerDeeds = getCardsOwnedByPlayer(selectedPlayer?.id);

  return (
    <div className={`game-session-container ${forceLandscape ? 'force-horizontal-view' : ''}`}>
      {/* Mobile Orientation Notification Banner */}
      {isPortrait && !forceLandscape && !hideRotateBanner && (
        <div className="mobile-rotate-notice-banner">
          <div className="rotate-icon-anim">🔄</div>
          <div className="rotate-text-block">
            <strong>Horizontal Screen Recommended</strong>
            <p>For the best gaming experience (like on a laptop), rotate your device horizontally!</p>
          </div>
          <div className="rotate-btn-group">
            <button
              type="button"
              className="rotate-action-btn"
              onClick={handleRequestLandscape}
            >
              🎮 Force Horizontal View
            </button>
            <button
              type="button"
              className="rotate-dismiss-btn"
              onClick={() => setHideRotateBanner(true)}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
                Live Assets, Interactive Construction Plots &amp; Master Board Ledger
              </p>
            </div>
          </div>

          {/* Quick Horizontal View Toggle Button */}
          <button
            type="button"
            className={`landscape-toggle-btn ${forceLandscape ? 'active' : ''}`}
            onClick={() => setForceLandscape(!forceLandscape)}
            title="Toggle Horizontal Mode for Mobile"
          >
            {forceLandscape ? '📱 Standard View' : '🖥️ Horizontal Laptop View'}
          </button>
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
        </div>

        {/* Navigation Tabs */}
        <div className="banker-tab-nav">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
            onClick={() => setActiveTab('players')}
          >
            👥 Player Portfolios
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

      {/* ================= TAB 1: PLAYER PORTFOLIOS ================= */}
      {activeTab === 'players' && (
        <div className="session-content-layout">
          {/* Left: Player Selector Carousel / Tabs */}
          <div className="players-sidebar glass-panel">
            <h3 className="sidebar-heading">Active Players</h3>
            <div className="player-tabs-vertical">
              {players.map((p) => {
                const deedsCount = getCardsOwnedByPlayer(p.id).length;
                const isSelected = p.id === selectedPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`player-tab-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedPlayerId(p.id)}
                  >
                    <div className="player-tab-header">
                      <span className="player-tab-token">{p.token.icon}</span>
                      <div className="player-tab-info">
                        <span className="player-tab-order">Turn #{p.turnOrder || p.id}</span>
                        <h4 className="player-tab-name">{p.name}</h4>
                      </div>
                    </div>
                    <div className="player-tab-stats">
                      <span className="asset-count-badge">
                        {deedsCount} {deedsCount === 1 ? 'Deed' : 'Deeds'}
                      </span>
                      {isSelected && <span className="viewing-pill">Viewing</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Player Portfolio & Deeds */}
          <div className="player-portfolio-main glass-panel">
            {selectedPlayer && (
              <>
                {/* Player Banner */}
                <div className="portfolio-banner">
                  <div className="banner-left">
                    <span className="banner-big-token">{selectedPlayer.token.icon}</span>
                    <div>
                      <div className="banner-order-tag">
                        Playing Position: Turn #{selectedPlayer.turnOrder || selectedPlayer.id}
                      </div>
                      <h2 className="banner-player-name">{selectedPlayer.name}&rsquo;s Asset Deck</h2>
                      <p className="banner-hint">
                        Properties owned, rent rates, and interactive architectural building plots.
                      </p>
                    </div>
                  </div>

                  {/* Add Deed Slot (Cool method: Clicking opens the Deed Vault Drawer) */}
                  <div
                    className="add-deed-slot-card"
                    onClick={() => openDeedDrawer(selectedPlayer.id)}
                    title="Click to acquire a property for this player"
                  >
                    <span className="add-slot-sparkle">✨</span>
                    <span className="add-slot-text">Acquire Deed from Bank</span>
                    <span className="add-slot-sub">
                      ({remainingBankCards.length} available)
                    </span>
                  </div>
                </div>

                {/* List of Owned Deeds */}
                <div className="portfolio-deeds-section">
                  {selectedPlayerDeeds.length === 0 ? (
                    <div className="empty-portfolio-box">
                      <span className="empty-icon">📜</span>
                      <h3>No Properties Claimed Yet</h3>
                      <p>
                        When {selectedPlayer.name} lands on a place and purchases it from the bank,
                        click the <strong>&ldquo;Acquire Deed from Bank&rdquo;</strong> box above to assign it!
                      </p>
                    </div>
                  ) : (
                    <div className="deeds-interactive-grid">
                      {selectedPlayerDeeds.map((card) => {
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
                              {/* Release to Bank action */}
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

                            {/* Card Body */}
                            <div className="card-details">
                              {/* Live Rent Banner */}
                              <div className="live-rent-banner">
                                <span className="rent-tag">Current Rent:</span>
                                <span className="rent-amount">{getCurrentRent(card)}</span>
                              </div>

                              {/* COOL METHOD: Interactive 3D Construction Bay for Properties */}
                              {isProperty && (
                                <div className="construction-bay-box">
                                  <div className="construction-bay-header">
                                    <span className="bay-title">Erections Plot</span>
                                    <span className="bay-status">
                                      {erections === 0 && 'Base (No Building)'}
                                      {erections >= 1 && erections <= 4 && `${erections} 🏠 Erected`}
                                      {erections === 5 && '🏨 Grand Hotel'}
                                    </span>
                                  </div>

                                  {/* 5 Architectural Sockets (Clicking slot toggles/sets that level) */}
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

                                    {/* 5th slot: Hotel Crown */}
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
                                          : 'Tap to upgrade to Grand Hotel'
                                      }
                                    >
                                      {erections === 5 ? '🏨' : '👑'}
                                      <span className="socket-num">Hotel</span>
                                    </div>
                                  </div>

                                  {/* Tactile Construction Slider */}
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
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: BANKER MASTER LEDGER ================= */}
      {activeTab === 'ledger' && (
        <div className="ledger-full-layout glass-panel">
          <div className="ledger-header">
            <div>
              <h2 className="ledger-title">📋 Master Cards Ledger &amp; Board Audit</h2>
              <p className="ledger-sub">
                Track all {allCards.length} cards, active owners, building erection levels, and current rents.
              </p>
            </div>

            {/* Filter buttons */}
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

          {/* Master Table / Grid */}
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
                        {/* Name & Color swatch */}
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

                        {/* Type */}
                        <td>
                          <span className="type-chip">
                            {card.type === 'station'
                              ? '🚂 Station'
                              : card.type === 'utility'
                              ? '⚡ Utility'
                              : '🏙️ Property'}
                          </span>
                        </td>

                        {/* Cost */}
                        <td className="cell-num">₹{card.buyingCost}</td>

                        {/* Current Owner */}
                        <td>
                          {owner ? (
                            <div className="owner-badge">
                              <span className="owner-icon">{owner.token.icon}</span>
                              <span className="owner-name">{owner.name}</span>
                              <span className="owner-turn">Turn #{owner.turnOrder || owner.id}</span>
                            </div>
                          ) : (
                            <span className="bank-reserve-tag">🏦 In Bank</span>
                          )}
                        </td>

                        {/* Erections Level */}
                        <td>
                          {isProperty ? (
                            <div className="erection-status-cell">
                              {erections === 0 && <span className="status-dim">0 Houses</span>}
                              {erections >= 1 && erections <= 4 && (
                                <span className="status-houses">
                                  {erections} 🏠 ({erections} Houses)
                                </span>
                              )}
                              {erections === 5 && (
                                <span className="status-hotel">🏨 Grand Hotel</span>
                              )}
                            </div>
                          ) : (
                            <span className="status-dim">N/A</span>
                          )}
                        </td>

                        {/* Active Rent */}
                        <td className="cell-rent">{getCurrentRent(card)}</td>

                        {/* Action: Quick assign/transfer */}
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
                            {players.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.token.icon} {p.name}
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

      {/* ================= TAB 3: REMAINING CARDS (BANK VAULT) ================= */}
      {activeTab === 'bank' && (
        <div className="bank-vault-layout glass-panel">
          <div className="vault-header">
            <div>
              <h2 className="vault-title">🏦 Bank Vault — Remaining Cards ({remainingBankCards.length})</h2>
              <p className="vault-sub">
                These cards are unpurchased and currently in the bank stock. Tap any card to assign it to a player!
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

                    {/* Quick Assign Dropdown */}
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
                        <option value="" disabled>
                          Select Player...
                        </option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.token.icon} {p.name}
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

      {/* ================= MODAL DRAWER: DEED ACQUISITION ================= */}
      {isDeedDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setIsDeedDrawerOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 className="drawer-title">
                  Assign Deed to{' '}
                  {players.find((p) => p.id === drawerPlayerId)?.name}
                </h3>
                <p className="drawer-sub">
                  Select any available property from the Bank Vault to add to this player&rsquo;s asset deck:
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
              <div className="drawer-cards-list">
                {remainingBankCards.map((card) => (
                  <div
                    key={card._id}
                    className="drawer-card-choice"
                    onClick={() => {
                      assignCardToPlayer(card._id, drawerPlayerId);
                      setIsDeedDrawerOpen(false);
                    }}
                  >
                    <div
                      className="choice-color-strip"
                      style={{
                        background:
                          card.type === 'station'
                            ? '#414345'
                            : card.type === 'utility'
                            ? '#302b63'
                            : getColorGradient(card.color),
                      }}
                    />
                    <div className="choice-info">
                      <h4 className="choice-name">{card.name}</h4>
                      <span className="choice-cost">Buy Cost: ₹{card.buyingCost}</span>
                    </div>
                    <div className="choice-action-badge">
                      Claim Deed →
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
