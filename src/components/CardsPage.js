'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/banks.css';

// Hardcoded utility cards
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

export default function CardsPage({ onBackToHome }) {
  const [properties, setProperties] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(30000);
  const [filter, setFilter] = useState('all');

  // Drag state
  const [dragIndex, setDragIndex] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoverIndex, setHoverIndex] = useState(null);
  const cardRefs = useRef([]);

  // Edit modal state
  const [editingCard, setEditingCard] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  // Merge utilities + minted cards whenever properties change
  useEffect(() => {
    setAllCards([...UTILITY_CARDS, ...properties]);
  }, [properties]);

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      const data = await res.json();
      if (data.success) {
        setProperties(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // ======== EDIT / DELETE HANDLERS ========
  const handleOpenEdit = (card, e) => {
    e.stopPropagation();
    setEditingCard(card);
    setEditFormData({
      _id: card._id,
      type: card.type || 'property',
      name: card.name || '',
      buyingCost: card.buyingCost ?? '',
      buildingCost: card.buildingCost ?? '',
      baseRent: card.baseRent ?? '',
      rent1: card.rent1 ?? '',
      rent2: card.rent2 ?? '',
      rent3: card.rent3 ?? '',
      rent4: card.rent4 ?? '',
      hotelRent: card.hotelRent ?? '',
      mortgage: card.mortgage ?? '',
      color: card.color || 'brown',
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...editFormData,
        buyingCost: Number(editFormData.buyingCost) || 0,
        buildingCost: Number(editFormData.buildingCost) || 0,
        baseRent: Number(editFormData.baseRent) || 0,
        rent1: Number(editFormData.rent1) || 0,
        rent2: Number(editFormData.rent2) || 0,
        rent3: Number(editFormData.rent3) || 0,
        rent4: Number(editFormData.rent4) || 0,
        hotelRent: Number(editFormData.hotelRent) || 0,
        mortgage: Number(editFormData.mortgage) || 0,
      };

      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setProperties((prev) =>
          prev.map((p) => (p._id === data.data._id ? data.data : p))
        );
        setAllCards((prev) =>
          prev.map((c) => (c._id === data.data._id ? data.data : c))
        );
        setEditingCard(null);
      } else {
        alert('Failed to update: ' + data.error);
      }
    } catch (error) {
      alert('Failed to update: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/properties?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setProperties((prev) => prev.filter((p) => p._id !== id));
        setAllCards((prev) => prev.filter((c) => c._id !== id));
      } else {
        alert('Failed to delete: ' + data.error);
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

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

  // ======== DRAG & DROP WITH SWAP ========
  const handlePointerDown = useCallback((e, index) => {
    if (['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.target.closest('.card-action-btn')) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    setDragIndex(index);
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragPos({ x: rect.left, y: rect.top });

    e.preventDefault();
  }, []);

  useEffect(() => {
    if (dragIndex === null) return;

    const onMove = (e) => {
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      setDragPos({ x, y });

      let found = null;
      cardRefs.current.forEach((ref, i) => {
        if (i === dragIndex || !ref) return;
        const rect = ref.getBoundingClientRect();
        if (
          e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom
        ) {
          found = i;
        }
      });
      setHoverIndex(found);
    };

    const onUp = () => {
      if (hoverIndex !== null && hoverIndex !== dragIndex) {
        setAllCards((prev) => {
          const updated = [...prev];
          const temp = updated[dragIndex];
          updated[dragIndex] = updated[hoverIndex];
          updated[hoverIndex] = temp;
          return updated;
        });
      }
      setDragIndex(null);
      setHoverIndex(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragIndex, dragOffset, hoverIndex]);

  // ======== CARD RENDERERS ========
  const renderUtilityCard = (util) => (
    <div className="card-inner utility-inner">
      <div className="card-color-band" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <span className="card-icon">{util.icon}</span>
        <h3 className="card-name">{util.name}</h3>
        <span className="card-badge">UTILITY</span>
      </div>
      <div className="card-details">
        <div className="detail-row highlight-row">
          <span>Buying Cost</span>
          <span className="detail-value">₹{util.buyingCost}</span>
        </div>
        <div className="card-rule-box">
          <p>If <strong>one</strong> Utility is owned, rent is <strong>4×</strong> dice amount.</p>
          <p>If <strong>both</strong> Utilities are owned, rent is <strong>10×</strong> dice amount.</p>
        </div>
        <div className="detail-row mortgage-row">
          <span>Mortgage</span>
          <span className="detail-value">₹{util.mortgage}</span>
        </div>
      </div>
    </div>
  );

  const renderPropertyCard = (prop) => (
    <div className="card-inner">
      <div className="card-color-band" style={{ background: getColorGradient(prop.color) }}>
        <div className="card-top-actions">
          <button
            type="button"
            className="card-action-btn edit-btn"
            title="Edit Card Details"
            onClick={(e) => handleOpenEdit(prop, e)}
          >
            ✏️
          </button>
          <button
            type="button"
            className="card-action-btn delete-btn"
            title="Delete Card"
            onClick={(e) => handleDelete(prop._id, prop.name, e)}
          >
            🗑️
          </button>
        </div>
        <h3 className="card-name">{prop.name}</h3>
        <span className="card-badge">TITLE DEED</span>
      </div>
      <div className="card-details">
        <div className="detail-row highlight-row">
          <span>Buying Cost</span>
          <span className="detail-value">₹{prop.buyingCost}</span>
        </div>
        <div className="detail-row sub-row">
          <span>Per Building Cost</span>
          <span className="detail-value dim">₹{prop.buildingCost}</span>
        </div>
        <div className="detail-row base-rent-row">
          <span>Rent (No Building)</span>
          <span className="detail-value accent">₹{prop.baseRent ?? 0}</span>
        </div>
        <div className="rent-grid">
          <div className="rent-item"><span className="rent-label">1🏠</span><span>₹{prop.rent1}</span></div>
          <div className="rent-item"><span className="rent-label">2🏠</span><span>₹{prop.rent2}</span></div>
          <div className="rent-item"><span className="rent-label">3🏠</span><span>₹{prop.rent3}</span></div>
          <div className="rent-item"><span className="rent-label">4🏠</span><span>₹{prop.rent4}</span></div>
        </div>
        <div className="detail-row hotel-row">
          <span>🏨 Hotel Rent</span>
          <span className="detail-value hotel">₹{prop.hotelRent}</span>
        </div>
        <div className="detail-row mortgage-row">
          <span>Mortgage</span>
          <span className="detail-value">₹{prop.mortgage}</span>
        </div>
      </div>
    </div>
  );

  const renderStationCard = (prop) => (
    <div className="card-inner station-inner">
      <div className="card-color-band" style={{ background: 'linear-gradient(135deg, #232526, #414345)' }}>
        <div className="card-top-actions">
          <button
            type="button"
            className="card-action-btn edit-btn"
            title="Edit Card Details"
            onClick={(e) => handleOpenEdit(prop, e)}
          >
            ✏️
          </button>
          <button
            type="button"
            className="card-action-btn delete-btn"
            title="Delete Card"
            onClick={(e) => handleDelete(prop._id, prop.name, e)}
          >
            🗑️
          </button>
        </div>
        <span className="card-icon">🚂</span>
        <h3 className="card-name">{prop.name}</h3>
        <span className="card-badge">STATION</span>
      </div>
      <div className="card-details">
        <div className="detail-row highlight-row">
          <span>Buying Cost</span>
          <span className="detail-value">₹{prop.buyingCost}</span>
        </div>
        <div className="rent-grid">
          <div className="rent-item"><span className="rent-label">1 Stn</span><span>₹{prop.rent1}</span></div>
          <div className="rent-item"><span className="rent-label">2 Stn</span><span>₹{prop.rent2}</span></div>
          <div className="rent-item"><span className="rent-label">3 Stn</span><span>₹{prop.rent3}</span></div>
          <div className="rent-item"><span className="rent-label">4 Stn</span><span>₹{prop.rent4}</span></div>
        </div>
        <div className="detail-row mortgage-row">
          <span>Mortgage</span>
          <span className="detail-value">₹{prop.mortgage}</span>
        </div>
      </div>
    </div>
  );

  const displayedCards = allCards.filter((card) => {
    if (filter === 'all') return true;
    if (filter === 'utilities') return card.type === 'utility';
    if (filter === 'stations') return card.type === 'station';
    if (filter === 'properties') return card.type === 'property' || !card.type;
    return true;
  });

  return (
    <div className="bank-container cards-page-container">
      {/* Top Navigation & Header */}
      <div className="glass-panel cards-nav-panel">
        <div className="cards-nav-content">
          <button
            type="button"
            className="back-home-btn"
            onClick={onBackToHome}
          >
            ← Back to Home
          </button>
          <div className="cards-title-block">
            <h1 className="bank-title">Property Deeds & Bank</h1>
            <p className="bank-subtitle">
              All properties, stations, and utilities in the Monopoly universe ({allCards.length} Cards)
            </p>
          </div>
          <div className="wallet-balance-box">
            <span className="wallet-label">Bank Reserves</span>
            <div className="wallet-balance">₹ {walletBalance.toLocaleString()}</div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="cards-filter-bar">
          <button
            type="button"
            className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Cards ({allCards.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${filter === 'properties' ? 'active' : ''}`}
            onClick={() => setFilter('properties')}
          >
            🏙️ Properties ({allCards.filter((c) => c.type === 'property' || !c.type).length})
          </button>
          <button
            type="button"
            className={`filter-chip ${filter === 'stations' ? 'active' : ''}`}
            onClick={() => setFilter('stations')}
          >
            🚂 Stations ({allCards.filter((c) => c.type === 'station').length})
          </button>
          <button
            type="button"
            className={`filter-chip ${filter === 'utilities' ? 'active' : ''}`}
            onClick={() => setFilter('utilities')}
          >
            ⚡ Utilities ({allCards.filter((c) => c.type === 'utility').length})
          </button>
        </div>
      </div>

      {/* Cards Full-Width Showcase Panel */}
      <div className="glass-panel cards-showcase-panel">
        <div className="cards-showcase-header">
          <span className="hint-pill">💡 Tip: Hold and drag any card to rearrange positions on the board!</span>
        </div>

        {loading ? (
          <div className="loading-text">Loading properties from database...</div>
        ) : (
          <div className="cards-container">
            {displayedCards.length === 0 && (
              <div className="empty-state">No cards matching filter.</div>
            )}

            {displayedCards.map((card, index) => {
              const isDragging = dragIndex === index;
              const isHovered = hoverIndex === index;

              return (
                <React.Fragment key={card._id}>
                  {/* Placeholder keeps grid slot */}
                  {isDragging && <div className="card-placeholder" />}

                  <div
                    ref={(el) => (cardRefs.current[index] = el)}
                    className={`property-card ${isDragging ? 'dragging' : ''} ${isHovered ? 'drop-target' : ''}`}
                    style={
                      isDragging
                        ? {
                            position: 'fixed',
                            left: dragPos.x,
                            top: dragPos.y,
                            zIndex: 9999,
                            pointerEvents: 'none',
                            width: 250,
                          }
                        : {}
                    }
                    onPointerDown={(e) => handlePointerDown(e, index)}
                  >
                    {card.type === 'utility'
                      ? renderUtilityCard(card)
                      : card.type === 'station'
                      ? renderStationCard(card)
                      : renderPropertyCard(card)}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingCard && (
        <div className="modal-backdrop" onClick={() => setEditingCard(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Edit Property Card</h2>
                <p className="modal-subtitle">Update details for &ldquo;{editingCard.name}&rdquo;</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingCard(null)}
              >
                ✕
              </button>
            </div>

            <form className="developer-form modal-form" onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>Place Name</label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditChange}
                  required
                />
              </div>

              {editFormData.type === 'property' && (
                <div className="form-group">
                  <label>Card Color</label>
                  <select
                    name="color"
                    value={editFormData.color}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="brown">Brown</option>
                    <option value="blue">Blue</option>
                    <option value="pink">Pink</option>
                    <option value="safron">Safron</option>
                    <option value="red">Red</option>
                    <option value="yellow">Yellow</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                  </select>
                </div>
              )}

              <div className="form-row-2">
                <div className="form-group">
                  <label>Buying Cost (₹)</label>
                  <input
                    type="number"
                    name="buyingCost"
                    value={editFormData.buyingCost}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mortgage Value (₹)</label>
                  <input
                    type="number"
                    name="mortgage"
                    value={editFormData.mortgage}
                    onChange={handleEditChange}
                    required
                  />
                </div>
              </div>

              {editFormData.type === 'property' && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Per Building Cost (₹)</label>
                    <input
                      type="number"
                      name="buildingCost"
                      value={editFormData.buildingCost}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                  <div className="form-group highlight-input-group">
                    <label>⭐ Base Rent (No Building) (₹)</label>
                    <input
                      type="number"
                      name="baseRent"
                      value={editFormData.baseRent}
                      onChange={handleEditChange}
                      required
                      placeholder="Add base rent"
                      className="accent-input"
                    />
                  </div>
                </div>
              )}

              <div className="form-row-2">
                <div className="form-group">
                  <label>{editFormData.type === 'station' ? 'Rent (1 Station)' : 'Rent (1 House)'}</label>
                  <input
                    type="number"
                    name="rent1"
                    value={editFormData.rent1}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{editFormData.type === 'station' ? 'Rent (2 Stations)' : 'Rent (2 Houses)'}</label>
                  <input
                    type="number"
                    name="rent2"
                    value={editFormData.rent2}
                    onChange={handleEditChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>{editFormData.type === 'station' ? 'Rent (3 Stations)' : 'Rent (3 Houses)'}</label>
                  <input
                    type="number"
                    name="rent3"
                    value={editFormData.rent3}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{editFormData.type === 'station' ? 'Rent (4 Stations)' : 'Rent (4 Houses)'}</label>
                  <input
                    type="number"
                    name="rent4"
                    value={editFormData.rent4}
                    onChange={handleEditChange}
                    required
                  />
                </div>
              </div>

              {editFormData.type === 'property' && (
                <div className="form-group">
                  <label>Hotel Rent (₹)</label>
                  <input
                    type="number"
                    name="hotelRent"
                    value={editFormData.hotelRent}
                    onChange={handleEditChange}
                    required
                  />
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setEditingCard(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn save-btn"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
