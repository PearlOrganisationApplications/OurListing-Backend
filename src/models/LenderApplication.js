import mongoose from 'mongoose';

/**
 * LenderApplication – represents a mortgage application submitted by a buyer
 * and visible to lenders for review/approval decisions.
 */
const lenderApplicationSchema = new mongoose.Schema(
  {
    applicantName: { type: String, required: true },
    state: { type: String, required: true },
    loanAmount: { type: String, required: true },   // e.g. "$450k"
    downPayment: { type: String, required: true },  // e.g. "20%"
    creditBand: { type: String, required: true },   // e.g. "720+"
    status: {
      type: String,
      enum: ['Review', 'Pre-Approved', 'Rejected', 'Funded'],
      default: 'Review',
    },
    // The lender this application is assigned/visible to (optional – can be null for marketplace)
    lenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const LenderApplication = mongoose.model('LenderApplication', lenderApplicationSchema);

export default LenderApplication;
