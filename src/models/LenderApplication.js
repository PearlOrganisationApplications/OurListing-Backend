import mongoose from 'mongoose';

/**
 * LenderApplication – represents a mortgage application submitted by a buyer
 * and visible to lenders for review/approval decisions.
 *
 * New fields vs v1:
 *  - city         : display city e.g. "Austin, TX"
 *  - ficoScore    : credit score string e.g. "740+"
 *  - propertyImage: URL/path to property image
 *  - tag          : lead temperature (hot | warm | cold)
 *  - loanAmount   : changed to Number for aggregation (was String)
 *  - status enum  : proper casing (Review | Pre-Approved | Rejected | Funded)
 */
const lenderApplicationSchema = new mongoose.Schema(
  {
    applicantName: { type: String, required: true },
    city:          { type: String, default: '' },          // e.g. "Austin, TX"
    state:         { type: String, required: true },        // e.g. "FL"
    loanAmount:    { type: Number, required: true },        // numeric e.g. 350000
    downPayment:   { type: String, required: true },        // e.g. "20%"
    creditBand:    { type: String, required: true },        // e.g. "720-739"
    ficoScore:     { type: String, default: '' },           // e.g. "740+"
    propertyImage: { type: String, default: '' },           // URL / path
    tag: {
      type: String,
      enum: ['hot', 'warm', 'cold'],
      default: 'warm',
    },
    status: {
      type: String,
      enum: ['Review', 'Pre-Approved', 'Rejected', 'Funded'],
      default: 'Review',
    },
    // The lender this application is assigned/visible to (null = marketplace / all lenders)
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
