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

// Memory match cards icons for Lottery Type 2 (10 cards: 5 pairs)
const MEMORY_ICONS = ['🎩', '🚗', '🐕', '🚢', '🚂', '🎩', '🚗', '🐕', '🚢', '🚂'];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  const [ownership, setOwnership] = useState({});

  // Loan state: { [playerId]: { hasActiveLoan: bool, principal: 500, interest: 25, totalDue: 525, whereTaken: string } }
  const [loans, setLoans] = useState({});
  const [loanReasons, setLoanReasons] = useState({}); // { [playerId]: string } (Where loan was taken)

  // Active modal: 'switchPlayer' | 'totalDeck' | 'remainingDeck' | 'loans' | 'log' | 'endGame' | 'settlement' | 'podium' | 'pastGames' | 'addCard' | 'tradeDesk' | 'sellCard' | 'lottery'
  const [activeModal, setActiveModal] = useState(null);

  // Selling / Liquidation Cart State (Fix 3)
  const [sellSelectedCards, setSellSelectedCards] = useState([]); // [cardId] to liquidate completely
  const [sellSelectedHouses, setSellSelectedHouses] = useState({}); // { [cardId]: countOfHousesToSell }

  // Trade Desk State
  const [tradePlayer1Id, setTradePlayer1Id] = useState(null);
  const [tradePlayer2Id, setTradePlayer2Id] = useState(null);
  const [tradeOfferedCards1, setTradeOfferedCards1] = useState([]);
  const [tradeOfferedCards2, setTradeOfferedCards2] = useState([]);
  const [isTradeAnimating, setIsTradeAnimating] = useState(false);

  // End Game Settlement State
  const [settlementCash, setSettlementCash] = useState({}); // { [playerId]: number }
  const [finalGameResults, setFinalGameResults] = useState(null);
  const [dbPastGames, setDbPastGames] = useState([]);

  // Lottery State
  const [lotteryTab, setLotteryTab] = useState('type1'); // 'type1' (Banker Mystery Prize) | 'type2' (10-Card Memory Match)
  // Type 1: Banker Mystery Scratch / Flip
  const [type1PrizeInput, setType1PrizeInput] = useState('₹500 Cash Prize & 1 Free House');
  const [type1ActivePrize, setType1ActivePrize] = useState('₹500 Cash Prize & 1 Free House');
  const [type1IsFlipped, setType1IsFlipped] = useState(false);
  // Board-level sealed lottery box over player boxes (Fix 1)
  const [isBoardLotteryVisible, setIsBoardLotteryVisible] = useState(true);
  const [isBoardLotteryRevealed, setIsBoardLotteryRevealed] = useState(false);

  // Type 2: 10-Card Memory Match Loop
  const [type2PlayerIndex, setType2PlayerIndex] = useState(0); // Loops through players
  const [type2Cards, setType2Cards] = useState([]);
  const [type2FlippedIndices, setType2FlippedIndices] = useState([]);
  const [type2MatchedPairs, setType2MatchedPairs] = useState([]);
  const [type2WinnerAlert, setType2WinnerAlert] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);
  const [gameLogs, setGameLogs] = useState([
    `Game session initialized with ${gamePlayers.length} players.`,
    `Current turn: ${gamePlayers[0]?.name || 'Player 1'}.`,
  ]);

  // Load persistent game session state from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('monopoly_active_game_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ownership) setOwnership(parsed.ownership);
        if (parsed.loans) setLoans(parsed.loans);
        if (parsed.activePlayerIndex !== undefined) setActivePlayerIndex(parsed.activePlayerIndex);
        if (parsed.gameLogs) setGameLogs(parsed.gameLogs);
      }
    } catch (e) {
      console.error('Failed to load local game state:', e);
    }
  }, []);

  // Save persistent state whenever ownership, loans, or turn changes
  useEffect(() => {
    try {
      localStorage.setItem(
        'monopoly_active_game_state',
        JSON.stringify({
          ownership,
          loans,
          activePlayerIndex,
          gameLogs,
        })
      );
    } catch (e) {
      console.error('Failed to save local game state:', e);
    }
  }, [ownership, loans, activePlayerIndex, gameLogs]);

  // Fetch real properties directly from MongoDB Atlas via /api/properties
  useEffect(() => {
    fetchCardsFromDB();
    initMemoryMatchDeck();
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
      }
    } catch (err) {
      console.error('Error fetching cards from database:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const fetchPastGamesFromDB = async () => {
    try {
      const res = await fetch('/api/game-results');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDbPastGames(data.data);
      }
    } catch (err) {
      console.error('Error fetching past games:', err);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  const handleSwitchPlayer = (index) => {
    setActivePlayerIndex(index);
    setActiveModal(null);
    const pName = gamePlayers[index]?.name || `Player ${index + 1}`;
    setGameLogs((prev) => [`Switched active turn to ${pName}.`, ...prev]);
    showToast(`Turn switched to ${pName}`);
  };

  // ================= ASSET VALUE CALCULATION =================
  // User correction: Asset value is the 100% ACTUAL total amount (NO 0.9x factor for portfolio value).
  // 0.9x factor applies ONLY while selling assets to the bank!
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
    return rawTotal;
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

  // ================= PORTFOLIO SELLING / LIQUIDATION SYSTEM (0.9x FACTOR) =================
  // Rule: Selling cards, houses, or cards with houses is paid at 0.9x actual gross value.
  const handleOpenPortfolioSellModal = (preselectedCardId = null) => {
    if (preselectedCardId) {
      setSellSelectedCards([preselectedCardId]);
    } else {
      setSellSelectedCards([]);
    }
    setSellSelectedHouses({});
    setActiveModal('portfolioSell');
  };

  const toggleSelectCardToSell = (cardId) => {
    setSellSelectedCards((prev) => {
      const isSelected = prev.includes(cardId);
      if (isSelected) {
        return prev.filter((id) => id !== cardId);
      } else {
        // Reset individual houses selection for this card since whole card is being sold
        setSellSelectedHouses((hPrev) => {
          const nextH = { ...hPrev };
          delete nextH[cardId];
          return nextH;
        });
        return [...prev, cardId];
      }
    });
  };

  const updateHousesToSell = (cardId, delta, maxErections) => {
    setSellSelectedHouses((prev) => {
      const current = prev[cardId] || 0;
      const nextCount = Math.max(0, Math.min(maxErections, current + delta));
      if (nextCount === 0) {
        const copy = { ...prev };
        delete copy[cardId];
        return copy;
      }
      return { ...prev, [cardId]: nextCount };
    });
  };

  const calculatePortfolioSale = (cardsList) => {
    let grossPlots = 0;
    let grossHousesOnSoldCards = 0;
    let grossIndividualHouses = 0;
    const itemsList = [];

    cardsList.forEach((card) => {
      const own = ownership[card._id] || { erections: 0 };
      const currentErections = Number(own.erections) || 0;
      const landCost = Number(card.buyingCost) || 0;
      const buildingCost = Number(card.buildingCost) || 0;

      if (sellSelectedCards.includes(card._id)) {
        // Entire card is selected to be sold (plot + all erections on it)
        grossPlots += landCost;
        const housesVal = currentErections * buildingCost;
        grossHousesOnSoldCards += housesVal;
        itemsList.push({
          type: 'card',
          cardId: card._id,
          name: card.name,
          color: card.color,
          erections: currentErections,
          detail: currentErections > 0
            ? `Plot (₹${landCost}) + ${currentErections} house(s) (₹${housesVal})`
            : `Plot (₹${landCost})`,
          gross: landCost + housesVal,
        });
      } else {
        // Specific houses on card are selected to be sold
        const housesCount = Number(sellSelectedHouses[card._id]) || 0;
        if (housesCount > 0) {
          const housesVal = housesCount * buildingCost;
          grossIndividualHouses += housesVal;
          itemsList.push({
            type: 'houses',
            cardId: card._id,
            name: card.name,
            color: card.color,
            count: housesCount,
            detail: `${housesCount} house(s) on ${card.name} (₹${buildingCost} ea)`,
            gross: housesVal,
          });
        }
      }
    });

    const totalGross = grossPlots + grossHousesOnSoldCards + grossIndividualHouses;
    const payout09 = Math.round(0.9 * totalGross);

    return {
      grossPlots,
      grossHouses: grossHousesOnSoldCards + grossIndividualHouses,
      totalGross,
      payout09,
      itemsList,
    };
  };

  const handleExecutePortfolioSale = (cardsList) => {
    const sale = calculatePortfolioSale(cardsList);
    if (sale.itemsList.length === 0) {
      showToast('Select at least one card or house to sell!');
      return;
    }

    const player = gamePlayers.find((p) => p.id === viewingPortfolioPlayerId);

    // 1. Update ownership
    setOwnership((prev) => {
      const next = { ...prev };
      // Delete completely sold cards
      sellSelectedCards.forEach((cardId) => {
        delete next[cardId];
      });
      // Deduct sold houses on remaining cards
      Object.entries(sellSelectedHouses).forEach(([cardId, countToSell]) => {
        if (!sellSelectedCards.includes(cardId) && countToSell > 0 && next[cardId]) {
          const currentErections = next[cardId].erections || 0;
          next[cardId] = {
            ...next[cardId],
            erections: Math.max(0, currentErections - countToSell),
          };
        }
      });
      return next;
    });

    // 2. Log and toast
    const itemsSummary = sale.itemsList.map((i) => i.name).join(', ');
    setGameLogs((prev) => [
      `💰 ${player?.name} liquidated [${itemsSummary}] to Bank for ₹${sale.payout09} (0.9x of actual ₹${sale.totalGross}).`,
      ...prev,
    ]);
    showToast(`Sale confirmed! Bank pays ₹${sale.payout09} (0.9x value).`);
    setActiveModal(null);
    setSellSelectedCards([]);
    setSellSelectedHouses({});
  };

  // Take Back Card from Player to Bank (administrative)
  const handleTakeBackCard = (cardId) => {
    const card = allCards.find((c) => c._id === cardId);
    const currentOwner = gamePlayers.find((p) => p.id === ownership[cardId]?.ownerId);
    setOwnership((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
    setGameLogs((prev) => [`Banker returned ${card?.name} from ${currentOwner?.name} to Bank Vault.`, ...prev]);
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
  const handleGrantLoan = (playerId) => {
    const player = gamePlayers.find((p) => p.id === playerId);
    if (loans[playerId]?.hasActiveLoan) {
      showToast(`Cannot issue loan: ${player?.name} already reached their ₹500 loan limit!`);
      return;
    }
    const whereTaken = (loanReasons[playerId] || '').trim() || 'General Use / Emergency';
    setLoans((prev) => ({
      ...prev,
      [playerId]: {
        hasActiveLoan: true,
        principal: 500,
        interest: 25, // 5%
        totalDue: 525,
        whereTaken,
        grantedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    }));
    setGameLogs((prev) => [
      `🏦 Bank granted ₹500 loan to ${player?.name} for [${whereTaken}]. Limit reached. Repayment due: ₹525 with 5% interest.`,
      ...prev,
    ]);
    showToast(`₹500 loan granted to ${player?.name} for "${whereTaken}"!`);
  };

  const handleRepayLoan = (playerId) => {
    const player = gamePlayers.find((p) => p.id === playerId);
    const existingLoan = loans[playerId];
    if (!existingLoan?.hasActiveLoan) {
      showToast(`${player?.name} has no outstanding loans.`);
      return;
    }
    const where = existingLoan.whereTaken || 'Loan';
    setLoans((prev) => ({
      ...prev,
      [playerId]: {
        hasActiveLoan: false,
        principal: 0,
        interest: 0,
        totalDue: 0,
        whereTaken: null,
      },
    }));
    setLoanReasons((prev) => ({ ...prev, [playerId]: '' }));
    setGameLogs((prev) => [
      `💳 ${player?.name} repaid full loan of ₹525 (was taken for "${where}"). ₹500 limit restored!`,
      ...prev,
    ]);
    showToast(`Loan repaid! ₹500 limit restored for ${player?.name}.`);
  };

  // ================= TRADE DESK LOGIC =================
  const toggleTradeCard1 = (cardId) => {
    setTradeOfferedCards1((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const toggleTradeCard2 = (cardId) => {
    setTradeOfferedCards2((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

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
        tradeOfferedCards1.forEach((cId) => {
          if (next[cId]) next[cId] = { ...next[cId], ownerId: tradePlayer2Id };
        });
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
        `🤝 Trade Executed: ${p1?.name} gave [${cards1Names || 'None'}] ⇄ ${p2?.name} gave [${cards2Names || 'None'}].`,
        ...prev,
      ]);

      setTradeOfferedCards1([]);
      setTradeOfferedCards2([]);
      setIsTradeAnimating(false);
      showToast(`Trade completed successfully! Deeds transferred.`);
    }, 600);
  };

  // ================= END GAME & WINNER DECISION LOGIC =================
  const handleProceedToSettlement = () => {
    // Initialize default settlement cash inputs
    const initialCash = {};
    gamePlayers.forEach((p) => {
      initialCash[p.id] = settlementCash[p.id] ?? 1500;
    });
    setSettlementCash(initialCash);
    setActiveModal('settlement');
  };

  const handleFinalizeWinnerAndSaveDB = async () => {
    // Formula: Total Score = Actual Asset Value + Remaining Cash
    const calculatedPlayers = gamePlayers.map((p) => {
      const assetVal = calculatePlayerAssetValue(p.id);
      const cash = Number(settlementCash[p.id]) || 0;
      const totalScore = assetVal + cash;
      const owned = allCards.filter((c) => ownership[c._id]?.ownerId === p.id);
      return {
        id: p.id,
        name: p.name,
        token: p.token?.icon || '👤',
        assetValue: assetVal,
        cashRemaining: cash,
        totalScore,
        deedsCount: owned.length,
        deeds: owned.map((c) => c.name),
        isWinner: false,
      };
    });

    // Sort descending to find winner
    calculatedPlayers.sort((a, b) => b.totalScore - a.totalScore);
    if (calculatedPlayers[0]) {
      calculatedPlayers[0].isWinner = true;
    }

    const winner = calculatedPlayers[0];
    const matchRecord = {
      winnerName: winner.name,
      winnerTotal: winner.totalScore,
      players: calculatedPlayers,
    };

    setFinalGameResults(matchRecord);

    // Save game results to MongoDB Atlas!
    try {
      await fetch('/api/game-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchRecord),
      });
      showToast('Match Results saved securely to MongoDB Atlas!');
    } catch (err) {
      console.error('Failed to save match to DB:', err);
    }

    // Clear active session from localStorage since match concluded!
    try {
      localStorage.removeItem('monopoly_active_game_state');
      localStorage.removeItem('monopoly_active_game_session');
    } catch (e) {}

    setActiveModal('podium');
  };

  // ================= LOTTERY SYSTEMS =================
  // Lottery Type 2: 10-Card Memory Match Deck Init
  const initMemoryMatchDeck = () => {
    const shuffled = shuffleArray(MEMORY_ICONS).map((icon, idx) => ({
      id: idx,
      icon,
    }));
    setType2Cards(shuffled);
    setType2FlippedIndices([]);
    setType2MatchedPairs([]);
    setType2WinnerAlert(null);
  };

  const handleMemoryCardClick = (index) => {
    if (type2FlippedIndices.length >= 2) return;
    if (type2FlippedIndices.includes(index) || type2MatchedPairs.includes(index)) return;

    const newFlipped = [...type2FlippedIndices, index];
    setType2FlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = type2Cards[firstIdx];
      const secondCard = type2Cards[secondIdx];

      if (firstCard.icon === secondCard.icon) {
        // MATCH!
        const curPlayer = gamePlayers[type2PlayerIndex];
        setType2MatchedPairs((prev) => [...prev, firstIdx, secondIdx]);
        setType2WinnerAlert(`🎉 MATCH FOUND! ${curPlayer.name} wins ₹500 Prize!`);
        setGameLogs((prev) => [
          `🎰 LOTTERY WINNER: ${curPlayer.name} matched pair (${firstCard.icon}) and won ₹500 cash prize!`,
          ...prev,
        ]);
        showToast(`${curPlayer.name} won ₹500 in the Lottery!`);
        setTimeout(() => setType2FlippedIndices([]), 800);
      } else {
        // Miss! User rule: automatically refresh deck and advance to next player's turn
        const curPlayer = gamePlayers[type2PlayerIndex];
        setType2WinnerAlert(`❌ Missed! Advancing turn...`);
        setTimeout(() => {
          setType2FlippedIndices([]);
          const nextIdx = (type2PlayerIndex + 1) % gamePlayers.length;
          const nextPlayer = gamePlayers[nextIdx];
          setType2PlayerIndex(nextIdx);
          initMemoryMatchDeck();
          showToast(`No match for ${curPlayer?.name}. Deck refreshed for ${nextPlayer?.name}!`);
        }, 900);
      }
    }
  };

  const handleNextPlayerLotteryChance = () => {
    const nextIdx = (type2PlayerIndex + 1) % gamePlayers.length;
    setType2PlayerIndex(nextIdx);
    initMemoryMatchDeck();
    showToast(`Fresh 10-card deck ready for ${gamePlayers[nextIdx].name}!`);
  };

  // Helper arrays
  const remainingCards = allCards.filter((card) => !ownership[card._id]);
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

              {/* Lottery Button */}
              <button
                type="button"
                className="nav-item-btn nav-btn-lottery"
                onClick={() => setActiveModal('lottery')}
                title="Open Lottery Game"
              >
                <span className="nav-icon">🎰</span>
                <span>Lottery</span>
              </button>

              {/* Match Results from DB */}
              <button
                type="button"
                className="nav-item-btn"
                onClick={() => {
                  fetchPastGamesFromDB();
                  setActiveModal('pastGames');
                }}
                title="View Match Results Saved in DB"
              >
                <span className="nav-icon">🏆</span>
                <span>Match History</span>
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

          {/* SEALED LOTTERY PRIZE OVER PLAYER BOXES (Fix 1) */}
          {isBoardLotteryVisible && (
            <div className="board-lottery-anchor">
              <div
                className={`board-sealed-lottery-card ${isBoardLotteryRevealed ? 'is-revealed' : ''}`}
                onClick={() => {
                  if (!isBoardLotteryRevealed) {
                    setIsBoardLotteryRevealed(true);
                    showToast(`🎉 Prize Revealed: ${type1ActivePrize}`);
                  }
                }}
              >
                <div className="board-lottery-flipper">
                  {/* Front: Sealed State */}
                  <div className="b-face b-face-front">
                    <div className="b-left-block">
                      <span className="b-dice-icon">🎲</span>
                      <div className="b-info-block">
                        <span className="b-status-pill">OFFICIAL LOTTERY SEALED 🔒</span>
                        <span className="b-action-title">Tap to Reveal Winner&rsquo;s Prize</span>
                      </div>
                    </div>
                    <div className="b-tap-prompt">
                      <span>TAP TO REVEAL 🎁</span>
                    </div>
                  </div>

                  {/* Back: Revealed State */}
                  <div className="b-face b-face-back">
                    <div className="b-left-block">
                      <span className="b-trophy-icon">🏆</span>
                      <div className="b-info-block">
                        <span className="b-congrats-pill">CONGRATULATIONS! 🎉</span>
                        <strong className="b-prize-val">{type1ActivePrize}</strong>
                      </div>
                    </div>
                    <div className="b-back-actions">
                      <button
                        type="button"
                        className="b-btn b-btn-reseal"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBoardLotteryRevealed(false);
                          showToast('Prize Resealed inside Card!');
                        }}
                      >
                        🔄 Reseal
                      </button>
                      <button
                        type="button"
                        className="b-btn b-btn-close"
                        title="Dismiss Lottery Banner"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBoardLotteryVisible(false);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                        {cardCount} Deeds • ₹{assetVal} Actual Asset
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
          VIEW B: DEDICATED PLAYER PORTFOLIO SCREEN (With Correct Asset Value & Sell)
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

            {/* Asset Value Tag: 100% Actual Total Asset Value without multiplying factor */}
            <div className="portfolio-asset-tag">
              <span className="asset-tag-label">Actual Total Asset</span>
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
                className="portfolio-nav-action-btn btn-portfolio-sell"
                onClick={() => handleOpenPortfolioSellModal()}
                title="Liquidate cards and houses back to Bank at 0.9x value"
              >
                💰 Sell Assets (0.9x)
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
                  const grossVal = (Number(card.buyingCost) || 0) + (erections * erectionCost);
                  const liquidationPayout = Math.round(0.9 * grossVal);
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

                        {/* 100% Actual Asset Breakdown + 0.9x Sell Value Indicator */}
                        <div className="deed-asset-breakdown">
                          <span className="actual-val-line">
                            Actual Asset: <strong>₹{grossVal}</strong>
                          </span>
                          <span className="liquidation-val-line">
                            Liquidation Payout (0.9x): <strong>₹{liquidationPayout}</strong>
                          </span>
                        </div>

                        {/* Action Buttons: SELL (0.9x) | Trade | Return to Bank */}
                        <div className="deed-card-actions">
                          {/* Sell Option with 0.9x Calculation */}
                          <button
                            type="button"
                            className="deed-action-btn btn-sell-action"
                            onClick={() => handleOpenPortfolioSellModal(card._id)}
                            title="Liquidate cards and houses to Bank at 0.9x value"
                          >
                            💰 Sell (0.9x)
                          </button>

                          <button
                            type="button"
                            className="deed-action-btn btn-trade"
                            onClick={() => {
                              setTradePlayer1Id(portfolioPlayer.id);
                              setTradeOfferedCards1([card._id]);
                              setActiveModal('tradeDesk');
                            }}
                          >
                            🤝 Trade
                          </button>

                          <button
                            type="button"
                            className="deed-action-btn btn-takeback"
                            onClick={() => handleTakeBackCard(card._id)}
                            title="Banker takes card back to Bank Vault"
                          >
                            🏦 Take Back
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

      {/* =========================================================================
          MODAL: PORTFOLIO LIQUIDATION / MULTI-ITEM SELL BASKET (0.9x FACTOR)
          ========================================================================= */}
      {activeModal === 'portfolioSell' && viewingPortfolioPlayerId && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content modal-large portfolio-sell-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>💰 Sell Assets ({portfolioPlayer?.name})</h3>
                <p className="modal-subtitle-note">
                  Select cards or houses to liquidate back to the Bank. All items are redeemed at <strong>90% (0.9x)</strong> of their actual value:
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

            {portfolioCards.length === 0 ? (
              <div className="modal-empty-state">
                {portfolioPlayer?.name} does not own any property deeds to sell!
              </div>
            ) : (
              <div className="portfolio-sell-workspace">
                {/* Left Column: Properties & Erections Picker */}
                <div className="sell-items-picker-col">
                  <h4 className="picker-col-title">Available Portfolio Properties ({portfolioCards.length})</h4>
                  <div className="sell-items-cards-list">
                    {portfolioCards.map((card) => {
                      const cardOwn = ownership[card._id] || { erections: 0 };
                      const erections = Number(cardOwn.erections) || 0;
                      const landCost = Number(card.buyingCost) || 0;
                      const buildingCost = Number(card.buildingCost) || 0;
                      const isCardChecked = sellSelectedCards.includes(card._id);
                      const housesCount = Number(sellSelectedHouses[card._id]) || 0;
                      const bColor = normalizeCardColor(card.color, card.type);

                      return (
                        <div
                          key={card._id}
                          className={`sell-card-selection-row ${isCardChecked ? 'row-card-selected' : ''} ${housesCount > 0 ? 'row-houses-selected' : ''}`}
                        >
                          <div className="sell-row-header">
                            <div className="sell-row-title-wrap">
                              <span className="sell-color-pip" style={{ backgroundColor: bColor }} />
                              <div>
                                <strong className="sell-prop-name">{card.name}</strong>
                                <span className="sell-prop-details">
                                  Plot: ₹{landCost}
                                  {buildingCost > 0 && ` • House: ₹${buildingCost} ea`}
                                  {erections > 0 && ` • (${erections} ${erections === 5 ? 'Hotel' : 'Houses'})`}
                                </span>
                              </div>
                            </div>

                            {/* Checkbox: Sell Entire Card (Plot + All Erections) */}
                            <label className="sell-whole-card-checkbox">
                              <input
                                type="checkbox"
                                checked={isCardChecked}
                                onChange={() => toggleSelectCardToSell(card._id)}
                              />
                              <span>Sell Entire Card</span>
                            </label>
                          </div>

                          {/* Houses Stepper (Available when whole card is NOT selected, and has erections) */}
                          {!isCardChecked && erections > 0 && (
                            <div className="sell-houses-stepper-wrap">
                              <span className="stepper-label">Sell Houses Only:</span>
                              <div className="sell-houses-stepper">
                                <button
                                  type="button"
                                  className="sell-step-btn"
                                  disabled={housesCount <= 0}
                                  onClick={() => updateHousesToSell(card._id, -1, erections)}
                                >
                                  –
                                </button>
                                <span className="sell-step-count">
                                  {housesCount} of {erections} House(s)
                                </span>
                                <button
                                  type="button"
                                  className="sell-step-btn"
                                  disabled={housesCount >= erections}
                                  onClick={() => updateHousesToSell(card._id, 1, erections)}
                                >
                                  +
                                </button>
                              </div>
                              {housesCount > 0 && (
                                <span className="houses-payout-preview">
                                  = ₹{housesCount * buildingCost} (Gross)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Real-Time Liquidation Calculation & Receipt */}
                {(() => {
                  const sale = calculatePortfolioSale(portfolioCards);

                  return (
                    <div className="sell-calculation-receipt-col">
                      <h4 className="receipt-col-title">🧾 Liquidation Calculation</h4>

                      <div className="sell-receipt-box">
                        <div className="receipt-items-breakdown">
                          {sale.itemsList.length === 0 ? (
                            <div className="receipt-no-items">
                              No items selected. Check &ldquo;Sell Entire Card&rdquo; or pick houses to liquidate on the left.
                            </div>
                          ) : (
                            sale.itemsList.map((item, idx) => (
                              <div key={idx} className="receipt-selected-line">
                                <span>• {item.name}: {item.detail}</span>
                                <strong>₹{item.gross}</strong>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="receipt-financial-totals">
                          <div className="r-line gross-total">
                            <span>Total Actual Asset Value:</span>
                            <strong>₹{sale.totalGross}</strong>
                          </div>
                          <div className="r-line rate-spec">
                            <span>Liquidation Multiplier:</span>
                            <strong>0.9x</strong>
                          </div>
                          <div className="r-line final-payout">
                            <span>Bank Payout to Player:</span>
                            <strong className="final-payout-figure">₹{sale.payout09}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="sell-modal-footer-actions">
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={() => setActiveModal(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-confirm-portfolio-sale"
                          disabled={sale.itemsList.length === 0}
                          onClick={() => handleExecutePortfolioSale(portfolioCards)}
                        >
                          Confirm Sale (Bank Pays ₹{sale.payout09}) 💰
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
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
              {/* TRADER 1 BOX */}
              <div className="trade-party-pod pod-left">
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

              {/* CENTRAL EXCHANGE HUB */}
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

              {/* TRADER 2 BOX */}
              <div className="trade-party-pod pod-right">
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

      {/* =========================================================================
          MODAL: LOTTERY SYSTEM (TYPE 1: MYSTERY SCRATCH/FLIP & TYPE 2: 10-CARD MEMORY MATCH)
          ========================================================================= */}
      {activeModal === 'lottery' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content modal-large lottery-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="lottery-modal-titles">
                <h3>🎰 Monopoly Digital Lottery</h3>
                <div className="lottery-tab-switch">
                  <button
                    type="button"
                    className={`lottery-tab-btn ${lotteryTab === 'type1' ? 'active' : ''}`}
                    onClick={() => setLotteryTab('type1')}
                  >
                    🎁 Type 1: Mystery Prize Card
                  </button>
                  <button
                    type="button"
                    className={`lottery-tab-btn ${lotteryTab === 'type2' ? 'active' : ''}`}
                    onClick={() => setLotteryTab('type2')}
                  >
                    🃏 Type 2: 10-Card Memory Match (₹500 Prize)
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                ✕
              </button>
            </div>

            {/* LOTTERY TYPE 1: BANKER MYSTERY PRIZE CARD */}
            {lotteryTab === 'type1' && (
              <div className="lottery-type1-container">
                <div className="type1-banker-controls">
                  <label>Banker Custom Prize Specification:</label>
                  <div className="type1-input-row">
                    <input
                      type="text"
                      className="type1-prize-input"
                      value={type1PrizeInput}
                      onChange={(e) => setType1PrizeInput(e.target.value)}
                      placeholder="e.g. ₹500 Cash, Free House, Electric Company..."
                    />
                    <button
                      type="button"
                      className="type1-set-btn"
                      onClick={() => {
                        setType1ActivePrize(type1PrizeInput || 'Surprise Prize!');
                        setType1IsFlipped(false);
                        showToast('Mystery Prize Sealed inside Card!');
                      }}
                    >
                      Seal in Card 🔒
                    </button>
                  </div>
                </div>

                {/* The Big 3D Mystery Card */}
                <div className="type1-card-stage">
                  <div
                    className={`lottery-flip-card ${type1IsFlipped ? 'is-flipped' : ''}`}
                    onClick={() => {
                      if (!type1IsFlipped) {
                        setType1IsFlipped(true);
                        showToast(`Prize Revealed: ${type1ActivePrize}`);
                      }
                    }}
                  >
                    {/* Front Face: Mystery Closed */}
                    <div className="flip-face flip-front">
                      <div className="mystery-pattern">🎲</div>
                      <span className="mystery-title">OFFICIAL MONOPOLY LOTTERY</span>
                      <div className="mystery-badge">TAP TO REVEAL PRIZE</div>
                      <p className="mystery-hint">Physical draw winner taps here to unlock!</p>
                    </div>

                    {/* Back Face: Revealed Prize */}
                    <div className="flip-face flip-back">
                      <span className="prize-trophy">🏆</span>
                      <span className="prize-congrats">CONGRATULATIONS!</span>
                      <h2 className="prize-text">{type1ActivePrize}</h2>
                      <button
                        type="button"
                        className="prize-reset-chip"
                        onClick={(e) => {
                          e.stopPropagation();
                          setType1IsFlipped(false);
                        }}
                      >
                        🔄 Seal Again for Next Winner
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LOTTERY TYPE 2: 10-CARD MEMORY MATCH (₹500 PRIZE LOOP FOR EACH PLAYER) */}
            {lotteryTab === 'type2' && (
              <div className="lottery-type2-container">
                <div className="type2-player-turn-banner">
                  <div className="type2-player-info">
                    <span className="type2-player-token">
                      {gamePlayers[type2PlayerIndex]?.token?.icon || '👤'}
                    </span>
                    <div>
                      <h4 className="type2-player-heading">
                        {gamePlayers[type2PlayerIndex]?.name}&rsquo;s Chance ({type2PlayerIndex + 1}/{gamePlayers.length})
                      </h4>
                      <p className="type2-player-sub">
                        Flip 2 cards. If both match, win <strong>₹500 Prize</strong>!
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="type2-next-player-btn"
                    onClick={handleNextPlayerLotteryChance}
                  >
                    Next Player Chance ➔
                  </button>
                </div>

                {type2WinnerAlert && (
                  <div className="type2-winner-alert-box">
                    <span>{type2WinnerAlert}</span>
                  </div>
                )}

                {/* 10-Card Memory Grid (5x2) */}
                <div className="memory-cards-grid">
                  {type2Cards.map((card, idx) => {
                    const isFlipped = type2FlippedIndices.includes(idx) || type2MatchedPairs.includes(idx);
                    const isMatched = type2MatchedPairs.includes(idx);

                    return (
                      <div
                        key={idx}
                        className={`memory-card-box ${isFlipped ? 'card-face-up' : 'card-face-down'} ${isMatched ? 'card-matched-glow' : ''}`}
                        onClick={() => handleMemoryCardClick(idx)}
                      >
                        <div className="memory-card-inner">
                          {/* Face Down */}
                          <div className="mem-face mem-back">
                            <span className="mem-back-icon">🎲</span>
                            <span className="mem-back-num">#{idx + 1}</span>
                          </div>
                          {/* Face Up */}
                          <div className="mem-face mem-front">
                            <span className="mem-icon">{card.icon}</span>
                            {isMatched && <span className="mem-match-star">⭐</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: END GAME STEP 1 (CROSS-VERIFICATION POPUP)
          ========================================================================= */}
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
              Are you sure you want to conclude this Monopoly match? You will enter the remaining cash of each player to calculate the champion!
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
                className="btn-primary-settle"
                onClick={handleProceedToSettlement}
              >
                Yes, Enter Final Amounts ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: END GAME STEP 2 (ENTER REMAINING AMOUNT OF EACH PLAYER)
          ========================================================================= */}
      {activeModal === 'settlement' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>🏆 Final Settlement & Winner Decision</h3>
                <p className="modal-subtitle-note">
                  Enter remaining cash in hand for each player. Total = Actual Asset Value + Remaining Cash!
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

            <div className="settlement-players-list">
              {gamePlayers.map((p) => {
                const assetVal = calculatePlayerAssetValue(p.id);
                const cash = Number(settlementCash[p.id]) || 0;
                const total = assetVal + cash;

                return (
                  <div key={p.id} className="settlement-player-row">
                    <div className="settle-identity">
                      <span className="settle-token">{p.token?.icon || '👤'}</span>
                      <div>
                        <h4 className="settle-name">{p.name}</h4>
                        <span className="settle-asset-hint">Asset Value: ₹{assetVal}</span>
                      </div>
                    </div>

                    <div className="settle-input-group">
                      <label>Remaining Cash (₹):</label>
                      <input
                        type="number"
                        className="settle-cash-input"
                        value={settlementCash[p.id] ?? ''}
                        onChange={(e) =>
                          setSettlementCash((prev) => ({
                            ...prev,
                            [p.id]: Number(e.target.value),
                          }))
                        }
                        placeholder="e.g. 1500"
                      />
                    </div>

                    <div className="settle-total-preview">
                      <span className="total-label">Total Score</span>
                      <strong className="total-val">₹{total}</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="settlement-submit-row">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setActiveModal('endGame')}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn-decide-winner"
                onClick={handleFinalizeWinnerAndSaveDB}
              >
                Decide Winner & Save to Database 👑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: WINNER PODIUM & SAVED TO DATABASE ANNOUNCEMENT
          ========================================================================= */}
      {activeModal === 'podium' && finalGameResults && (
        <div className="game-modal-overlay">
          <div className="game-modal-content modal-large podium-modal-content">
            <div className="podium-celebration-header">
              <span className="podium-trophy-icon">🏆</span>
              <h2 className="podium-winner-title">
                {finalGameResults.winnerName} WINS THE GAME!
              </h2>
              <span className="podium-winning-score">
                Total Net Worth: ₹{finalGameResults.winnerTotal}
              </span>
              <span className="db-saved-badge">✓ Match Results Saved to MongoDB Atlas</span>
            </div>

            {/* Ranked Player Standings */}
            <div className="podium-standings-list">
              {finalGameResults.players.map((item, rank) => (
                <div
                  key={item.id}
                  className={`podium-rank-row ${item.isWinner ? 'rank-row-winner' : ''}`}
                >
                  <span className="podium-rank-num">
                    {rank === 0 ? '👑 #1' : `#${rank + 1}`}
                  </span>
                  <span className="podium-player-name">
                    {item.token} {item.name}
                  </span>
                  <div className="podium-score-breakdown">
                    <span>Assets: ₹{item.assetValue}</span>
                    <span>+ Cash: ₹{item.cashRemaining}</span>
                  </div>
                  <strong className="podium-final-score">₹{item.totalScore}</strong>
                </div>
              ))}
            </div>

            <div className="podium-footer-actions">
              <button
                type="button"
                className="btn-view-db-games"
                onClick={() => {
                  fetchPastGamesFromDB();
                  setActiveModal('pastGames');
                }}
              >
                📜 View Past Match Records
              </button>
              <button
                type="button"
                className="btn-finish-home"
                onClick={() => {
                  if (onBackToHome) onBackToHome();
                  else if (onRestartSetup) onRestartSetup();
                }}
              >
                Finish & Exit to Home 🏠
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PAST MATCH RECORDS SAVED IN MONGODB ATLAS
          ========================================================================= */}
      {activeModal === 'pastGames' && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="game-modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>📜 MongoDB Match Records</h3>
                <p className="modal-subtitle-note">
                  All past matches, player portfolios, remaining cash, and winners stored in Atlas:
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

            <div className="db-games-list">
              {dbPastGames.length === 0 ? (
                <div className="modal-empty-state">
                  No completed match records found in database yet. Finish a match to save!
                </div>
              ) : (
                dbPastGames.map((game, gIdx) => (
                  <div key={game._id || gIdx} className="db-game-card">
                    <div className="db-game-header">
                      <div>
                        <span className="db-game-winner">👑 Winner: {game.winnerName} (₹{game.winnerTotal})</span>
                        <span className="db-game-date">
                          {game.playedAt ? new Date(game.playedAt).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                    </div>
                    <div className="db-game-players-preview">
                      {game.players?.map((p, pIdx) => (
                        <div key={pIdx} className="db-player-pill">
                          <span>{p.token} {p.name}: ₹{p.totalScore}</span>
                          <span className="db-sub-pill">({p.deedsCount || 0} deeds, ₹{p.cashRemaining || 0} cash)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
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

                    <div className="loan-card-actions">
                      {!hasLoan ? (
                        <div className="loan-grant-flow">
                          <div className="loan-reason-input-group">
                            <label className="loan-input-label">Where / Reason for Loan:</label>
                            <input
                              type="text"
                              className="loan-reason-input"
                              placeholder="e.g. Buying Plot, Paying Rent, Bail..."
                              value={loanReasons[player.id] || ''}
                              onChange={(e) =>
                                setLoanReasons((prev) => ({
                                  ...prev,
                                  [player.id]: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <button
                            type="button"
                            className="loan-btn btn-grant-loan"
                            onClick={() => handleGrantLoan(player.id)}
                          >
                            Grant ₹500 Loan 💰
                          </button>
                        </div>
                      ) : (
                        <div className="loan-repay-flow">
                          <div className="loan-where-badge">
                            <span className="where-tag-label">📍 Taken For:</span>
                            <strong className="where-tag-value">&ldquo;{pLoan.whereTaken || 'General Loan'}&rdquo;</strong>
                            {pLoan.grantedAt && <span className="where-tag-time">at {pLoan.grantedAt}</span>}
                          </div>
                          <button
                            type="button"
                            className="loan-btn btn-repay-loan"
                            onClick={() => handleRepayLoan(player.id)}
                          >
                            Repay Loan (₹525) 💳
                          </button>
                        </div>
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
    </div>
  );
}
