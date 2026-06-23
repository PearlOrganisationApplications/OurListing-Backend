import Favorite from '../models/Favorite.js';

export const getProperties = async (req, res) => {
  res.status(200).json({ message: "Get Properties placeholder" });
};

export const getNearbyProperties = async (req, res) => {
  res.status(200).json({ message: "Get Nearby Properties placeholder" });
};

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

export const toggleFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const propertyId = req.params.propertyId;
    // Check if the favorite already exists
    const existing = await Favorite.findOne({ user: userId, property: propertyId });
    if (existing) {
      await existing.deleteOne();
    } else {
      await Favorite.create({ user: userId, property: propertyId });
    }
    return res.status(200).json({ status: 'success', message: 'Favorite status updated' });
  } catch (error) {
    console.error('toggleFavorite error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
