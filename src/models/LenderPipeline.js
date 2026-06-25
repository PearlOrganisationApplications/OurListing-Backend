import mongoose from 'mongoose';

/**
 * LenderPipeline – represents an active loan in progress for a lender.
 * Stages map to the underwriting lifecycle:
 *   Pre-Approval → Processing → Appraisal → Underwriting → Clear-to-Close → Funded
 *
 * New fields vs v1:
 *  - propertyImage : URL/path to property image
 *  - pipelineStatus: Active | Approved | Draft (filterable tab in UI)
 *  - loanType enum : expanded to include 30-Year Fixed, 15-Year Fixed, ARM 5/1
 *  - closingDate   : changed to Date type for proper YYYY-MM-DD formatting
 *  - stage enum    : proper casing matching UI labels
 */
const lenderPipelineSchema = new mongoose.Schema(
  {
    applicantName:   { type: String, required: true },
    propertyAddress: { type: String, required: true },
    propertyImage:   { type: String, default: '' },         // URL / path
    loanType: {
      type: String,
      enum: ['Conventional', 'FHA', 'VA', 'USDA', 'Jumbo', '30-Year Fixed', '15-Year Fixed', 'ARM 5/1'],
      required: true,
    },
    stage: {
      type: String,
      enum: ['Pre-Approval', 'Processing', 'Appraisal', 'Underwriting', 'Clear-to-Close', 'Funded'],
      default: 'Pre-Approval',
    },
    pipelineStatus: {
      type: String,
      enum: ['Active', 'Approved', 'Draft'],
      default: 'Active',
    },
    closingDate:  { type: Date },                           // proper Date for YYYY-MM-DD formatting
    loanAmount:   { type: Number, default: 0 },             // numeric for YTD funded aggregation
    fundedYear:   { type: Number },                         // calendar year when stage = "Funded"
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
