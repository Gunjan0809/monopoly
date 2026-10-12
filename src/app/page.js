'use client';

import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import CardsPage from '../components/CardsPage';
import GameSetup from '../components/GameSetup';
import GameSession from '../components/GameSession';

export default function Home() {
  // 'hero' | 'cards' | 'setup' | 'game'
  const [currentView, setCurrentView] = useState('hero');
  const [activePlayers, setActivePlayers] = useState([]);

  // Check if an ongoing game was left in progress, and resume directly!
  useEffect(() => {
    try {
      const saved = localStorage.getItem('monopoly_active_game_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isGameActive && Array.isArray(parsed.players) && parsed.players.length > 0) {
          setActivePlayers(parsed.players);
          setCurrentView('game');
        }
      }
    } catch (err) {
      console.error('Could not restore game session:', err);
    }
  }, []);

  const handleStartGameSession = (finalPlayers) => {
    setActivePlayers(finalPlayers);
    try {
      localStorage.setItem(
        'monopoly_active_game_session',
        JSON.stringify({ isGameActive: true, players: finalPlayers })
      );
    } catch (e) {
      console.error(e);
    }
    setCurrentView('game');
  };

  const handleEndGameSession = () => {
    try {
      localStorage.removeItem('monopoly_active_game_session');
    } catch (e) {
      console.error(e);
    }
    setCurrentView('hero');
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
          onBackToHome={handleEndGameSession}
          onRestartSetup={() => {
            try {
              localStorage.removeItem('monopoly_active_game_session');
            } catch (e) {}
            setCurrentView('setup');
          }}
        />
      )}
    </main>
  );
}
