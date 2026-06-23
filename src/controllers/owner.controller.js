import Property from '../models/Property.js';
import Lead from '../models/Lead.js';

export const getDashboard = async (req, res) => {
  try {
    // Assuming the user is authenticated and req.user exists
    // For now, we will return dummy aggregate stats since we don't have views logic
    // but we can query actual listings for the owner
    const ownerId = req.user?._id || "placeholder_owner_id"; // fallback for testing without auth token
    
    // In a real app we'd count actual records. We'll do a basic count query if ownerId is valid.
    let totalListings = 3;
    let activeListings = 2;
    let pendingLeads = 5;

    if (req.user) {
      totalListings = await Property.countDocuments({ ownerId });
      activeListings = await Property.countDocuments({ ownerId, status: 'Active' });
      // pendingLeads = await Lead.countDocuments({ ownerId }); // Requires Lead schema linking
    }

    res.status(200).json({
      total_listings: totalListings,
      active_listings: activeListings,
      total_views: 150, // Hardcoded placeholder
      pending_leads: pendingLeads
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getListings = async (req, res) => {
  try {
    const ownerId = req.user?._id;
    let filter = {};
    if (ownerId) filter.ownerId = ownerId;

    const properties = await Property.find(filter);
    
    const formattedListings = properties.map(prop => ({
      id: prop._id,
      title: prop.title,
      listingType: prop.listingType,
      price: prop.price,
      location: prop.location,
      status: prop.status
    }));

    res.status(200).json(formattedListings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addProperty = async (req, res) => {
  try {
    const { title, info, listingType, price, location, landArea, latitude, longitude, propertyType } = req.body;
    
    // features might be sent as nested object or individual keys depending on frontend.
    // e.g. features[bedroom] in FormData
    const features = {
      balcony: parseInt(req.body['features[balcony]']) || 0,
      bathroom: parseInt(req.body['features[bathroom]']) || 0,
      bedroom: parseInt(req.body['features[bedroom]']) || 0,
    };

    const photos = req.files?.photos ? req.files.photos.map(file => file.path) : [];
    const documents = req.files?.documents ? req.files.documents.map(file => file.path) : [];

    const ownerId = req.user?._id || "64e3c1b1f1a2b3c4d5e6f7a8"; // fallback for testing without auth

    const newProperty = await Property.create({
      title,
      info,
      listingType,
      price,
      location,
      landArea,
      latitude,
      longitude,
      propertyType,
      features,
      photos,
      documents,
      ownerId
    });

    res.status(201).json({ 
      message: "Property added successfully!", 
      propertyId: newProperty._id 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const initiatePayment = async (req, res) => {
  try {
    const { plan } = req.query;
    
    // In a real application, you would generate a checkout session with Stripe/Razorpay
    res.status(200).json({
      redirect_url: `https://payment-gateway.com/checkout/12345?plan=${plan || 'Premium'}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
