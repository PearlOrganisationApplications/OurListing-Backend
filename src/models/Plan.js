import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  planName: { type: String, required: true },
  amount: { type: Number, required: true },
  photo: { type: String },
  description: { type: String },
  features: [{ type: String }],
  enabled: { type: Boolean, default: true },
});

const Plan = mongoose.model('Plan', planSchema);

export default Plan;
