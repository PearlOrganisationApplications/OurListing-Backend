import Property from '../models/Property.js';
import Lead from '../models/Lead.js';
import Plan from '../models/Plan.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

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
    // req.user is always present — route is now protected
    const ownerId = req.user._id;

    // Get all properties for the owner
    const properties = await Property.find({ ownerId });

    // Calculate stats
    const totalListings = properties.length;
    const activeListings = properties.filter(p => p.status === 'ACTIVE').length;
    const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);

    // Count leads for properties owned by this owner
    const ownerPropertyIds = properties.map(p => p._id);
    const pendingLeads = await Lead.countDocuments({
      interestedProperty: { $in: ownerPropertyIds }
    });

    res.status(200).json({
      total_listings: totalListings,
      active_listings: activeListings,
      total_views: totalViews,
      pending_leads: pendingLeads,
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

// ─────────────────────────────────────────────────────────────────────────────
// Add New Property
// ─────────────────────────────────────────────────────────────────────────────
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

    const BASE_URL = process.env.BASE_URL || 'https://propertyapp.ddns.net';

    const getFeature = (key) => {
      if (req.body[`features[${key}]`] !== undefined) {
        return req.body[`features[${key}]`];
      }
      if (req.body.features && req.body.features[key] !== undefined) {
        return req.body.features[key];
      }
      return 0; 
    };

    const features = {
      bedroom: Number(getFeature('bedroom')),
      bathroom: Number(getFeature('bathroom')), 
      balcony: Number(getFeature('balcony')),
    };

    const photoFiles = req.files?.['photos[]'] || req.files?.photos || [];
    const documentFiles = req.files?.['documents[]'] || req.files?.documents || [];

    const photos = photoFiles.map((file) => {
      return `${BASE_URL}/uploads/${file.filename}`;
    });

    const documents = documentFiles.map((file) => {
      return `${BASE_URL}/uploads/${file.filename}`;
    });

    const ownerId = req.user._id;

    const newProperty = await Property.create({
      title,
      info: info || '',
      listingType: listingType ? listingType.toUpperCase() : 'SELL',
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
      success: true,
      message: 'Property added successfully!',
      property: newProperty,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



export const updateOwnerProperty =   async (req, res) => {
  try {
    const { id } = req.params; 
    const ownerId = req.user._id;
    const BASE_URL = process.env.BASE_URL || 'https://propertyapp.ddns.net';

    const property = await Property.findOne({ _id: id, ownerId });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

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

    const getFeatureValue = (key) => {
      if (req.body[`features[${key}]`] !== undefined) return req.body[`features[${key}]`];
      if (req.body.features && req.body.features[key] !== undefined) return req.body.features[key];
      return null;
    };

    const bed = getFeatureValue('bedroom');
    const bath = getFeatureValue('bathroom');
    const balc = getFeatureValue('balcony');

    if (bed !== null) property.features.bedroom = Number(bed);
    if (bath !== null) property.features.bathroom = Number(bath);
    if (balc !== null) property.features.balcony = Number(balc);

    const photoFiles = req.files?.['photos[]'] || req.files?.photos || [];
    const documentFiles = req.files?.['documents[]'] || req.files?.documents || [];

    if (photoFiles.length > 0) {
      property.photos = photoFiles.map((file) => {
        return `${BASE_URL}/uploads/${file.filename}`;
      });
    }

    if (documentFiles.length > 0) {
      property.documents = documentFiles.map((file) => {
        return `${BASE_URL}/uploads/${file.filename}`;
      });
    }
    if (title) property.title = title;
    if (info !== undefined) property.info = info;
    if (listingType) property.listingType = listingType.toUpperCase();
    if (price) property.price = Number(price);
    if (location) property.location = location;
    if (landArea) property.landArea = landArea;
    if (latitude) property.latitude = Number(latitude);
    if (longitude) property.longitude = Number(longitude);
    if (propertyType) property.propertyType = propertyType;

    const updatedProperty = await property.save();

    res.status(200).json({
      success: true,
      message: 'Property updated successfully!',
      property: updatedProperty,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const deleteOwnerProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user._id;

    // 1. Find the property and check ownership
    const property = await Property.findOne({ _id: id, ownerId });

    if (!property) {
      return res.status(404).json({ 
        message: 'Property not found or you do not have permission to delete it.' 
      });
    }

    // 2. Helper function to delete files from the disk
    const deleteFiles = (filePaths) => {
      filePaths.forEach((filePath) => {
        // Construct the absolute path (assuming 'uploads' is in the root)
        const fullPath = path.resolve(filePath); 
        
        fs.unlink(fullPath, (err) => {
          if (err) console.error(`Failed to delete file: ${filePath}`, err);
        });
      });
    };

    // 3. Delete associated photos and documents from the server
    if (property.photos && property.photos.length > 0) {
      deleteFiles(property.photos);
    }
    if (property.documents && property.documents.length > 0) {
      deleteFiles(property.documents);
    }

    // 4. Delete the property from the database
    await Property.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Property and associated files deleted successfully!',
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
      redirect_url: approveLink.href,
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



export const getOwnerPerformance =  async (req, res) => {
  try {
    const ownerId = req.user._id;
    const range = parseInt(req.query.range) || 7; 

    const properties = await Property.find({ ownerId });
    const propertyIds = properties.map(p => p._id);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);
    const totalImpressions = properties.reduce((sum, p) => sum + (p.views || 0), 0);
    
    const totalConversions = await Lead.countDocuments({ 
      interestedProperty: { $in: propertyIds },
      createdAt: { $gte: startDate } 
    });
    
    const conversionRate = totalImpressions > 0 
      ? ((totalConversions / totalImpressions) * 100).toFixed(1) 
      : 0;

    const trendData = [];
    const viewMap = {};

    properties.forEach(p => {
      p.dailyStats.forEach(stat => {
        viewMap[stat.date] = (viewMap[stat.date] || 0) + stat.viewCount;
      });
    });

    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      trendData.push({
        date: dateStr,
        label: range <= 7 ? d.toLocaleDateString('en-US', { weekday: 'short' }) : d.getDate().toString(),
        views: viewMap[dateStr] || 0 
      });
    }

    const listingBreakdown = await Promise.all(properties.map(async (p) => {
      const leadCount = await Lead.countDocuments({ 
        interestedProperty: p._id,
        createdAt: { $gte: startDate } 
      });
      return {
        id: p._id,
        title: p.title,
        views: p.views || 0,
        conversions: leadCount,
        rate: p.views > 0 ? ((leadCount / p.views) * 100).toFixed(1) : 0
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        rangeSelected: range,
        performanceCards: {
          impressions: totalImpressions,
          conversions: totalConversions,
          conversionRate: `${conversionRate}%`
        },
        conversionRateDonut: {
          rate: conversionRate,
          converted: totalConversions,
          notConverted: totalImpressions - totalConversions
        },
        impressionsTrend: trendData,
        listings: listingBreakdown.sort((a, b) => b.views - a.views)
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};