import mongoose from 'mongoose';
const planSchema = new mongoose.Schema({
  planName: { type: String, required: true },
  amount: { type: Number, required: true },
  photo: { type: String },
  description: { type: String },
  features: [{ type: String }],
  enabled: { type: Boolean, default: true },
}, { timestamps: true });
const Plan = mongoose.model('Plan', planSchema);
export default Plan;