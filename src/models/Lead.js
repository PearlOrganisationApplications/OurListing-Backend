import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    type: { type: String, enum: ['buyer', 'owner'], required: true },
    tag: { type: String, enum: ['hot', 'warm', 'cold'], default: 'warm' },
    interestedProperty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },
    lastContactAt: { type: Date, default: Date.now },
    brokerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
