import mongoose from 'mongoose';
import Property from '../models/Property.js';
import Favorite from '../models/Favorite.js';
import Lead from '../models/Lead.js';
import User from '../models/User.js';

// Returns a Set of property IDs (as strings) the current user has favorited.
// Returns an empty Set if there is no logged-in user (guest browsing).
const getUserFavoriteIdSet = async (userId) => {
  if (!userId) return new Set();
  const favorites = await Favorite.find({ user: userId }).select('property');
  return new Set(favorites.map((fav) => fav.property.toString()));
};


export const getProperties = async (req, res) => {
  try {
    // Populate owner to match the "user" object in the JSON spec
    const properties = await Property.find({}).populate('ownerId', 'name email number address role');
    const favoriteIds = await getUserFavoriteIdSet(req.user?._id);
    // Format response to match spec
    const formattedProperties = properties.map(prop => ({
      id: prop._id,
      title: prop.title,
      info: prop.info,
      user: {
        id: prop.ownerId?._id,
        email: prop.ownerId?.email,
        name: prop.ownerId?.name,
        number: prop.ownerId?.number,
        address: prop.ownerId?.address,
        role: prop.ownerId?.role,
      },
      listingType: prop.listingType,
      price: prop.price,
      location: prop.location,
      landArea: prop.landArea,
      latitude: prop.latitude,
      longitude: prop.longitude,
      photos: prop.photos,
      propertyType: prop.propertyType,
      features: prop.features,
     isFavorite: favoriteIds.has(prop._id.toString())
    }));

    res.status(200).json(formattedProperties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPropertyDetails = async (req, res) => {
  try {
    const prop = await Property.findById(req.params.propertyId).populate('ownerId', 'name email number address role');
    
  if (!prop) {
      return res.status(404).json({ message: 'Property not found' });
    }

    let isFavorite = false;
    if (req.user?._id) {
      const existing = await Favorite.findOne({ user: req.user._id, property: prop._id });
      isFavorite = !!existing;
    }

    const formattedProperty = {
      id: prop._id,
      title: prop.title,
      info: prop.info,
      user: {
        id: prop.ownerId?._id,
        email: prop.ownerId?.email,
        name: prop.ownerId?.name,
        number: prop.ownerId?.number,
        address: prop.ownerId?.address,
        role: prop.ownerId?.role,
      },
      listingType: prop.listingType,
      price: prop.price,
      location: prop.location,
      landArea: prop.landArea,
      latitude: prop.latitude,
      longitude: prop.longitude,
      photos: prop.photos,
      propertyType: prop.propertyType,
      features: prop.features,
       isFavorite
    };

    res.status(200).json(formattedProperty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNearbyProperties = async (req, res) => {
  const { latitude, longitude, radius } = req.query;

  try {
    if (!latitude || !longitude || !radius) {
      return res.status(400).json({ message: 'Please provide latitude, longitude, and radius' });
    }

    // In a real app with geospatial indexing, we'd use $near or $geoWithin.
    // Since we don't have a 2dsphere index mapped out, we will just return all properties for now
    // as a placeholder until the geospatial index is added to the schema.
  const properties = await Property.find({}).populate('ownerId', 'name email number address role');
    const favoriteIds = await getUserFavoriteIdSet(req.user?._id);

    const formattedProperties = properties.map(prop => ({
      id: prop._id,
      title: prop.title,
      info: prop.info,
      user: {
        id: prop.ownerId?._id,
        email: prop.ownerId?.email,
        name: prop.ownerId?.name,
        number: prop.ownerId?.number,
        address: prop.ownerId?.address,
        role: prop.ownerId?.role,
      },
      listingType: prop.listingType,
      price: prop.price,
      location: prop.location,
      landArea: prop.landArea,
      latitude: prop.latitude,
      longitude: prop.longitude,
      photos: prop.photos,
      propertyType: prop.propertyType,
      features: prop.features,
     isFavorite: favoriteIds.has(prop._id.toString())
    }));

    res.status(200).json(formattedProperties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const getFavorites = async (req, res) => {
//   try {
//     // Find all favorite entries for the authenticated user and populate property details
//     const favorites = await Favorite.find({ user: req.user._id }).populate('property');
export const getFavorites = async (req, res) => {
  try {
    // Find all favorite entries for the authenticated user and populate property details
    const favorites = await Favorite.find({ user: req.user._id }).populate('property');
    const properties = favorites.map((fav) => fav.property);
    return res.status(200).json({ status: 'success', data: properties });
  } catch (error) {
    console.error('getFavorites error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// export const toggleFavorite = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const propertyId = req.params.propertyId;
export const toggleFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const propertyId = req.params.propertyId;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid property ID' });
    }
    const propertyExists = await Property.exists({ _id: propertyId });
    if (!propertyExists) {
      return res.status(404).json({ status: 'error', message: 'Property not found' });
    }

    const existing = await Favorite.findOne({ user: userId, property: propertyId });
    let isFavorite;
    if (existing) {
      await existing.deleteOne();
      isFavorite = false;
    } else {
      await Favorite.create({ user: userId, property: propertyId });
      isFavorite = true;
    }
    return res.status(200).json({ status: 'success', message: 'Favorite status updated', isFavorite });
  } catch (error) {
    console.error('toggleFavorite error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const recordPropertyClick = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user._id;
    const buyerName = req.user.name;
    const buyerPhone = req.user.number || req.user.phone || 'N/A';

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ message: 'Invalid property ID format.' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Resolve broker ID
    let brokerId = property.brokerId;
    if (!brokerId) {
      // Fallback to first broker in system if property has no assigned broker
      const anyBroker = await User.findOne({ role: 'BROKER' });
      if (!anyBroker) {
        return res.status(400).json({ message: 'No broker available in the system to handle this lead.' });
      }
      brokerId = anyBroker._id;
    }

    // Check if lead already exists for this broker, phone and interestedProperty
    let lead = await Lead.findOne({
      brokerId,
      phone: buyerPhone,
      interestedProperty: propertyId
    });

    if (lead) {
      lead.lastContactAt = new Date();
      lead.tag = 'hot';
      await lead.save();
      return res.status(200).json({
        message: 'Property click registered. Lead updated to hot status.',
        lead
      });
    }

    // Create a new lead
    lead = await Lead.create({
      name: buyerName,
      phone: buyerPhone,
      type: 'buyer',
      tag: 'warm',
      interestedProperty: propertyId,
      brokerId
    });

    res.status(201).json({
      message: 'Property click registered. Created a new lead.',
      lead
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const searchProperties = async (req, res) => {
  try {
    const { 
      location, 
      lat, 
      lng, 
      radius = 10, 
      listingType, 
      minPrice, 
      maxPrice,
      propertyType 
    } = req.query;

    let query = {};

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    
    if (lat && lng) {
      const distanceInDegrees = radius / 111.32; 
      
      query.latitude = {
        $gte: parseFloat(lat) - distanceInDegrees,
        $lte: parseFloat(lat) + distanceInDegrees
      };
      query.longitude = {
        $gte: parseFloat(lng) - distanceInDegrees,
        $lte: parseFloat(lng) + distanceInDegrees
      };
    }

    if (listingType) query.listingType = listingType;
    if (propertyType) query.propertyType = propertyType;
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    query.status = 'Active';

    const properties = await Property.find(query)
      .populate('ownerId', 'name email') 
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};