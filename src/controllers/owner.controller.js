import Property from '../models/Property.js';
import Lead from '../models/Lead.js';
import Plan from '../models/Plan.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helper to get PayPal Access Token using native fetch
// ─────────────────────────────────────────────────────────────────────────────
const generatePayPalAccessToken = async () => {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE } = process.env;
  const baseURL = PAYPAL_MODE === 'sandbox' 
    ? 'https://api-m.sandbox.paypal.com' 
    : 'https://api-m.paypal.com';

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${baseURL}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(`PayPal auth failed: ${data.error_description || 'Unknown error'}`);
  return data.access_token;
};

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboard = async (req, res) => {
  try {
<<<<<<< HEAD
    const ownerId = req.user._id;
    
    // Get all properties for the owner
    const properties = await Property.find({ ownerId });
    
    // Calculate stats
    const totalListings = properties.length;
    const activeListings = properties.filter(p => p.status === 'ACTIVE').length;
    const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
    
    // Get leads for the owner's properties
    const ownerPropertyIds = properties.map(p => p._id);
    const pendingLeads = await Lead.countDocuments({ 
      interestedProperty: { $in: ownerPropertyIds }
    });
=======
    // req.user is always present — route is now protected
    const ownerId = req.user._id;

    const totalListings = await Property.countDocuments({ ownerId });
    const activeListings = await Property.countDocuments({ ownerId, status: 'Active' });

    // Count leads for properties owned by this owner
    const ownerProperties = await Property.find({ ownerId }).select('_id');
    const propertyIds = ownerProperties.map((p) => p._id);
    const pendingLeads = await Lead.countDocuments({ interestedProperty: { $in: propertyIds } });
>>>>>>> d091185a41545c89c55507b9d1289bb3faa39fb9

    res.status(200).json({
      total_listings: totalListings,
      active_listings: activeListings,
<<<<<<< HEAD
      total_views: totalViews,
      pending_leads: pendingLeads
=======
      total_views: 0,        // Placeholder — no view-tracking model yet
      pending_leads: pendingLeads,
>>>>>>> d091185a41545c89c55507b9d1289bb3faa39fb9
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Owner Properties
// ─────────────────────────────────────────────────────────────────────────────
export const getListings = async (req, res) => {
  try {
<<<<<<< HEAD
    const ownerId = req.user._id;
    const properties = await Property.find({ ownerId });
    
    const formattedListings = properties.map(prop => ({
=======
    // req.user is always present — route is now protected
    const ownerId = req.user._id;

    const properties = await Property.find({ ownerId });

    const formattedListings = properties.map((prop) => ({
>>>>>>> d091185a41545c89c55507b9d1289bb3faa39fb9
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

// ─────────────────────────────────────────────────────────────────────────────
// Add New Property
// ─────────────────────────────────────────────────────────────────────────────
export const addProperty = async (req, res) => {
  try {
<<<<<<< HEAD
    const { title, info, listingType, price, location, landArea, latitude, longitude, propertyType } = req.body;
    
=======
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
>>>>>>> d091185a41545c89c55507b9d1289bb3faa39fb9
    const features = {
      balcony: parseInt(req.body['features[balcony]']) || 0,
      bathroom: parseInt(req.body['features[bathroom]']) || 0,
      bedroom: parseInt(req.body['features[bedroom]']) || 0,
    };

<<<<<<< HEAD
    const photos = req.files?.photos ? req.files.photos.map(file => file.path) : [];
    const documents = req.files?.documents ? req.files.documents.map(file => file.path) : [];

    const ownerId = req.user._id;

    const newProperty = await Property.create({
      title, info, listingType, price, location, landArea, latitude, longitude, propertyType, features, photos, documents, ownerId
=======
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
>>>>>>> d091185a41545c89c55507b9d1289bb3faa39fb9
    });

    res.status(201).json({
      message: 'Property added successfully!',
      propertyId: newProperty._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Initiate PayPal Payment (Create Order)
// ─────────────────────────────────────────────────────────────────────────────
export const initiatePayment = async (req, res) => {
  try {
    const { plan } = req.query;
<<<<<<< HEAD
    
    let amount = "49.99"; // Default
    if (plan === 'Basic') amount = "19.99";
    if (plan === 'Pro') amount = "99.99";

    const accessToken = await generatePayPalAccessToken();
    const { PAYPAL_MODE } = process.env;
    const baseURL = PAYPAL_MODE === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'USD', value: amount },
          description: `rListing ${plan || 'Premium'} Plan`,
        },
      ],
      application_context: {
        return_url: 'http://localhost:3000/payment/success',
        cancel_url: 'http://localhost:3000/payment/cancel',
      }
    };

    const response = await fetch(`${baseURL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    if (!data.id) throw new Error(data.message || 'Failed to create PayPal order');

    const approveLink = data.links.find((link) => link.rel === 'approve');

    res.status(200).json({
      orderId: data.id,
      redirect_url: approveLink.href
=======

    // In a real application, generate a checkout session with Stripe/Razorpay
    res.status(200).json({
      redirect_url: `https://payment-gateway.com/checkout/12345?plan=${plan || 'Premium'}`,
>>>>>>> d091185a41545c89c55507b9d1289bb3faa39fb9
    });
  } catch (error) {
    console.error('PayPal create order error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Capture PayPal Payment
// ─────────────────────────────────────────────────────────────────────────────
export const capturePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const accessToken = await generatePayPalAccessToken();
    const { PAYPAL_MODE } = process.env;
    const baseURL = PAYPAL_MODE === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

    const response = await fetch(`${baseURL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (data.status === 'COMPLETED') {
      res.status(200).json({ status: 'success', message: 'Payment completed successfully!', data });
    } else {
      res.status(400).json({ status: 'failed', message: 'Payment capture failed', data });
    }
  } catch (error) {
    console.error('PayPal capture error:', error);
    res.status(500).json({ message: error.message });
  }
};

