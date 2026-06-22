import mongoose from 'mongoose';

const mortgageListingSchema = new mongoose.Schema(
  {
    propertyType: { type: String, required: true },
    propertyAddress: { type: String, required: true },
    purchasePrice: { type: String, required: true },
    requestedLoan: { type: String, required: true },
    ltvRatio: { type: String, required: true },
    ficoScore: { type: String, required: true },
    buyerIntent: { type: String, required: true },
    postedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const MortgageListing = mongoose.model('MortgageListing', mortgageListingSchema);

export default MortgageListing;
