'use client';

import React, { useState, useEffect, useRef } from 'react';
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

// Spin the Wheel prizes for Lottery Type 3 (8 prizes: 100-300 gap of 50, then -50, -100, 150)
const WHEEL_PRIZES = [
  { id: 0, text: '+₹100', amount: 100, color: '#10b981', secondaryColor: '#059669', textColor: '#ffffff', icon: '💰', label: 'Cash Win' },
  { id: 1, text: '+₹150', amount: 150, color: '#0ea5e9', secondaryColor: '#0284c7', textColor: '#ffffff', icon: '💎', label: 'Diamond Win' },
  { id: 2, text: '+₹200', amount: 200, color: '#8b5cf6', secondaryColor: '#7c3aed', textColor: '#ffffff', icon: '⭐', label: 'Star Win' },
  { id: 3, text: '+₹250', amount: 250, color: '#f59e0b', secondaryColor: '#d97706', textColor: '#000000', icon: '👑', label: 'Royal Win' },
  { id: 4, text: '+₹300', amount: 300, color: '#eab308', secondaryColor: '#ca8a04', textColor: '#000000', icon: '🏆', label: 'Mega Jackpot' },
  { id: 5, text: '-₹50',  amount: -50, color: '#f43f5e', secondaryColor: '#e11d48', textColor: '#ffffff', icon: '⚠️', label: 'Tax Penalty' },
  { id: 6, text: '-₹100', amount: -100, color: '#dc2626', secondaryColor: '#991b1b', textColor: '#ffffff', icon: '💀', label: 'Bank Fee' },
  { id: 7, text: '+₹150', amount: 150, color: '#06b6d4', secondaryColor: '#0891b2', textColor: '#ffffff', icon: '✨', label: 'Lucky Bonus' },
];

const playWheelAudioTickSeries = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const tickTimes = [0.04, 0.12, 0.22, 0.35, 0.50, 0.68, 0.88, 1.05];
    tickTimes.forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800 + Math.random() * 250, now + t);
      gain.gain.setValueAtTime(0.08, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.04);
    });
  } catch (e) {}
};

const playWheelWinChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.12, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.3);
    });
  } catch (e) {}
};

const playWheelLossBuzz = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.linearRampToValueAtTime(105, now + 0.24);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {}
};

const playDiceRattleAudio = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [0.04, 0.14, 0.26, 0.40, 0.55, 0.70].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 260, now + t);
      gain.gain.setValueAtTime(0.08, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.045);
    });
  } catch (e) {}
};

function DiceFaceSvg({ value, size = 64, isRolling = false }) {
  const pipsMap = {
    1: [[30, 30]],
    2: [[18, 18], [42, 42]],
    3: [[18, 18], [30, 30], [42, 42]],
    4: [[18, 18], [42, 18], [18, 42], [42, 42]],
    5: [[18, 18], [42, 18], [30, 30], [18, 42], [42, 42]],
    6: [[18, 16], [42, 16], [18, 30], [42, 30], [18, 44], [42, 44]],
  };

  const pips = pipsMap[value] || pipsMap[1];

  return (
    <svg
      viewBox="0 0 60 60"
      width={size}
      height={size}
      className={`dice-svg-icon ${isRolling ? 'dice-rolling-shake' : ''}`}
    >
      <defs>
        <linearGradient id="diceBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <rect
        x="3"
        y="3"
        width="54"
        height="54"
        rx="12"
        fill="url(#diceBgGrad)"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      <rect
        x="5"
        y="5"
        width="50"
        height="50"
        rx="10"
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.5"
      />
      {pips.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={value === 1 ? 6 : 4.5}
          fill={value === 1 ? '#dc2626' : '#0f172a'}
        />
      ))}
    </svg>
  );
}



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
  const [lotteryTab, setLotteryTab] = useState('type1'); // 'type1' (Mystery Prize) | 'type2' (Memory Match) | 'type3' (Spin Wheel) | 'type4' (Lucky Dice)
  // Type 1: Banker Mystery Scratch / Flip
  const [type1PrizeInput, setType1PrizeInput] = useState('₹500 Cash Prize & 1 Free House');
  const [type1ActivePrize, setType1ActivePrize] = useState('₹500 Cash Prize & 1 Free House');
  // Big Sealed Lottery Overlay that overlaps player boxes on the game board
  const [isBigLotteryOverlayActive, setIsBigLotteryOverlayActive] = useState(false);
  const [isBigLotteryFlipped, setIsBigLotteryFlipped] = useState(false);

  // Type 2: 10-Card Memory Match Loop
  const [type2PlayerIndex, setType2PlayerIndex] = useState(0); // Loops through players
  const [type2Cards, setType2Cards] = useState([]);
  const [type2FlippedIndices, setType2FlippedIndices] = useState([]);
  const [type2MatchedPairs, setType2MatchedPairs] = useState([]);
  const [type2WinnerAlert, setType2WinnerAlert] = useState(null);

  // Type 3: Fast Spin the Wheel (8 Prizes)
  const [wheelPlayerIndex, setWheelPlayerIndex] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelIsSpinning, setWheelIsSpinning] = useState(false);
  const [wheelSelectedPrize, setWheelSelectedPrize] = useState(null);
  const [wheelResults, setWheelResults] = useState({}); // { [playerId]: prize }
  const [wheelRoundComplete, setWheelRoundComplete] = useState(false);
  const wheelAutoTimerRef = useRef(null);

  // Type 4: Lucky Dice Guess (Guess 1-6, Match to win ₹300)
  const [dicePlayerIndex, setDicePlayerIndex] = useState(0);
  const [diceSelectedNumber, setDiceSelectedNumber] = useState(null); // 1 to 6
  const [diceRolledValue, setDiceRolledValue] = useState(null); // 1 to 6
  const [diceAnimValue, setDiceAnimValue] = useState(1);
  const [diceIsRolling, setDiceIsRolling] = useState(false);
  const [diceLastResult, setDiceLastResult] = useState(null);
  const [diceResults, setDiceResults] = useState({}); // { [playerId]: result }
  const [diceRoundComplete, setDiceRoundComplete] = useState(false);
  const diceAutoTimerRef = useRef(null);

  // Gold Ticket Investment System: { [playerId]: { ticketCount: number, baseValue: number, accumulatedProfit: number, currentValue: number, lastRoll: Object } }
  const [investments, setInvestments] = useState({});
  const [investRollingPlayerId, setInvestRollingPlayerId] = useState(null);
  const [investAnimDice, setInvestAnimDice] = useState([1, 1]);

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
        if (parsed.investments) setInvestments(parsed.investments);
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
          investments,
          activePlayerIndex,
          gameLogs,
        })
      );
    } catch (e) {
      console.error('Failed to save local game state:', e);
    }
  }, [ownership, loans, investments, activePlayerIndex, gameLogs]);

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
        const erectionCount = Number(own.erections) || 0;
        const erectionCost = Number(card.buildingCost) || 0;
        const mortgageVal = Number(card.mortgage) || Math.round((Number(card.buyingCost) || 0) / 2);
        // If mortgaged, the equity value is the mortgage amount
        const landValue = own.isMortgaged ? mortgageVal : (Number(card.buyingCost) || 0);
        rawTotal += landValue + (erectionCount * erectionCost);
      }
    });
    // Add player's current Gold Ticket investment value
    const pInv = investments[playerId];
    if (pInv && pInv.currentValue) {
      rawTotal += pInv.currentValue;
    }
    return rawTotal;
  };

  // Calculate rent for a card given its erection level from DB fields
  const getCardCurrentRent = (card, erections = 0) => {
    // If mortgaged, no rent can be collected!
    const own = ownership[card._id];
    if (own?.isMortgaged) {
      return 0;
    }

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
      [cardId]: { ownerId: playerId, erections: 0, isMortgaged: false },
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

  // ================= MORTGAGE SYSTEM LOGIC =================
  // Rule: Can ONLY be mortgaged if ALL erected buildings (houses/hotel) are removed first.
  const handleMortgageCard = (cardId) => {
    const card = allCards.find((c) => c._id === cardId);
    const own = ownership[cardId];
    if (!card || !own) return;

    const erections = Number(own.erections) || 0;
    if (erections > 0) {
      showToast(`⚠️ Cannot mortgage ${card.name}: Remove all ${erections === 5 ? 'hotels' : 'houses'} erected on it first!`);
      return;
    }

    if (own.isMortgaged) {
      showToast(`${card.name} is already mortgaged!`);
      return;
    }

    const player = gamePlayers.find((p) => p.id === own.ownerId);
    const mortgageVal = Number(card.mortgage) || Math.round((Number(card.buyingCost) || 0) / 2);

    setOwnership((prev) => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        isMortgaged: true,
      },
    }));

    setGameLogs((prev) => [
      `🏦 ${player?.name || 'Player'} mortgaged ${card.name} to the Bank for ₹${mortgageVal}. (Card turned face down)`,
      ...prev,
    ]);
    showToast(`🏦 ${card.name} is now mortgaged! Bank pays ₹${mortgageVal}.`);
  };

  const handleUnmortgageCard = (cardId) => {
    const card = allCards.find((c) => c._id === cardId);
    const own = ownership[cardId];
    if (!card || !own) return;

    const player = gamePlayers.find((p) => p.id === own.ownerId);
    const mortgageVal = Number(card.mortgage) || Math.round((Number(card.buyingCost) || 0) / 2);

    setOwnership((prev) => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        isMortgaged: false,
      },
    }));

    setGameLogs((prev) => [
      `🔓 ${player?.name || 'Player'} lifted mortgage on ${card.name} (Repaid ₹${mortgageVal} to Bank). Card turned face up.`,
      ...prev,
    ]);
    showToast(`🔓 Mortgage lifted on ${card.name}! Rent and actions restored.`);
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

  // Lottery Type 3: Spin the Wheel Handlers
  const handleSpinWheel = () => {
    if (wheelIsSpinning || wheelRoundComplete) return;
    if (wheelAutoTimerRef.current) clearTimeout(wheelAutoTimerRef.current);

    const curPlayer = gamePlayers[wheelPlayerIndex] || gamePlayers[0];
    const targetSector = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const prize = WHEEL_PRIZES[targetSector];

    const targetMidAngle = targetSector * 45 + 22.5;
    const jitter = (Math.random() - 0.5) * 16;
    const targetFinalAngle = (270 - targetMidAngle + jitter + 3600) % 360;

    const currentAngleMod = wheelRotation % 360;
    let angleDiff = targetFinalAngle - currentAngleMod;
    if (angleDiff <= 0) angleDiff += 360;

    // Fast 5 full rotations (1800 deg) + angleDiff
    const nextRotation = wheelRotation + (5 * 360) + angleDiff;

    setWheelIsSpinning(true);
    setWheelSelectedPrize(null);
    setWheelRotation(nextRotation);

    playWheelAudioTickSeries();

    // 1.15 seconds fast animation duration (consumes less time as requested)
    setTimeout(() => {
      setWheelIsSpinning(false);
      setWheelSelectedPrize(prize);

      setWheelResults((prev) => ({
        ...prev,
        [curPlayer.id]: prize,
      }));

      if (prize.amount > 0) {
        setGameLogs((prev) => [
          `🎡 LOTTERY WHEEL: ${curPlayer.name} spun and won ${prize.text} (${prize.label})!`,
          ...prev,
        ]);
        showToast(`🎉 ${curPlayer.name} won ${prize.text}!`);
        playWheelWinChime();
      } else {
        setGameLogs((prev) => [
          `💸 LOTTERY WHEEL PENALTY: ${curPlayer.name} spun and got penalty ${prize.text} (${prize.label})!`,
          ...prev,
        ]);
        showToast(`⚠️ ${curPlayer.name} got penalty ${prize.text}!`);
        playWheelLossBuzz();
      }

      const isLast = wheelPlayerIndex >= gamePlayers.length - 1;
      if (isLast) {
        setWheelRoundComplete(true);
      } else {
        // Auto-refresh spin for next player after quick 2s celebration
        wheelAutoTimerRef.current = setTimeout(() => {
          handleAdvanceWheelPlayer(wheelPlayerIndex + 1);
        }, 2000);
      }
    }, 1150);
  };

  const handleAdvanceWheelPlayer = (nextIdx) => {
    if (wheelAutoTimerRef.current) clearTimeout(wheelAutoTimerRef.current);
    const targetIdx = nextIdx !== undefined ? nextIdx : wheelPlayerIndex + 1;
    if (targetIdx < gamePlayers.length) {
      setWheelPlayerIndex(targetIdx);
      setWheelSelectedPrize(null);
      showToast(`Wheel refreshed & ready for ${gamePlayers[targetIdx].name}!`);
    } else {
      setWheelRoundComplete(true);
    }
  };

  const handleRestartWheelRound = () => {
    if (wheelAutoTimerRef.current) clearTimeout(wheelAutoTimerRef.current);
    setWheelPlayerIndex(0);
    setWheelSelectedPrize(null);
    setWheelResults({});
    setWheelRoundComplete(false);
    showToast(`New Wheel Round started! Ready for ${gamePlayers[0]?.name}.`);
  };

  // Lottery Type 4: Lucky Dice Handlers (Choose 1-6, roll dice, match to win ₹300)
  const handleRollDiceLottery = () => {
    if (diceIsRolling || !diceSelectedNumber || diceRoundComplete) return;
    if (diceAutoTimerRef.current) clearTimeout(diceAutoTimerRef.current);

    const curPlayer = gamePlayers[dicePlayerIndex] || gamePlayers[0];
    const finalRoll = Math.floor(Math.random() * 6) + 1; // 1 to 6
    const isMatch = finalRoll === diceSelectedNumber;

    setDiceIsRolling(true);
    setDiceLastResult(null);

    playDiceRattleAudio();

    // Fast pip tumbling cycle
    const rollInterval = setInterval(() => {
      setDiceAnimValue(Math.floor(Math.random() * 6) + 1);
    }, 70);

    // 0.85s fast rolling animation
    setTimeout(() => {
      clearInterval(rollInterval);
      setDiceIsRolling(false);
      setDiceRolledValue(finalRoll);
      setDiceAnimValue(finalRoll);

      const result = {
        playerId: curPlayer.id,
        playerName: curPlayer.name,
        chosen: diceSelectedNumber,
        rolled: finalRoll,
        isMatch,
        prize: isMatch ? 300 : 0,
      };

      setDiceLastResult(result);
      setDiceResults((prev) => ({
        ...prev,
        [curPlayer.id]: result,
      }));

      if (isMatch) {
        setGameLogs((prev) => [
          `🎲 LUCKY DICE WINNER: ${curPlayer.name} predicted ${diceSelectedNumber} and rolled ${finalRoll}! Won ₹300 Cash Prize!`,
          ...prev,
        ]);
        showToast(`🎉 JACKPOT! ${curPlayer.name} guessed ${diceSelectedNumber} & won ₹300!`);
        playWheelWinChime();
      } else {
        setGameLogs((prev) => [
          `🎲 LUCKY DICE: ${curPlayer.name} chose ${diceSelectedNumber} but rolled ${finalRoll}. No prize.`,
          ...prev,
        ]);
        showToast(`Missed! ${curPlayer.name} chose ${diceSelectedNumber}, rolled ${finalRoll}`);
        playWheelLossBuzz();
      }

      const isLast = dicePlayerIndex >= gamePlayers.length - 1;
      if (isLast) {
        setDiceRoundComplete(true);
      } else {
        // Auto-refresh for next player after 2.2s celebration
        diceAutoTimerRef.current = setTimeout(() => {
          handleAdvanceDicePlayer(dicePlayerIndex + 1);
        }, 2200);
      }
    }, 850);
  };

  const handleAdvanceDicePlayer = (nextIdx) => {
    if (diceAutoTimerRef.current) clearTimeout(diceAutoTimerRef.current);
    const targetIdx = nextIdx !== undefined ? nextIdx : dicePlayerIndex + 1;
    if (targetIdx < gamePlayers.length) {
      setDicePlayerIndex(targetIdx);
      setDiceSelectedNumber(null);
      setDiceRolledValue(null);
      setDiceLastResult(null);
      showToast(`Lucky Dice ready for ${gamePlayers[targetIdx].name}!`);
    } else {
      setDiceRoundComplete(true);
    }
  };

  const handleRestartDiceRound = () => {
    if (diceAutoTimerRef.current) clearTimeout(diceAutoTimerRef.current);
    setDicePlayerIndex(0);
    setDiceSelectedNumber(null);
    setDiceRolledValue(null);
    setDiceLastResult(null);
    setDiceResults({});
    setDiceRoundComplete(false);
    showToast(`New Dice Round started! Ready for ${gamePlayers[0]?.name}.`);
  };

  // ================= GOLD TICKET INVESTMENT SYSTEM =================
  const handleBuyGoldTicket = (playerId) => {
    const curPlayer = gamePlayers.find((p) => p.id === playerId);
    if (!curPlayer) return;

    setInvestments((prev) => {
      const pInv = prev[playerId] || {
        ticketCount: 0,
        baseValue: 0,
        accumulatedProfit: 0,
        currentValue: 0,
        lastRoll: null,
      };

      const newTicketCount = (pInv.ticketCount || 0) + 1;
      const newBaseValue = newTicketCount * 200;
      const prevProfit = pInv.accumulatedProfit || 0;
      const newCurrentValue = Math.max(0, newBaseValue + prevProfit);

      const updated = {
        ...pInv,
        ticketCount: newTicketCount,
        baseValue: newBaseValue,
        accumulatedProfit: prevProfit,
        currentValue: newCurrentValue,
      };

      setGameLogs((logs) => [
        `🎟️ GOLD TICKET: ${curPlayer.name} bought 1 Gold Ticket for ₹200. Total: ${newTicketCount} Tickets, Base: ₹${newBaseValue}, Current Value: ₹${newCurrentValue}.`,
        ...logs,
      ]);
      showToast(`🎟️ Bought Gold Ticket for ${curPlayer.name}! Base now ₹${newBaseValue}.`);

      return {
        ...prev,
        [playerId]: updated,
      };
    });
  };

  const handleSellGoldTicket = (playerId) => {
    const curPlayer = gamePlayers.find((p) => p.id === playerId);
    if (!curPlayer) return;

    setInvestments((prev) => {
      const pInv = prev[playerId];
      if (!pInv || pInv.ticketCount <= 0) return prev;

      const perTicketVal = Math.round(pInv.currentValue / pInv.ticketCount);
      const newTicketCount = pInv.ticketCount - 1;

      if (newTicketCount === 0) {
        setGameLogs((logs) => [
          `💰 GOLD CASHOUT: ${curPlayer.name} cashed out last Gold Ticket for ₹${perTicketVal}. Investment closed.`,
          ...logs,
        ]);
        showToast(`💰 ${curPlayer.name} cashed out last ticket for ₹${perTicketVal}!`);

        return {
          ...prev,
          [playerId]: {
            ticketCount: 0,
            baseValue: 0,
            accumulatedProfit: 0,
            currentValue: 0,
            lastRoll: null,
          },
        };
      }

      const newBaseValue = newTicketCount * 200;
      const newProfit = Math.round((pInv.accumulatedProfit / pInv.ticketCount) * newTicketCount);
      const newCurrentValue = Math.max(0, newBaseValue + newProfit);

      setGameLogs((logs) => [
        `💰 GOLD CASHOUT: ${curPlayer.name} cashed out 1 Gold Ticket for ₹${perTicketVal}. Remaining: ${newTicketCount} Tickets, Value: ₹${newCurrentValue}.`,
        ...logs,
      ]);
      showToast(`💰 Cashed out 1 ticket for ₹${perTicketVal}!`);

      return {
        ...prev,
        [playerId]: {
          ...pInv,
          ticketCount: newTicketCount,
          baseValue: newBaseValue,
          accumulatedProfit: newProfit,
          currentValue: newCurrentValue,
        },
      };
    });
  };

  const handleRollInvestmentDice = (playerId) => {
    if (investRollingPlayerId) return;
    const curPlayer = gamePlayers.find((p) => p.id === playerId);
    const pInv = investments[playerId];
    if (!curPlayer || !pInv || pInv.ticketCount <= 0) return;

    // Generate final 2 dice values
    const finalD1 = Math.floor(Math.random() * 6) + 1;
    const finalD2 = Math.floor(Math.random() * 6) + 1;
    const sum = finalD1 + finalD2;

    // Multiplier lookup
    let percent = 0;
    if (sum <= 2) percent = -0.50; // -50%
    else if (sum <= 4) percent = -0.25; // -25%
    else if (sum <= 6) percent = -0.10; // -10%
    else if (sum <= 9) percent = 0.25;  // +25%
    else if (sum <= 11) percent = 0.50; // +50%
    else percent = 1.00; // +100%

    // Calculate rate change strictly on baseValue (Tickets * 200)
    const changeAmount = Math.round(pInv.baseValue * percent);
    const newProfit = (pInv.accumulatedProfit || 0) + changeAmount;
    const newCurrentValue = Math.max(0, pInv.baseValue + newProfit);

    setInvestRollingPlayerId(playerId);
    playDiceRattleAudio();

    // Fast 2-dice pip tumble cycle
    const cycleInterval = setInterval(() => {
      setInvestAnimDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 65);

    // 0.85s fast roll duration
    setTimeout(() => {
      clearInterval(cycleInterval);
      setInvestRollingPlayerId(null);
      setInvestAnimDice([finalD1, finalD2]);

      const lastRoll = {
        d1: finalD1,
        d2: finalD2,
        sum,
        percent,
        changeAmount,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setInvestments((prev) => ({
        ...prev,
        [playerId]: {
          ...pInv,
          accumulatedProfit: newProfit,
          currentValue: newCurrentValue,
          lastRoll,
        },
      }));

      if (percent > 0) {
        setGameLogs((logs) => [
          `📈 GOLD TICKET SURGE: ${curPlayer.name} rolled 🎲${finalD1}+🎲${finalD2} = ${sum} (+${percent * 100}% on Base ₹${pInv.baseValue})! Gain: +₹${changeAmount}, New Value: ₹${newCurrentValue} 🔺!`,
          ...logs,
        ]);
        showToast(`📈 🔺 ${curPlayer.name} rolled ${sum} (+${percent * 100}%)! Value: ₹${newCurrentValue}`);
        playWheelWinChime();
      } else {
        setGameLogs((logs) => [
          `📉 GOLD TICKET DROP: ${curPlayer.name} rolled 🎲${finalD1}+🎲${finalD2} = ${sum} (${percent * 100}% on Base ₹${pInv.baseValue})! Drop: -₹${Math.abs(changeAmount)}, New Value: ₹${newCurrentValue} 🔻!`,
          ...logs,
        ]);
        showToast(`📉 🔻 ${curPlayer.name} rolled ${sum} (${percent * 100}%)! Value: ₹${newCurrentValue}`);
        playWheelLossBuzz();
      }
    }, 850);
  };

  // Big Sealed Lottery Overlay Handlers (Overlapping Player Boxes)
  const lotteryVanishTimerRef = useRef(null);

  const handleRevealBigLottery = () => {
    if (isBigLotteryFlipped) return;
    setIsBigLotteryFlipped(true);
    setGameLogs((prev) => [
      `🎰 LOTTERY REVEALED: Physical draw winner tapped and revealed "${type1ActivePrize}"!`,
      ...prev,
    ]);
    showToast(`🎉 Prize Revealed: ${type1ActivePrize}`);

    // Automatically vanish card and return to normal game page after 3.2s
    if (lotteryVanishTimerRef.current) clearTimeout(lotteryVanishTimerRef.current);
    lotteryVanishTimerRef.current = setTimeout(() => {
      setIsBigLotteryOverlayActive(false);
      setIsBigLotteryFlipped(false);
    }, 3200);
  };

  const handleDismissBigLottery = () => {
    if (lotteryVanishTimerRef.current) clearTimeout(lotteryVanishTimerRef.current);
    setIsBigLotteryOverlayActive(false);
    setIsBigLotteryFlipped(false);
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

          {/* MAIN PLAYER BOXES CONTAINER (Tap opens Portfolio!) */}
          <main className="player-boxes-stage" style={{ '--player-count': gamePlayers.length }}>
            {/* BIG SEALED LOTTERY CARD OVERLAPPING PLAYER BOXES (Fix 1) */}
            {isBigLotteryOverlayActive && (
              <div
                className="big-lottery-stage-overlay"
                onClick={() => {
                  if (isBigLotteryFlipped) handleDismissBigLottery();
                }}
              >
                <div
                  className={`big-lottery-flip-card ${isBigLotteryFlipped ? 'is-flipped' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isBigLotteryFlipped) {
                      handleRevealBigLottery();
                    } else {
                      handleDismissBigLottery();
                    }
                  }}
                >
                  {/* Front: Big Sealed Mystery Card Overlapping Player Boxes */}
                  <div className="big-flip-face big-flip-front">
                    <div className="big-seal-ribbon">OFFICIAL BANK LOTTERY</div>
                    <div className="big-seal-dice">🎲</div>
                    <h2 className="big-seal-title">TAP TO REVEAL LOTTERY</h2>
                    <div className="big-seal-badge">PHYSICAL DRAW WINNER TAP HERE 🎁</div>
                    <p className="big-seal-hint">Tap anywhere on this card to reveal the sealed prize!</p>
                  </div>

                  {/* Back: Revealed Prize */}
                  <div className="big-flip-face big-flip-back">
                    <div className="big-trophy-icon">🏆</div>
                    <span className="big-congrats-sub">CONGRATULATIONS! 🎉</span>
                    <h1 className="big-prize-heading">{type1ActivePrize}</h1>
                    <p className="big-auto-dismiss-note">Card vanishes in a moment • Tap to return to game</p>
                    <button
                      type="button"
                      className="btn-continue-to-game"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismissBigLottery();
                      }}
                    >
                      Return to Game ➔
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                      <div className="card-preview-sub-row">
                        <span className="card-preview-subtitle">
                          {cardCount} Deeds • ₹{assetVal} Actual Asset
                        </span>
                        {/* Gold Ticket Live Indicator */}
                        {(() => {
                          const pInv = investments[player.id];
                          if (!pInv || !pInv.ticketCount) return null;
                          const isUp = pInv.currentValue > pInv.baseValue;
                          const isDown = pInv.currentValue < pInv.baseValue;
                          return (
                            <span
                              className={`box-invest-chip ${isUp ? 'pill-up' : isDown ? 'pill-down' : 'pill-neutral'}`}
                              title={`Base: ₹${pInv.baseValue} | Current: ₹${pInv.currentValue}`}
                            >
                              🎟️ {pInv.ticketCount}Tk: ₹{pInv.currentValue} {isUp ? '📈 🔺' : isDown ? '📉 🔻' : '➖'}
                            </span>
                          );
                        })()}
                      </div>
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
                className="portfolio-nav-action-btn btn-portfolio-investment"
                onClick={() => setActiveModal('investmentDesk')}
                title="Open Gold Ticket Investment Desk"
              >
                <span>🎟️</span>
                <span>Investment</span>
                {(() => {
                  const inv = investments[portfolioPlayer.id];
                  if (!inv || !inv.ticketCount) return null;
                  const isUp = inv.currentValue > inv.baseValue;
                  const isDown = inv.currentValue < inv.baseValue;
                  return (
                    <span className={`nav-invest-pill ${isUp ? 'pill-up' : isDown ? 'pill-down' : 'pill-neutral'}`}>
                      {inv.ticketCount}Tk {isUp ? '📈 🔺' : isDown ? '📉 🔻' : '➖'}
                    </span>
                  );
                })()}
              </button>

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

          {/* MAIN SCREEN: PORTFOLIO STAGE (HORIZONTAL CAROUSEL OF PROPERTY DEEDS) */}
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
                  const cardOwn = ownership[card._id] || { erections: 0, isMortgaged: false };
                  const isMortgaged = !!cardOwn.isMortgaged;
                  const erections = cardOwn.erections || 0;
                  const currentRent = getCardCurrentRent(card, erections);
                  const canErect = card.type === 'property' && (Number(card.buildingCost) || 0) > 0;
                  const erectionCost = Number(card.buildingCost) || 0;
                  const mortgageVal = Number(card.mortgage) || Math.round((Number(card.buyingCost) || 0) / 2);
                  const grossVal = isMortgaged
                    ? mortgageVal
                    : (Number(card.buyingCost) || 0) + (erections * erectionCost);
                  const liquidationPayout = Math.round(0.9 * grossVal);
                  const bannerColor = normalizeCardColor(card.color, card.type);

                  return (
                    <div
                      key={card._id}
                      className={`deed-carousel-card-container ${isMortgaged ? 'is-mortgaged' : ''}`}
                    >
                      <div className="deed-card-flip-inner">
                        {/* ================= FRONT SIDE (ACTIVE DEED) ================= */}
                        <div className="deed-carousel-card deed-card-face deed-card-front">
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

                            {/* Action Buttons: SELL | TRADE | MORTGAGE | TAKE BACK */}
                            <div className="deed-card-actions">
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

                              {/* Mortgage Button: Only allowed if all erections (houses/hotel) are cleared */}
                              <button
                                type="button"
                                className={`deed-action-btn btn-mortgage-action ${erections > 0 ? 'btn-mortgage-locked' : ''}`}
                                onClick={() => handleMortgageCard(card._id)}
                                title={
                                  erections > 0
                                    ? `Cannot mortgage: Remove all ${erections} ${erections === 5 ? 'hotels' : 'houses'} first`
                                    : `Mortgage ${card.name} to Bank for ₹${mortgageVal}`
                                }
                              >
                                {erections > 0 ? '⚠️ Mortg. (Clear Houses)' : `🏦 Mortgage (₹${mortgageVal})`}
                              </button>

                              <button
                                type="button"
                                className="deed-action-btn btn-takeback"
                                onClick={() => handleTakeBackCard(card._id)}
                                title="Banker takes card back to Bank Vault"
                              >
                                🏦 Vault
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* ================= BACK SIDE (MORTGAGED FLIPPED DOWN STATE) ================= */}
                        <div className="deed-carousel-card deed-card-face deed-card-back mortgaged-card-back">
                          {/* Card Name in the Top Banner */}
                          <div
                            className="deed-card-banner mortgaged-banner"
                            style={{ backgroundColor: bannerColor }}
                          >
                            <span className="banner-type-tag">⚠️ MORTGAGED PROPERTY</span>
                            <h3 className="banner-card-name">{card.name}</h3>
                          </div>

                          {/* Mortgaged Card Content Body */}
                          <div className="deed-card-body mortgaged-card-body">
                            <div className="mortgaged-stamp-badge">
                              <span className="mortgaged-stamp-icon">🔒</span>
                              <div className="mortgaged-stamp-text">
                                <span className="mortgaged-stamp-main">MORTGAGED</span>
                                <span className="mortgaged-stamp-sub">The Card is Mortgaged</span>
                              </div>
                            </div>

                            <div className="mortgaged-details-card">
                              <div className="mortgaged-stat-row">
                                <span className="stat-label">Mortgage Received:</span>
                                <span className="stat-val payout-val">₹{mortgageVal}</span>
                              </div>
                              <div className="mortgaged-stat-row">
                                <span className="stat-label">Rent Status:</span>
                                <span className="stat-val rent-zero-val">₹0 (Suspended)</span>
                              </div>
                              <div className="mortgaged-rules-box">
                                <p>• Card is turned face down.</p>
                                <p>• All buildings were cleared prior to mortgage.</p>
                                <p>• No rent can be collected while mortgaged.</p>
                              </div>
                            </div>

                            {/* Unmortgage / Lift Mortgage Button */}
                            <div className="mortgaged-card-actions">
                              <button
                                type="button"
                                className="deed-action-btn btn-unmortgage-action"
                                onClick={() => handleUnmortgageCard(card._id)}
                                title={`Repay ₹${mortgageVal} to Bank to unmortgage ${card.name}`}
                              >
                                🔓 Lift Mortgage (Pay ₹{mortgageVal})
                              </button>
                            </div>
                          </div>
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
          MODAL: DEDICATED GOLD TICKET INVESTMENT DESK PAGE
          ========================================================================= */}
      {activeModal === 'investmentDesk' && viewingPortfolioPlayerId && (
        <div className="game-modal-overlay" onClick={() => setActiveModal(null)}>
          <div
            className="game-modal-content modal-large investment-modal-page"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header investment-modal-header">
              <div className="invest-header-left">
                <button
                  type="button"
                  className="invest-modal-back-btn"
                  onClick={() => setActiveModal(null)}
                >
                  ← Back to {portfolioPlayer?.name}&rsquo;s Portfolio
                </button>
                <div className="invest-header-titles">
                  <h3 className="invest-modal-title">
                    🏆 {portfolioPlayer?.name}&rsquo;s Gold Ticket Investment Desk
                  </h3>
                  <p className="modal-subtitle-note">
                    Banker sells Gold Tickets for ₹200 each. Roll two virtual dice to fluctuate the rate strictly on Base Value!
                  </p>
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

            {/* GOLD TICKET INVESTMENT DESK CONTENT */}
            {(() => {
              const inv = investments[portfolioPlayer?.id] || {
                ticketCount: 0,
                baseValue: 0,
                accumulatedProfit: 0,
                currentValue: 0,
                lastRoll: null,
              };
              const isUp = inv.currentValue > inv.baseValue;
              const isDown = inv.currentValue < inv.baseValue;
              const isRolling = investRollingPlayerId === portfolioPlayer?.id;
              const [d1, d2] = isRolling
                ? investAnimDice
                : inv.lastRoll
                ? [inv.lastRoll.d1, inv.lastRoll.d2]
                : [1, 1];

              return (
                <div className="portfolio-gold-investment-card in-modal">
                  {/* Card Header with Shimmer & Trend Badge */}
                  <div className="invest-card-header">
                    <div className="invest-card-titles">
                      <div className="invest-ribbon">
                        <span className="invest-ribbon-trophy">🏆</span>
                        <span className="invest-ribbon-text">GOLD TICKET INVESTMENT</span>
                        <span className="invest-rate-badge">₹200 Base Price</span>
                      </div>
                      <h4 className="invest-portfolio-heading">
                        Market Position: {portfolioPlayer?.name}
                      </h4>
                    </div>

                    {/* Bar Up / Bar Down Trend Badge */}
                    <div className={`invest-trend-badge ${isUp ? 'trend-up' : isDown ? 'trend-down' : 'trend-even'}`}>
                      <span className="trend-bar-icon">
                        {isUp ? '📈 🔺' : isDown ? '📉 🔻' : '➖'}
                      </span>
                      <div className="trend-bar-text">
                        <span className="trend-bar-status">
                          {isUp ? 'BAR UP (RATE HIKE)' : isDown ? 'BAR DOWN (REGRESSION)' : 'BASE VALUE RATE'}
                        </span>
                        <span className="trend-bar-diff">
                          {isUp ? `+₹${inv.accumulatedProfit} Profit` : isDown ? `-₹${Math.abs(inv.accumulatedProfit)} Loss` : '₹0 Change'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics Grid */}
                  <div className="invest-stats-grid">
                    <div className="invest-stat-box">
                      <span className="stat-label">Tickets Owned</span>
                      <strong className="stat-val stat-tickets">
                        🎟️ {inv.ticketCount} {inv.ticketCount === 1 ? 'Ticket' : 'Tickets'}
                      </strong>
                    </div>

                    <div className="invest-stat-box">
                      <span className="stat-label">Base Value ({inv.ticketCount} × ₹200)</span>
                      <strong className="stat-val stat-base">
                        ₹{inv.baseValue}
                      </strong>
                    </div>

                    <div className="invest-stat-box highlight-box">
                      <span className="stat-label">Current Total Value</span>
                      <strong className={`stat-val stat-current ${isUp ? 'text-profit' : isDown ? 'text-loss' : ''}`}>
                        ₹{inv.currentValue}
                      </strong>
                    </div>

                    <div className="invest-stat-box">
                      <span className="stat-label">Total Gain / Loss</span>
                      <strong className={`stat-val ${isUp ? 'text-profit' : isDown ? 'text-loss' : 'text-neutral'}`}>
                        {isUp ? `+₹${inv.accumulatedProfit}` : isDown ? `-₹${Math.abs(inv.accumulatedProfit)}` : '₹0'}
                      </strong>
                    </div>
                  </div>

                  {/* Base Value Non-Compounding Notice */}
                  <div className="invest-base-rule-note">
                    <span className="note-bulb">💡</span>
                    <span className="note-text">
                      <strong>Base Value Rule:</strong> All rate hikes and drops apply strictly to <strong>Base ₹{inv.baseValue}</strong>, preserving past profit/loss without compounding.
                    </span>
                  </div>

                  {/* 2-Dice Market Fluctuation Roller */}
                  <div className="invest-dice-stage">
                    <div className="dice-roller-header">
                      <div className="roller-title-group">
                        <span className="roller-title">🎲 2-Dice Market Fluctuation</span>
                        <span className="roller-sub">Roll two virtual dice to determine rate hike or regression</span>
                      </div>
                      {inv.lastRoll && (
                        <div className="last-roll-badge">
                          <span>Last Roll:</span>
                          <strong>
                            🎲{inv.lastRoll.d1} + 🎲{inv.lastRoll.d2} = {inv.lastRoll.sum} ({inv.lastRoll.percent > 0 ? '+' : ''}{Math.round(inv.lastRoll.percent * 100)}%)
                          </strong>
                        </div>
                      )}
                    </div>

                    <div className="invest-dice-arena">
                      <div className={`two-dice-wrapper ${isRolling ? 'is-rolling-dice' : ''}`}>
                        <div className="single-dice-box">
                          <DiceFaceSvg value={d1} size={54} isRolling={isRolling} />
                          <span className="dice-sub-label">Die 1</span>
                        </div>
                        <span className="dice-plus-symbol">+</span>
                        <div className="single-dice-box">
                          <DiceFaceSvg value={d2} size={54} isRolling={isRolling} />
                          <span className="dice-sub-label">Die 2</span>
                        </div>
                        <span className="dice-equals-symbol">=</span>
                        <div className="dice-sum-bubble">
                          <span className="sum-label">SUM</span>
                          <strong className="sum-num">{d1 + d2}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn-roll-invest-dice ${isRolling ? 'rolling' : ''}`}
                        disabled={inv.ticketCount === 0 || isRolling}
                        onClick={() => handleRollInvestmentDice(portfolioPlayer?.id)}
                      >
                        {isRolling ? (
                          <>
                            <span className="rolling-icon-anim">🎲</span>
                            <span>ROLLING 2 DICE...</span>
                          </>
                        ) : inv.ticketCount === 0 ? (
                          <span>BUY A GOLD TICKET BELOW TO ROLL</span>
                        ) : (
                          <>
                            <span>🎲</span>
                            <span>ROLL 2 DICE FOR {portfolioPlayer?.name?.toUpperCase()}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Probability / Multiplier Legend Chips */}
                    <div className="invest-payout-cheatsheet">
                      <div className="payout-chip chip-severe-loss" title="Snake Eyes: Rate drops by 50%">
                        <span>Sum ≤2: -50% 🔻</span>
                      </div>
                      <div className="payout-chip chip-loss" title="Rate drops by 25%">
                        <span>3-4: -25% 🔻</span>
                      </div>
                      <div className="payout-chip chip-loss-light" title="Rate drops by 10%">
                        <span>5-6: -10% 🔻</span>
                      </div>
                      <div className="payout-chip chip-gain-light" title="Rate increases by 25%">
                        <span>7-9: +25% 🔺</span>
                      </div>
                      <div className="payout-chip chip-gain" title="Rate surges by 50%">
                        <span>10-11: +50% 🔺</span>
                      </div>
                      <div className="payout-chip chip-jackpot" title="Boxcars: Rate doubles (+100%)">
                        <span>12: +100% (2x) 👑</span>
                      </div>
                    </div>
                  </div>

                  {/* Banker Ticket Purchase & Cashout Actions */}
                  <div className="invest-banker-actions">
                    <button
                      type="button"
                      className="btn-buy-gold-ticket"
                      onClick={() => handleBuyGoldTicket(portfolioPlayer?.id)}
                      disabled={isRolling}
                    >
                      <span>➕</span>
                      <span>Buy 1 Gold Ticket (₹200)</span>
                    </button>

                    <button
                      type="button"
                      className="btn-sell-gold-ticket"
                      onClick={() => handleSellGoldTicket(portfolioPlayer?.id)}
                      disabled={inv.ticketCount === 0 || isRolling}
                      title={inv.ticketCount > 0 ? `Cash out 1 ticket for ₹${Math.round(inv.currentValue / inv.ticketCount)}` : 'No tickets to cash out'}
                    >
                      <span>💰</span>
                      <span>
                        Cash Out 1 Ticket ({inv.ticketCount > 0 ? `₹${Math.round(inv.currentValue / inv.ticketCount)}` : '₹0'})
                      </span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
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
                  <button
                    type="button"
                    className={`lottery-tab-btn ${lotteryTab === 'type3' ? 'active' : ''}`}
                    onClick={() => setLotteryTab('type3')}
                  >
                    🎡 Type 3: Spin the Wheel (8 Prizes)
                  </button>
                  <button
                    type="button"
                    className={`lottery-tab-btn ${lotteryTab === 'type4' ? 'active' : ''}`}
                    onClick={() => setLotteryTab('type4')}
                  >
                    🎲 Type 4: Lucky Dice Guess (Win ₹300)
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

            {/* LOTTERY TYPE 1: BANKER MYSTERY PRIZE SPECIFICATION */}
            {lotteryTab === 'type1' && (
              <div className="lottery-type1-container">
                <div className="type1-banker-controls">
                  <label>Enter Prize to Seal Inside the Card:</label>
                  <div className="type1-input-row">
                    <input
                      type="text"
                      className="type1-prize-input"
                      value={type1PrizeInput}
                      onChange={(e) => setType1PrizeInput(e.target.value)}
                      placeholder="e.g. ₹500 Cash, 1 Free House, Any Free Deed..."
                    />
                  </div>

                  {/* Quick Prize Suggestion Chips */}
                  <div className="lottery-presets-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '6px 0' }}>
                    {[
                      '₹500 Cash Prize',
                      '₹1,000 Jackpot',
                      '1 Free House 🏠',
                      '2 Free Houses 🏠🏠',
                      'Pick Any Free Deed 📜',
                      'Get Out of Jail Free 🗝️',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="preset-chip"
                        style={{
                          background: type1PrizeInput === preset ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                          border: type1PrizeInput === preset ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.15)',
                          color: type1PrizeInput === preset ? '#fbbf24' : '#e2e8f0',
                          borderRadius: '100px',
                          padding: '3px 10px',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                        onClick={() => setType1PrizeInput(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Main Seal Button that launches overlay on main board */}
                  <button
                    type="button"
                    className="type1-seal-launch-btn"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: 'none',
                      color: '#000000',
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: '800',
                      fontSize: '0.92rem',
                      padding: '0.65rem 1.2rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      marginTop: '6px',
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                    }}
                    onClick={() => {
                      const prize = (type1PrizeInput || '').trim() || '₹500 Cash Prize';
                      setType1ActivePrize(prize);
                      setActiveModal(null); // Closes modal
                      setViewingPortfolioPlayerId(null); // Lands directly on main game page where players cards are
                      setIsBigLotteryFlipped(false);
                      setIsBigLotteryOverlayActive(true); // Big card overlaps players cards
                      showToast(`Lottery Sealed: "${prize}". Tap on board to reveal!`);
                    }}
                  >
                    <span>🔒</span>
                    <span>SEAL LOTTERY & LAUNCH TO GAME BOARD</span>
                  </button>

                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '0.7rem',
                      color: '#94a3b8',
                      lineHeight: '1.4',
                    }}
                  >
                    💡 <strong>Workflow:</strong> Tapping <em>Seal Lottery</em> returns to the main game board where all player cards are. A giant sealed card will overlap the players&apos; cards saying <strong>&quot;TAP TO REVEAL LOTTERY&quot;</strong>. The physical draw winner taps it to reveal the prize, after which the card vanishes and the normal game resumes!
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

            {/* LOTTERY TYPE 3: FAST SPIN THE WHEEL (8 PRIZES) */}
            {lotteryTab === 'type3' && (
              <div className="lottery-type3-container">
                {/* Turn & Player Status Banner */}
                <div className="type3-turn-banner">
                  <div className="type3-player-info">
                    <span className="type3-player-token">
                      {gamePlayers[wheelPlayerIndex]?.token?.icon || '👤'}
                    </span>
                    <div>
                      <div className="type3-turn-badge-row">
                        <h4 className="type3-player-heading">
                          {gamePlayers[wheelPlayerIndex]?.name}&rsquo;s Turn
                        </h4>
                        <span className="type3-turn-step-pill">
                          Player {wheelPlayerIndex + 1} of {gamePlayers.length}
                        </span>
                        {wheelRoundComplete && (
                          <span className="type3-round-done-pill">Round Complete ✓</span>
                        )}
                      </div>
                      <p className="type3-player-sub">
                        {wheelIsSpinning
                          ? '⚡ Fast spinning the wheel...'
                          : wheelSelectedPrize
                          ? `Landed on ${wheelSelectedPrize.text}! Refreshes for next player...`
                          : 'Tap SPIN THE WHEEL below to win or penalty!'}
                      </p>
                    </div>
                  </div>

                  {!wheelRoundComplete && wheelPlayerIndex < gamePlayers.length - 1 && (
                    <button
                      type="button"
                      className="type3-advance-btn"
                      disabled={wheelIsSpinning}
                      onClick={() => handleAdvanceWheelPlayer(wheelPlayerIndex + 1)}
                      title="Advance to next player chance"
                    >
                      Next Player ➔
                    </button>
                  )}

                  {wheelRoundComplete && (
                    <button
                      type="button"
                      className="type3-restart-round-btn"
                      onClick={handleRestartWheelRound}
                    >
                      🔄 New Round
                    </button>
                  )}
                </div>

                {/* All Players Mini-Queue Bar */}
                <div className="type3-players-queue">
                  {gamePlayers.map((p, idx) => {
                    const pResult = wheelResults[p.id];
                    const isCurrent = idx === wheelPlayerIndex && !wheelRoundComplete;
                    const hasSpun = !!pResult;

                    return (
                      <button
                        key={p.id || idx}
                        type="button"
                        className={`type3-queue-pill ${isCurrent ? 'queue-current' : ''} ${hasSpun ? 'queue-spun' : ''}`}
                        onClick={() => {
                          if (!wheelIsSpinning) {
                            if (wheelAutoTimerRef.current) clearTimeout(wheelAutoTimerRef.current);
                            setWheelPlayerIndex(idx);
                            setWheelSelectedPrize(pResult || null);
                          }
                        }}
                      >
                        <span className="queue-pill-token">{p.token?.icon || '👤'}</span>
                        <span className="queue-pill-name">{p.name}</span>
                        {hasSpun ? (
                          <span className={`queue-pill-score ${pResult.amount > 0 ? 'score-win' : 'score-loss'}`}>
                            {pResult.text}
                          </span>
                        ) : isCurrent ? (
                          <span className="queue-pill-badge">Spins Now</span>
                        ) : (
                          <span className="queue-pill-pending">Pending</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Wheel Stage */}
                <div className="type3-wheel-stage">
                  {/* Top Fixed Pointer Arrow */}
                  <div className="wheel-pointer-marker">
                    <div className="pointer-arrow" />
                    <div className="pointer-gem" />
                  </div>

                  {/* Spinning SVG Disc */}
                  <div
                    className={`wheel-disc-wrapper ${wheelIsSpinning ? 'is-spinning' : ''}`}
                    style={{
                      transform: `rotate(${wheelRotation}deg)`,
                      transition: wheelIsSpinning
                        ? 'transform 1.15s cubic-bezier(0.15, 0.85, 0.35, 1.0)'
                        : 'none',
                    }}
                    onClick={handleSpinWheel}
                  >
                    <svg viewBox="0 0 320 320" className="wheel-svg" width="100%" height="100%">
                      <defs>
                        {WHEEL_PRIZES.map((prize, idx) => (
                          <linearGradient
                            id={`sectorGrad-${idx}`}
                            key={idx}
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor={prize.color} />
                            <stop offset="100%" stopColor={prize.secondaryColor} />
                          </linearGradient>
                        ))}
                        <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="35%" stopColor="#f59e0b" />
                          <stop offset="70%" stopColor="#d97706" />
                          <stop offset="100%" stopColor="#92400e" />
                        </linearGradient>
                        <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#1e293b" />
                          <stop offset="70%" stopColor="#0f172a" />
                          <stop offset="100%" stopColor="#020617" />
                        </radialGradient>
                      </defs>

                      {/* Slices */}
                      {WHEEL_PRIZES.map((prize, idx) => {
                        const a0 = idx * 45;
                        const a1 = (idx + 1) * 45;
                        const rad0 = (a0 * Math.PI) / 180;
                        const rad1 = (a1 * Math.PI) / 180;
                        const cx = 160;
                        const cy = 160;
                        const r = 146;
                        const x0 = cx + r * Math.cos(rad0);
                        const y0 = cy + r * Math.sin(rad0);
                        const x1 = cx + r * Math.cos(rad1);
                        const y1 = cy + r * Math.sin(rad1);
                        const midAngle = idx * 45 + 22.5;

                        return (
                          <g key={prize.id} className="wheel-sector-group">
                            <path
                              d={`M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`}
                              fill={`url(#sectorGrad-${idx})`}
                              stroke="rgba(255, 255, 255, 0.22)"
                              strokeWidth="1.5"
                            />
                            <g transform={`rotate(${midAngle}, ${cx}, ${cy})`}>
                              <text
                                x={cx + 62}
                                y={cy}
                                fontSize="15"
                                textAnchor="middle"
                                dominantBaseline="central"
                                transform={`rotate(90, ${cx + 62}, ${cy})`}
                              >
                                {prize.icon}
                              </text>
                              <text
                                x={cx + 104}
                                y={cy}
                                fill={prize.textColor}
                                fontSize="12.5"
                                fontWeight="900"
                                fontFamily="'Outfit', sans-serif"
                                textAnchor="middle"
                                dominantBaseline="central"
                                transform={`rotate(90, ${cx + 104}, ${cy})`}
                                style={{
                                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.85))',
                                  letterSpacing: '0.2px',
                                }}
                              >
                                {prize.text}
                              </text>
                            </g>
                          </g>
                        );
                      })}

                      {/* Outer Gold Rim with 16 Studs */}
                      <circle cx="160" cy="160" r="153" fill="none" stroke="url(#goldRimGrad)" strokeWidth="8" />
                      <circle cx="160" cy="160" r="157" fill="none" stroke="#000000" strokeWidth="1.5" />
                      <circle cx="160" cy="160" r="147" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />

                      {Array.from({ length: 16 }).map((_, i) => {
                        const ang = (i * 22.5 * Math.PI) / 180;
                        const sx = 160 + 153 * Math.cos(ang);
                        const sy = 160 + 153 * Math.sin(ang);
                        return (
                          <circle
                            key={i}
                            cx={sx}
                            cy={sy}
                            r="2.5"
                            fill="#ffffff"
                            stroke="#ca8a04"
                            strokeWidth="1"
                          />
                        );
                      })}

                      {/* Center Hub */}
                      <circle cx="160" cy="160" r="32" fill="url(#hubGrad)" stroke="url(#goldRimGrad)" strokeWidth="3" />
                      <circle cx="160" cy="160" r="23" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 3" />
                      <text
                        x="160"
                        y="155"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="17"
                      >
                        🎡
                      </text>
                      <text
                        x="160"
                        y="171"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#fbbf24"
                        fontSize="8.5"
                        fontWeight="900"
                        fontFamily="'Outfit', sans-serif"
                        letterSpacing="1px"
                      >
                        SPIN
                      </text>
                    </svg>
                  </div>
                </div>

                {/* Wheel Bottom Actions / Results */}
                <div className="type3-action-area">
                  {/* Active Win / Loss Alert */}
                  {wheelSelectedPrize && (
                    <div
                      className={`type3-result-card ${wheelSelectedPrize.amount > 0 ? 'card-win' : 'card-loss'}`}
                    >
                      <div className="result-card-inner">
                        <span className="result-card-icon">{wheelSelectedPrize.icon}</span>
                        <div className="result-card-text">
                          <span className="result-congrats">
                            {wheelSelectedPrize.amount > 0 ? '🎉 WINNER!' : '⚠️ PENALTY!'}
                          </span>
                          <strong className="result-amount">
                            {gamePlayers[wheelPlayerIndex]?.name}: {wheelSelectedPrize.text} ({wheelSelectedPrize.label})
                          </strong>
                        </div>
                      </div>
                      {!wheelRoundComplete && wheelPlayerIndex < gamePlayers.length - 1 && (
                        <button
                          type="button"
                          className="result-next-btn"
                          onClick={() => handleAdvanceWheelPlayer(wheelPlayerIndex + 1)}
                        >
                          Next: {gamePlayers[wheelPlayerIndex + 1]?.name} ➔
                        </button>
                      )}
                    </div>
                  )}

                  {/* Main Spin CTA Button */}
                  {!wheelRoundComplete ? (
                    <button
                      type="button"
                      className={`type3-spin-btn ${wheelIsSpinning ? 'spinning' : ''}`}
                      disabled={wheelIsSpinning}
                      onClick={handleSpinWheel}
                    >
                      {wheelIsSpinning ? (
                        <>
                          <span className="btn-spinner-icon">🌀</span>
                          <span>FAST SPINNING...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>SPIN THE WHEEL ({gamePlayers[wheelPlayerIndex]?.name})</span>
                        </>
                      )}
                    </button>
                  ) : (
                    /* Round Completed Summary */
                    <div className="type3-round-summary-card">
                      <div className="summary-card-header">
                        <h4>🏆 Wheel Round Summary</h4>
                        <span>All {gamePlayers.length} players have completed their spin!</span>
                      </div>
                      <div className="summary-results-grid">
                        {gamePlayers.map((p) => {
                          const res = wheelResults[p.id];
                          return (
                            <div key={p.id} className="summary-player-chip">
                              <span className="summary-token">{p.token?.icon || '👤'}</span>
                              <span className="summary-name">{p.name}</span>
                              <strong className={`summary-prize ${res?.amount > 0 ? 'text-win' : 'text-loss'}`}>
                                {res ? res.text : 'No spin'}
                              </strong>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        className="type3-restart-full-btn"
                        onClick={handleRestartWheelRound}
                      >
                        🔄 START NEW WHEEL ROUND (Refresh All Spins)
                      </button>
                    </div>
                  )}

                  {/* Prizes Quick Reference Bar */}
                  <div className="type3-prizes-legend">
                    <span className="legend-title">8 Wheel Slices:</span>
                    <div className="legend-chips-wrap">
                      {WHEEL_PRIZES.map((pz) => (
                        <span
                          key={pz.id}
                          className={`legend-chip ${pz.amount > 0 ? 'chip-positive' : 'chip-negative'}`}
                          style={{ borderColor: pz.color }}
                        >
                          {pz.icon} {pz.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LOTTERY TYPE 4: LUCKY DICE GUESS (CHOOSE 1-6, MATCH TO WIN ₹300) */}
            {lotteryTab === 'type4' && (
              <div className="lottery-type4-container">
                {/* Turn & Player Status Banner */}
                <div className="type4-turn-banner">
                  <div className="type4-player-info">
                    <span className="type4-player-token">
                      {gamePlayers[dicePlayerIndex]?.token?.icon || '👤'}
                    </span>
                    <div>
                      <div className="type4-turn-badge-row">
                        <h4 className="type4-player-heading">
                          {gamePlayers[dicePlayerIndex]?.name}&rsquo;s Turn
                        </h4>
                        <span className="type4-turn-step-pill">
                          Player {dicePlayerIndex + 1} of {gamePlayers.length}
                        </span>
                        {diceRoundComplete && (
                          <span className="type4-round-done-pill">Round Complete ✓</span>
                        )}
                      </div>
                      <p className="type4-player-sub">
                        {diceIsRolling
                          ? '🎲 Tumbling and rolling the dice...'
                          : diceLastResult
                          ? diceLastResult.isMatch
                            ? `🎉 MATCH! Rolled ${diceLastResult.rolled} and won ₹300!`
                            : `❌ Rolled ${diceLastResult.rolled} (chose ${diceLastResult.chosen}). Refreshes turn...`
                          : diceSelectedNumber
                          ? `Selected #${diceSelectedNumber}. Ready to roll the dice!`
                          : 'Step 1: Pick your lucky number (1 - 6) below:'}
                      </p>
                    </div>
                  </div>

                  {!diceRoundComplete && dicePlayerIndex < gamePlayers.length - 1 && (
                    <button
                      type="button"
                      className="type4-advance-btn"
                      disabled={diceIsRolling}
                      onClick={() => handleAdvanceDicePlayer(dicePlayerIndex + 1)}
                      title="Advance to next player chance"
                    >
                      Next Player ➔
                    </button>
                  )}

                  {diceRoundComplete && (
                    <button
                      type="button"
                      className="type4-restart-round-btn"
                      onClick={handleRestartDiceRound}
                    >
                      🔄 New Dice Round
                    </button>
                  )}
                </div>

                {/* All Players Mini-Queue Bar */}
                <div className="type4-players-queue">
                  {gamePlayers.map((p, idx) => {
                    const pResult = diceResults[p.id];
                    const isCurrent = idx === dicePlayerIndex && !diceRoundComplete;
                    const hasRolled = !!pResult;

                    return (
                      <button
                        key={p.id || idx}
                        type="button"
                        className={`type4-queue-pill ${isCurrent ? 'queue-current' : ''} ${hasRolled ? (pResult.isMatch ? 'queue-won' : 'queue-miss') : ''}`}
                        onClick={() => {
                          if (!diceIsRolling) {
                            if (diceAutoTimerRef.current) clearTimeout(diceAutoTimerRef.current);
                            setDicePlayerIndex(idx);
                            setDiceSelectedNumber(pResult?.chosen || null);
                            setDiceRolledValue(pResult?.rolled || null);
                            setDiceLastResult(pResult || null);
                          }
                        }}
                      >
                        <span className="queue-pill-token">{p.token?.icon || '👤'}</span>
                        <span className="queue-pill-name">{p.name}</span>
                        {hasRolled ? (
                          <span className={`queue-pill-score ${pResult.isMatch ? 'score-win' : 'score-loss'}`}>
                            {pResult.isMatch ? 'Won ₹300 🏆' : `Rolled ${pResult.rolled}`}
                          </span>
                        ) : isCurrent ? (
                          <span className="queue-pill-badge">Choosing</span>
                        ) : (
                          <span className="queue-pill-pending">Pending</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Step 1: Choose Number Grid (1 to 6) */}
                <div className="type4-choose-section">
                  <div className="type4-section-header">
                    <span className="choose-step-num">STEP 1</span>
                    <span className="choose-step-label">
                      Choose a number from <strong>1 to 6</strong>:
                    </span>
                  </div>

                  <div className="type4-numbers-grid">
                    {[1, 2, 3, 4, 5, 6].map((num) => {
                      const isSelected = diceSelectedNumber === num;
                      const isMatchingResult = diceLastResult && diceLastResult.rolled === num;

                      return (
                        <button
                          key={num}
                          type="button"
                          className={`type4-num-btn ${isSelected ? 'selected' : ''} ${isMatchingResult && diceLastResult.isMatch ? 'matched-glow' : ''}`}
                          disabled={diceIsRolling || (!!diceLastResult && !diceRoundComplete)}
                          onClick={() => {
                            if (!diceIsRolling && !diceLastResult) {
                              setDiceSelectedNumber(num);
                            }
                          }}
                        >
                          <DiceFaceSvg value={num} size={42} />
                          <span className="type4-num-val">{num}</span>
                          {isSelected && <span className="type4-chosen-tag">Selected</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Animated Rolling Dice Arena */}
                <div className="type4-dice-arena">
                  <div className="type4-arena-inner">
                    <div className={`dice-cube-container ${diceIsRolling ? 'rolling' : ''}`}>
                      <DiceFaceSvg
                        value={diceIsRolling ? diceAnimValue : (diceRolledValue || diceSelectedNumber || 1)}
                        size={84}
                        isRolling={diceIsRolling}
                      />
                    </div>

                    <div className="type4-arena-details">
                      <div className="type4-arena-badge-row">
                        <span className="arena-prize-badge">Prize: ₹300 Cash</span>
                        <span className="arena-odds-badge">1 in 6 Chance</span>
                      </div>
                      <div className="type4-prediction-summary">
                        {diceSelectedNumber ? (
                          <span>
                            {gamePlayers[dicePlayerIndex]?.name} predicted: <strong className="text-highlight">#{diceSelectedNumber}</strong>
                          </span>
                        ) : (
                          <span className="text-muted">Tap a number (1-6) above to pick!</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Action Button & Match Result Card */}
                <div className="type4-actions-area">
                  {/* Result Announcement Alert */}
                  {diceLastResult && (
                    <div
                      className={`type4-result-card ${diceLastResult.isMatch ? 'card-win' : 'card-loss'}`}
                    >
                      <div className="result-card-inner">
                        <span className="result-card-icon">
                          {diceLastResult.isMatch ? '🎉' : '❌'}
                        </span>
                        <div className="result-card-text">
                          <span className="result-congrats">
                            {diceLastResult.isMatch ? 'JACKPOT MATCH WINNER!' : 'NO MATCH'}
                          </span>
                          <strong className="result-amount">
                            {diceLastResult.isMatch
                              ? `${diceLastResult.playerName} matched #${diceLastResult.rolled} and WON ₹300!`
                              : `${diceLastResult.playerName} chose #${diceLastResult.chosen}, but dice rolled #${diceLastResult.rolled}.`}
                          </strong>
                        </div>
                      </div>
                      {!diceRoundComplete && dicePlayerIndex < gamePlayers.length - 1 && (
                        <button
                          type="button"
                          className="result-next-btn"
                          onClick={() => handleAdvanceDicePlayer(dicePlayerIndex + 1)}
                        >
                          Next: {gamePlayers[dicePlayerIndex + 1]?.name} ➔
                        </button>
                      )}
                    </div>
                  )}

                  {/* Main Roll Dice Button */}
                  {!diceRoundComplete ? (
                    <button
                      type="button"
                      className={`type4-roll-btn ${diceIsRolling ? 'rolling' : ''} ${!diceSelectedNumber ? 'btn-disabled' : ''}`}
                      disabled={diceIsRolling || !diceSelectedNumber || !!diceLastResult}
                      onClick={handleRollDiceLottery}
                    >
                      {diceIsRolling ? (
                        <>
                          <span className="btn-spinner-icon">🎲</span>
                          <span>ROLLING THE DICE...</span>
                        </>
                      ) : diceLastResult ? (
                        <span>✓ TURN COMPLETED</span>
                      ) : diceSelectedNumber ? (
                        <>
                          <span>🎲</span>
                          <span>ROLL DICE FOR #{diceSelectedNumber} ({gamePlayers[dicePlayerIndex]?.name})</span>
                        </>
                      ) : (
                        <>
                          <span>👆</span>
                          <span>SELECT 1 - 6 ABOVE TO ROLL</span>
                        </>
                      )}
                    </button>
                  ) : (
                    /* Round Completed Summary */
                    <div className="type4-round-summary-card">
                      <div className="summary-card-header">
                        <h4>🏆 Lucky Dice Round Summary</h4>
                        <span>All {gamePlayers.length} players have guessed and rolled!</span>
                      </div>
                      <div className="summary-results-grid">
                        {gamePlayers.map((p) => {
                          const res = diceResults[p.id];
                          return (
                            <div key={p.id} className="summary-player-chip">
                              <span className="summary-token">{p.token?.icon || '👤'}</span>
                              <span className="summary-name">{p.name}</span>
                              {res ? (
                                <strong className={`summary-prize ${res.isMatch ? 'text-win' : 'text-loss'}`}>
                                  {res.isMatch ? 'Won ₹300 🏆' : `Chose ${res.chosen}, Rolled ${res.rolled}`}
                                </strong>
                              ) : (
                                <span className="text-muted">No roll</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        className="type4-restart-full-btn"
                        onClick={handleRestartDiceRound}
                      >
                        🔄 START NEW DICE ROUND (Refresh All Rolls)
                      </button>
                    </div>
                  )}
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
