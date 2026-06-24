import mongoose from 'mongoose';

/**
 * LenderPipeline – represents an active loan in progress for a lender.
 * Stages map to the underwriting lifecycle:
 *   Pre-Approval → Processing → Appraisal → Underwriting → Clear-to-Close → Funded
 */
const lenderPipelineSchema = new mongoose.Schema(
  {
    applicantName: { type: String, required: true },
    propertyAddress: { type: String, required: true },
    loanType: {
      type: String,
      enum: ['Conventional', 'FHA', 'VA', 'USDA', 'Jumbo'],
      required: true,
    },
    stage: {
      type: String,
      enum: ['Pre-Approval', 'Processing', 'Appraisal', 'Underwriting', 'Clear-to-Close', 'Funded'],
      default: 'Pre-Approval',
    },
    closingDate: { type: String },   // stored as display string e.g. "Oct 15"
    loanAmount: { type: Number, default: 0 }, // numeric value for YTD funded aggregation
    fundedYear: { type: Number },    // calendar year when stage reached "Funded"
    // The lender who owns this pipeline entry
    lenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const LenderPipeline = mongoose.model('LenderPipeline', lenderPipelineSchema);

export default LenderPipeline;
