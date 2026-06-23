export const getProperties = async (req, res) => {
  try {
    // Populate user to match the "user" object in the JSON spec
    const properties = await Property.find({}).populate('ownerId', 'name email number address role');
    
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
      isFavorite: false // Default, needs favorite logic to be fully dynamic
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
      isFavorite: false
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
      isFavorite: false
    }));

    res.status(200).json(formattedProperties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
