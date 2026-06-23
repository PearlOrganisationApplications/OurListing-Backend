import mongoose from 'mongoose';
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
      status: 'Active',
    });

    // Count leads for this broker
    const totalLeads = await Lead.countDocuments({ brokerId });

    // Group leads by tag
    const hotLeads = await Lead.countDocuments({ brokerId, tag: 'hot' });
    const warmLeads = await Lead.countDocuments({ brokerId, tag: 'warm' });
    const coldLeads = await Lead.countDocuments({ brokerId, tag: 'cold' });

    // Calculate commissions (2.5% of price)
    const properties = await Property.find({ brokerId });
    let pendingCommission = 0;
    let earnedCommission = 0;

    properties.forEach((prop) => {
      const commission = (prop.price || 0) * 0.025;
      if (prop.status === 'Active') {
        pendingCommission += commission;
      } else if (prop.status === 'Sold') {
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
        active: 'Active',
        draft: 'Draft',
        sold: 'Sold',
        inactive: 'Inactive',
      };
      query.status = statusMap[status.toLowerCase()] || status;
    }

    const properties = await Property.find(query).populate('ownerId', 'name');

    const formattedListings = properties.map((prop) => ({
      id: prop._id.toString(),
      title: prop.title,
      location: prop.location,
      price: prop.price,
      ownerName: prop.ownerId ? prop.ownerId.name : '',
      status: prop.status ? prop.status.toLowerCase() : 'active',
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
          role: 'owner',
          password: 'password123', // auto-hashed
        });
        resolvedOwnerId = newOwner._id;
      }
    }

    // Map status enum
    let dbStatus = 'Active';
    if (status) {
      const statusMap = {
        active: 'Active',
        draft: 'Draft',
        sold: 'Sold',
        inactive: 'Inactive',
      };
      dbStatus = statusMap[status.toLowerCase()] || status;
    }

    const newProperty = await Property.create({
      title,
      info: info || '',
      listingType: listingType || 'Sell',
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
    const { type, tag, search, page = 1, limit = 10, sortBy = 'lastContactAt', order = 'desc' } = req.query;

    const query = { brokerId };
    if (type) {
      query.type = type.toLowerCase();
    }
    if (tag) {
      query.tag = tag.toLowerCase();
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const sortField = sortBy || 'lastContactAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    const totalLeads = await Lead.countDocuments(query);

    const leads = await Lead.find(query)
      .populate('interestedProperty', 'title')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

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

    res.status(200).json({
      leads: formattedLeads,
      pagination: {
        total: totalLeads,
        page: pageNum,
        pages: Math.ceil(totalLeads / limitNum),
        limit: limitNum,
      }
    });
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

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ message: 'Invalid lead ID format.' });
    }

    if (!tag || !['hot', 'warm', 'cold'].includes(tag.toLowerCase())) {
      return res.status(400).json({
        message: 'Invalid tag value. Allowed values: hot, warm, cold',
      });
    }

    const lead = await Lead.findOne({ _id: leadId, brokerId }).populate('interestedProperty', 'title');

    if (!lead) {
      return res.status(404).json({
        message: 'Lead not found or not associated with this broker',
      });
    }

    lead.tag = tag.toLowerCase();
    lead.lastContactAt = new Date();
    await lead.save();

    const formattedLead = {
      id: lead._id.toString(),
      name: lead.name,
      phone: lead.phone,
      type: lead.type,
      tag: lead.tag,
      interestedProperty: lead.interestedProperty ? lead.interestedProperty.title : '',
      lastContactAt: lead.lastContactAt.toISOString(),
    };

    res.status(200).json({
      message: 'Lead tag updated successfully',
      lead: formattedLead
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
