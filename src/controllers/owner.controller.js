import Property from '../models/Property.js';
import Lead from '../models/Lead.js';

export const getDashboard = async (req, res) => {
  try {
    // req.user is always present — route is now protected
    const ownerId = req.user._id;

    const totalListings = await Property.countDocuments({ ownerId });
    const activeListings = await Property.countDocuments({ ownerId, status: 'Active' });

    // Count leads for properties owned by this owner
    const ownerProperties = await Property.find({ ownerId }).select('_id');
    const propertyIds = ownerProperties.map((p) => p._id);
    const pendingLeads = await Lead.countDocuments({ interestedProperty: { $in: propertyIds } });

    res.status(200).json({
      total_listings: totalListings,
      active_listings: activeListings,
      total_views: 0,        // Placeholder — no view-tracking model yet
      pending_leads: pendingLeads,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getListings = async (req, res) => {
  try {
    // req.user is always present — route is now protected
    const ownerId = req.user._id;

    const properties = await Property.find({ ownerId });

    const formattedListings = properties.map((prop) => ({
      id: prop._id,
      title: prop.title,
      listingType: prop.listingType,
      price: prop.price,
      location: prop.location,
      status: prop.status,
    }));

    res.status(200).json(formattedListings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addProperty = async (req, res) => {
  try {
    const {
      title,
      info,
      listingType,
      price,
      location,
      landArea,
      latitude,
      longitude,
      propertyType,
    } = req.body;

    // features may be sent as features[bedroom] in multipart FormData
    const features = {
      balcony: parseInt(req.body['features[balcony]']) || 0,
      bathroom: parseInt(req.body['features[bathroom]']) || 0,
      bedroom: parseInt(req.body['features[bedroom]']) || 0,
    };

    // multer field names registered as 'photos[]' and 'documents[]' in owner.routes.js
    const photoFiles = req.files?.['photos[]'] || req.files?.photos || [];
    const documentFiles = req.files?.['documents[]'] || req.files?.documents || [];

    const photos = photoFiles.map((file) => file.path.replace(/\\/g, '/'));
    const documents = documentFiles.map((file) => file.path.replace(/\\/g, '/'));

    // req.user is always present — route is now protected
    const ownerId = req.user._id;

    const newProperty = await Property.create({
      title,
      info: info || '',
      listingType: listingType || 'Sell',
      price: Number(price || 0),
      location,
      landArea: landArea || '',
      latitude: Number(latitude || 0),
      longitude: Number(longitude || 0),
      propertyType: propertyType || '',
      features,
      photos,
      documents,
      ownerId,
    });

    res.status(201).json({
      message: 'Property added successfully!',
      propertyId: newProperty._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const initiatePayment = async (req, res) => {
  try {
    const { plan } = req.query;

    // In a real application, generate a checkout session with Stripe/Razorpay
    res.status(200).json({
      redirect_url: `https://payment-gateway.com/checkout/12345?plan=${plan || 'Premium'}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

