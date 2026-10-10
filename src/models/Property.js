import mongoose from 'mongoose';

const PropertySchema = new mongoose.Schema({
  type: { type: String, enum: ['property', 'station'], default: 'property' },
  name: { type: String, required: true },
  buyingCost: { type: Number, required: true },
  buildingCost: { type: Number, default: 0 },
  baseRent: { type: Number, default: 0 },
  rent1: { type: Number, default: 0 },
  rent2: { type: Number, default: 0 },
  rent3: { type: Number, default: 0 },
  rent4: { type: Number, default: 0 },
  hotelRent: { type: Number, default: 0 },
  mortgage: { type: Number, required: true },
  color: { type: String, default: '#ffffff' },
}, { timestamps: true });

export default mongoose.models.Property || mongoose.model('Property', PropertySchema);
