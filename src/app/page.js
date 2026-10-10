'use client';

import React, { useState } from 'react';
import Hero from '../components/Hero';
import CardsPage from '../components/CardsPage';
import GameSetup from '../components/GameSetup';
import GameSession from '../components/GameSession';

export default function Home() {
  // 'hero' | 'cards' | 'setup' | 'game'
  const [currentView, setCurrentView] = useState('hero');
  const [activePlayers, setActivePlayers] = useState([]);
  const [forceLandscape, setForceLandscape] = useState(false);

  const handleStartGameSession = (finalPlayers) => {
    setActivePlayers(finalPlayers);
    setCurrentView('game');
  };

  const handleToggleLandscape = async () => {
    const next = !forceLandscape;
    setForceLandscape(next);

    if (next) {
      try {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen().catch(() => {});
        }
        if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (e) {}
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen().catch(() => {});
        }
        if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch (e) {}
    }
  };

  return (
    <main className={forceLandscape ? 'app-force-horizontal' : ''}>
      {currentView === 'hero' && (
        <Hero
          onStartGame={() => setCurrentView('setup')}
          onViewCards={() => setCurrentView('cards')}
          forceLandscape={forceLandscape}
          onToggleLandscape={handleToggleLandscape}
        />
      )}

      {currentView === 'cards' && (
        <CardsPage
          onBackToHome={() => setCurrentView('hero')}
        />
      )}

      {currentView === 'setup' && (
        <GameSetup
          onBackToHome={() => setCurrentView('hero')}
          onStartGameSession={handleStartGameSession}
        />
      )}

      {currentView === 'game' && (
        <GameSession
          players={activePlayers}
          onBackToHome={() => setCurrentView('hero')}
          onRestartSetup={() => setCurrentView('setup')}
          forceLandscape={forceLandscape}
          onToggleLandscape={handleToggleLandscape}
        />
      )}
    </main>
  );
}
