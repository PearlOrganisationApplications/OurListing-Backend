import User from '../models/User.js';

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
