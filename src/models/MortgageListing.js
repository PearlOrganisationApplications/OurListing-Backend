import mongoose from 'mongoose';

/**
 * MortgageListing – a property listed in the mortgage marketplace.
 * Lenders browse these to find buyers seeking financing.
 *
 * New fields vs v1:
 *  - propertyImage : URL/path to property photo
 *  - buyerName     : displayed on "Recommended For You" card
 */
const mortgageListingSchema = new mongoose.Schema(
  {
    propertyType:    { type: String, required: true },
    propertyAddress: { type: String, required: true },
    propertyImage:   { type: String, default: '' },     // URL / path
    buyerName:       { type: String, default: '' },     // for "Recommended For You" card
    purchasePrice:   { type: String, required: true },
    requestedLoan:   { type: String, required: true },
    ltvRatio:        { type: String, required: true },
    ficoScore:       { type: String, required: true },  // e.g. "720-739"
    buyerIntent:     { type: String, required: true },
    postedDate:      { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const MortgageListing = mongoose.model('MortgageListing', mortgageListingSchema);

export default MortgageListing;
