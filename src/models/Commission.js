import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema({
  brokerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  clientName: { type: String, required: true },
  dealValue: { type: Number, required: true },
  commissionPercentage: { type: Number, required: true },
  commissionAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Paid'],
    default: 'Pending'
  },
  closingDate: { type: Date, required: true }
}, { timestamps: true });

const Commission = mongoose.model('Commission', commissionSchema);
export default Commission;