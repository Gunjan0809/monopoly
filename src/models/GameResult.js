import mongoose from 'mongoose';

const GameResultSchema = new mongoose.Schema(
  {
    playedAt: { type: Date, default: Date.now },
    winnerName: { type: String, required: true },
    winnerTotal: { type: Number, required: true },
    players: [
      {
        id: Number,
        name: String,
        token: String,
        assetValue: Number,
        cashRemaining: Number,
        totalScore: Number,
        deedsCount: Number,
        deeds: [String],
        isWinner: Boolean,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.GameResult || mongoose.model('GameResult', GameResultSchema);
