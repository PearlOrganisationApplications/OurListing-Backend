import User from '../models/User.js';
import axios from 'axios';

export const saveUserLocation =  async (req, res) => {
  try {
    const userId = req.user._id || req.user.id; 
    const { latitude, longitude, locationName, address } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide latitude and longitude.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          address: address,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude], 
            locationName: locationName,
            formattedAddress: address
          }
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully using token identity",
      data: {
        location: updatedUser.location,
        address: updatedUser.address
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

export const getUserLocation = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('location address');
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteUserLocation =  async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id || req.user.id,
      { 
        $unset: { 
          location: 1, 
          address: 1 
        } 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: "Location  completely removed from database" 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, locationName, address } = req.body;
    
    const updateData = {};
    if (address) updateData.address = address;
    if (locationName) updateData["location.locationName"] = locationName;
    if (address) updateData["location.formattedAddress"] = address;
    if (latitude !== undefined && longitude !== undefined) {
      updateData["location.coordinates"] = [longitude, latitude];
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id || req.user.id,
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({ success: true, data: updatedUser.location });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


export const getLocationById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('location address name');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.location) {
      return res.status(404).json({ success: false, message: "Location not set for this user" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const searchExternalLocation = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: "Query is required" });
    }

    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 5
      },
      headers: {
        'User-Agent': 'YourAppName'
      }
    });

    const results = response.data.map(item => ({
      name: item.display_name,
      latitude: item.lat,
      longitude: item.lon,
      city: item.address.city || item.address.town || item.address.village,
      state: item.address.state,
      country: item.address.country
    }));

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};