import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    info: { type: String },
    listingType: { type: String, enum: ['Sell', 'Rent'], required: true },
    propertyType: { type: String },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    landArea: { type: String },
    features: {
      bedroom: { type: Number, default: 0 },
      bathroom: { type: Number, default: 0 },
      balcony: { type: Number, default: 0 },
    },
    photos: [{ type: String }],
    documents: [{ type: String }],
    status: { type: String, enum: ['Active', 'Sold', 'Inactive', 'Draft'], default: 'Active' },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Property = mongoose.model('Property', propertySchema);

export default Property;
