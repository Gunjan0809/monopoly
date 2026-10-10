'use client';

import React from 'react';
import '../styles/hero.css';

export default function Hero({ onStartGame, onViewCards }) {
  return (
    <div className="hero-container">
      {/* Background ambient glowing spheres */}
      <div className="ambient-sphere sphere-1" />
      <div className="ambient-sphere sphere-2" />
      <div className="ambient-sphere sphere-3" />

      <div className="hero-content">
        {/* Monopoly Badge */}
        <div className="hero-top-badge">
          <span className="badge-dice">🎲</span>
          <span>OFFICIAL MONOPOLY DIGITAL BANK & ENGINE</span>
          <span className="badge-dice">🎲</span>
        </div>

        {/* Main Title */}
        <h1 className="hero-title">
          MONOPOLY
        </h1>

        <p className="hero-tagline">
          The Classic Real Estate Board Game, Powered with Modern Digital Banking, Real-Time Rent Calculation &amp; Turn Order Drafter.
        </p>

        {/* Two Main Action Buttons */}
        <div className="hero-cta-buttons">
          <button
            type="button"
            className="hero-btn primary-start-btn"
            onClick={onStartGame}
          >
            <span className="btn-icon">🎲</span>
            <span className="btn-text-group">
              <span className="btn-title">Start Game</span>
              <span className="btn-subtitle">Set players &amp; pick turn cards</span>
            </span>
            <span className="btn-arrow">→</span>
          </button>

          <button
            type="button"
            className="hero-btn secondary-cards-btn"
            onClick={onViewCards}
          >
            <span className="btn-icon">📜</span>
            <span className="btn-text-group">
              <span className="btn-title">View Property Cards</span>
              <span className="btn-subtitle">Browse &amp; rearrange deeds &amp; utilities</span>
            </span>
            <span className="btn-arrow">→</span>
          </button>
        </div>

        {/* Quick Highlights / Feature Pills */}
        <div className="hero-stats-row">
          <div className="stat-card">
            <span className="stat-icon">🏙️</span>
            <div className="stat-info">
              <h4>All Deeds Saved</h4>
              <p>Stored securely in MongoDB Atlas</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">⚡</span>
            <div className="stat-info">
              <h4>Utilities &amp; Stations</h4>
              <p>Electric, Water &amp; 4 Railway Stations</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">🃏</span>
            <div className="stat-info">
              <h4>Pick-The-Card Mini Game</h4>
              <p>Fair, randomized 3D turn order</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
