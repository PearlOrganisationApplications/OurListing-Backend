import User from '../models/User.js';
import Property from '../models/Property.js';
import Lead from '../models/Lead.js';

// GET /api/broker/stats
export const getStats = async (req, res) => {
  try {
    const brokerId = req.user._id;

    // Count active listings for this broker
    const activeListingsCount = await Property.countDocuments({
      brokerId,
      status: 'ACTIVE',
    });

    // Count leads for this broker
    const totalLeads = await Lead.countDocuments({ brokerId });

    // Group leads by tag
    const hotLeads = await Lead.countDocuments({ brokerId, tag: 'HOT' });
    const warmLeads = await Lead.countDocuments({ brokerId, tag: 'WARM' });
    const coldLeads = await Lead.countDocuments({ brokerId, tag: 'COLD' });

    // Calculate commissions (2.5% of price)
    const properties = await Property.find({ brokerId });
    let pendingCommission = 0;
    let earnedCommission = 0;

    properties.forEach((prop) => {
      const commission = (prop.price || 0) * 0.025;
      if (prop.status === 'ACTIVE') {
        pendingCommission += commission;
      } else if (prop.status === 'SOLD') {
        earnedCommission += commission;
      }
    });

    res.status(200).json({
      activeListings: activeListingsCount,
      totalLeads,
      hotLeads,
      warmLeads,
      coldLeads,
      pendingCommission,
      earnedCommission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/broker/listings
export const getListings = async (req, res) => {
  try {
    const brokerId = req.user._id;
    const { status } = req.query;

    const query = { brokerId };
    if (status) {
      const statusMap = {
        active: 'ACTIVE',
        draft: 'DRAFT',
        sold: 'SOLD',
        inactive: 'INACTIVE',
      };
      query.status = statusMap[status.toLowerCase()] || status.toUpperCase();
    }

    const properties = await Property.find(query).populate('ownerId', 'name');

    const formattedListings = properties.map((prop) => ({
      id: prop._id.toString(),
      title: prop.title,
      location: prop.location,
      price: prop.price,
      ownerName: prop.ownerId ? prop.ownerId.name : '',
      status: prop.status ? prop.status.toUpperCase() : 'ACTIVE',
      photoUrl: prop.photos && prop.photos.length > 0 ? prop.photos[0] : '',
    }));

    res.status(200).json(formattedListings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/broker/properties/add
export const addProperty = async (req, res) => {
  try {
    const brokerId = req.user._id;

    const {
      title,
      info,
      listingType,
      propertyType,
      price,
      location,
      latitude,
      longitude,
      landArea,
      ownerName,
      ownerPhone,
      ownerEmail,
      ownerId,
      status,
    } = req.body;

    // Resolve features (supports nested features[balcony] as well as flat balcony fields)
    const bedroom = Number(
      req.body['features[bedroom]'] ||
      (req.body.features && req.body.features.bedroom) ||
      req.body.bedroom ||
      0
    );
    const bathroom = Number(
      req.body['features[bathroom]'] ||
      (req.body.features && req.body.features.bathroom) ||
      req.body.bathroom ||
      0
    );
    const balcony = Number(
      req.body['features[balcony]'] ||
      (req.body.features && req.body.features.balcony) ||
      req.body.balcony ||
      0
    );

    // Parse uploaded files
    const photoUrls = [];
    const documentUrls = [];

    if (req.files) {
      const photosArray = req.files['photos[]'] || req.files['photos'] || [];
      const documentsArray = req.files['documents[]'] || req.files['documents'] || [];

      photosArray.forEach((file) => {
        photoUrls.push(file.path.replace(/\\/g, '/'));
      });

      documentsArray.forEach((file) => {
        documentUrls.push(file.path.replace(/\\/g, '/'));
      });
    }

    // Resolve Owner ID
    let resolvedOwnerId;

    if (ownerId) {
      const existingUser = await User.findById(ownerId);
      if (existingUser) {
        resolvedOwnerId = existingUser._id;
      }
    }

    if (!resolvedOwnerId && ownerEmail) {
      const existingUser = await User.findOne({ email: ownerEmail });
      if (existingUser) {
        resolvedOwnerId = existingUser._id;
      }
    }

    if (!resolvedOwnerId) {
      if (!ownerName || !ownerEmail) {
        return res.status(400).json({
          message: 'Owner name and email are required to link or create an owner user.',
        });
      }

      // Check user existence again
      const userExists = await User.findOne({ email: ownerEmail });
      if (userExists) {
        resolvedOwnerId = userExists._id;
      } else {
        const newOwner = await User.create({
          name: ownerName,
          email: ownerEmail,
          number: ownerPhone || '',
          role: 'OWNER',
          password: 'password123', // auto-hashed
        });
        resolvedOwnerId = newOwner._id;
      }
    }

    // Map status enum
    let dbStatus = 'ACTIVE';
    if (status) {
      const statusMap = {
        active: 'ACTIVE',
        draft: 'DRAFT',
        sold: 'SOLD',
        inactive: 'INACTIVE',
      };
      dbStatus = statusMap[status.toLowerCase()] || status.toUpperCase();
    }

    const newProperty = await Property.create({
      title,
      info: info || '',
      listingType: listingType ? listingType.toUpperCase() : 'SELL',
      propertyType: propertyType || '',
      price: Number(price || 0),
      location,
      latitude: Number(latitude || 0),
      longitude: Number(longitude || 0),
      landArea: landArea || '',
      features: {
        bedroom,
        bathroom,
        balcony,
      },
      photos: photoUrls,
      documents: documentUrls,
      ownerId: resolvedOwnerId,
      brokerId,
      status: dbStatus,
    });

    res.status(201).json({
      message: 'Broker property added successfully!',
      propertyId: newProperty._id.toString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/broker/leads
export const getLeads = async (req, res) => {
  try {
    const brokerId = req.user._id;
    const { type, tag } = req.query;

    const query = { brokerId };
    if (type) {
      query.type = type.toUpperCase();
    }
    if (tag) {
      query.tag = tag.toUpperCase();
    }

    const leads = await Lead.find(query).populate('interestedProperty', 'title');

    const formattedLeads = leads.map((lead) => ({
      id: lead._id.toString(),
      name: lead.name,
      phone: lead.phone,
      type: lead.type,
      tag: lead.tag,
      interestedProperty: lead.interestedProperty ? lead.interestedProperty.title : '',
      lastContactAt: lead.lastContactAt
        ? lead.lastContactAt.toISOString()
        : new Date().toISOString(),
    }));

    res.status(200).json(formattedLeads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/broker/leads/:leadId/tag
export const updateLeadTag = async (req, res) => {
  try {
    const brokerId = req.user._id;
    const { leadId } = req.params;
    const { tag } = req.body;

    if (!tag || !['hot', 'warm', 'cold'].includes(tag.toLowerCase())) {
      return res.status(400).json({
        message: 'Invalid tag value. Allowed values: hot, warm, cold',
      });
    }

    const lead = await Lead.findOne({ _id: leadId, brokerId });

    if (!lead) {
      return res.status(404).json({
        message: 'Lead not found or not associated with this broker',
      });
    }

    lead.tag = tag.toUpperCase();
    lead.lastContactAt = new Date();
    await lead.save();

    res.status(200).json({ message: 'Lead tag updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
