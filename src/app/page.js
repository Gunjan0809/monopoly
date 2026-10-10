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

  const handleStartGameSession = (finalPlayers) => {
    setActivePlayers(finalPlayers);
    setCurrentView('game');
  };

  return (
    <main>
      {currentView === 'hero' && (
        <Hero
          onStartGame={() => setCurrentView('setup')}
          onViewCards={() => setCurrentView('cards')}
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
        />
      )}
    </main>
  );
}
