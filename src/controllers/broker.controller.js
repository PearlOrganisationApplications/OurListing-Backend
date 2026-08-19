import mongoose from 'mongoose';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Lead from '../models/Lead.js';
import Commission from '../models/Commission.js';

const BASE_URL = 'https://propertyapp.ddns.net/';

export const getStats = async (req, res) => {
  try {
    const brokerId = req.user._id;

    const activeListingsCount = await Property.countDocuments({
      brokerId,
      status: 'ACTIVE',
    });

    const totalLeads = await Lead.countDocuments({ brokerId });

    const hotLeads = await Lead.countDocuments({ brokerId, tag: 'HOT' });
    const warmLeads = await Lead.countDocuments({ brokerId, tag: 'WARM' });
    const coldLeads = await Lead.countDocuments({ brokerId, tag: 'COLD' });

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

    const formattedListings = properties.map((prop) => {
      let photoUrl = '';
      if (prop.photos && prop.photos.length > 0) {
        photoUrl = prop.photos[0].startsWith('http') ? prop.photos[0] : `${BASE_URL}${prop.photos[0]}`;
      }
      
      return {
        id: prop._id.toString(),
        title: prop.title,
        location: prop.location,
        price: prop.price,
        ownerName: prop.ownerId ? prop.ownerId.name : '',
        status: prop.status ? prop.status.toUpperCase() : 'ACTIVE',
        photoUrl,
         createdAt: prop.createdAt,
      };
    });

    res.status(200).json(formattedListings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getListingByIdForBroker = async (req, res) => {
  try {
    const { id } = req.params; 
    const brokerId = req.user._id;

    const property = await Property.findOne({ _id: id, brokerId: brokerId });

    if (!property) {
      return res.status(404).json({ 
        message: "Property Not found" 
      });
    }

    const propertyData = {
      id: property._id,
      title: property.title,
      info: property.info,
      listingType: property.listingType,
      propertyType: property.propertyType,
      price: property.price,
      location: property.location,
      latitude: property.latitude,
      longitude: property.longitude,
      landArea: property.landArea,
      features: {
        bedroom: property.features.bedroom,
        bathroom: property.features.bathroom,
        balcony: property.features.balcony,
      },
      photos: property.photos.map(p => p.startsWith('http') ? p : `${BASE_URL}${p}`),
      documents: property.documents.map(d => d.startsWith('http') ? d : `${BASE_URL}${d}`),
      views: property.views,
      status: property.status,
      dailyStats: property.dailyStats,
      brokerId: property.brokerId, 
      createdAt: property.createdAt,
      updatedAt: property.updatedAt
    };

    res.status(200).json(propertyData);
  } catch (error) {
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

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

    const photoUrls = [];
    const documentUrls = [];

    if (req.files) {
      const photosArray = req.files['photos[]'] || req.files['photos'] || [];
      const documentsArray = req.files['documents[]'] || req.files['documents'] || [];

      photosArray.forEach((file) => {
        photoUrls.push(`${BASE_URL}uploads/${file.filename}`);
      });

      documentsArray.forEach((file) => {
        documentUrls.push(`${BASE_URL}uploads/${file.filename}`);
      });
    }

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

      const userExists = await User.findOne({ email: ownerEmail });
      if (userExists) {
        resolvedOwnerId = userExists._id;
      } else {
        const newOwner = await User.create({
          name: ownerName,
          email: ownerEmail,
          number: ownerPhone || '',
          role: 'OWNER',
          password: 'password123', 
        });
        resolvedOwnerId = newOwner._id;
      }
    }

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

export const getLeads = async (req, res) => {
  try {
    const brokerId = req.user._id;
    const { type, tag, search, page = 1, limit = 10, sortBy = 'lastContactAt', order = 'desc' } = req.query;

    const query = { brokerId };
    if (type) {
      query.type = type.toUpperCase();
    }
    if (tag) {
      query.tag = tag.toUpperCase();
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

    lead.tag = tag.toUpperCase();
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

export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const isMatch = property.brokerId?.toString() === req.user._id.toString();

    if (!isMatch) {
      return res.status(403).json({ 
        message: "Unauthorized!", 
        dbId: property.brokerId, 
        tokenId: req.user._id 
      });
    }

    await Property.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const updateData = { ...req.body };

    const bedroom = req.body['features[bedroom]'] || req.body.features?.bedroom;
    const bathroom = req.body['features[bathroom]'] || req.body.features?.bathroom;
    const balcony = req.body['features[balcony]'] || req.body.features?.balcony;

    updateData.features = {
      bedroom: bedroom !== undefined ? Number(bedroom) : property.features.bedroom,
      bathroom: bathroom !== undefined ? Number(bathroom) : property.features.bathroom,
      balcony: balcony !== undefined ? Number(balcony) : property.features.balcony,
    };

    if (req.files) {
      const photos = req.files['photos[]'] || req.files['photos'] || [];
      const docs = req.files['documents[]'] || req.files['documents'] || [];

      if (photos.length > 0) {
        const photoPaths = photos.map(f => `${BASE_URL}uploads/${f.filename}`);
        updateData.photos = [...property.photos, ...photoPaths];
      }

      if (docs.length > 0) {
        const docPaths = docs.map(f => `${BASE_URL}uploads/${f.filename}`);
        updateData.documents = [...property.documents, ...docPaths];
      }
    }

    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.latitude) updateData.latitude = Number(updateData.latitude);
    if (updateData.longitude) updateData.longitude = Number(updateData.longitude);

    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Updated successfully',
      property: updatedProperty,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMapPins = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "Lat/Lng missing!" });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxDistanceKm = parseFloat(radius);

    const properties = await Property.aggregate([
      {
        $addFields: {
          distance: {
            $sqrt: {
              $add: [
                { $pow: [{ $subtract: ["$latitude", userLat] }, 2] },
                { $pow: [{ $subtract: ["$longitude", userLng] }, 2] }
              ]
            }
          }
        }
      },
      {
        $addFields: {
          distanceInKm: { $multiply: ["$distance", 111.32] }
        }
      },
      {
        $match: {
          status: 'ACTIVE',
          distanceInKm: { $lte: maxDistanceKm }
        }
      },
      {
        $sort: { distanceInKm: 1 }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          location: 1,
          latitude: 1,
          longitude: 1,
          distanceInKm: { $round: ["$distanceInKm", 2] } 
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Proximity Search Failed",
      error: error.message
    });
  }
};

export const closeDeal = async (req, res) => {
  try {
    const { propertyId, clientName, dealValue, commissionPercentage, closingDate } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    const commissionAmount = (dealValue * commissionPercentage) / 100;

    const newDeal = await Commission.create({
      brokerId: req.user._id, 
      propertyId,
      clientName,
      dealValue,
      commissionPercentage,
      commissionAmount,
      closingDate,
      status: 'Confirmed'
    });

    await Property.findByIdAndUpdate(propertyId, { status: 'SOLD' });

    res.status(201).json(newDeal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCommissionStats = async (req, res) => {
  try {
    const brokerId = req.user._id;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const stats = await Commission.aggregate([
      { $match: { brokerId: brokerId } },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$commissionAmount", 0] } },
          pending: { $sum: { $cond: [{ $ne: ["$status", "Paid"] }, "$commissionAmount", 0] } },
          thisMonth: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "Paid"] }, { $gte: ["$closingDate", startOfMonth] }] },
                "$commissionAmount", 0
              ]
            }
          }
        }
      }
    ]);

    res.json(stats[0] || { totalEarned: 0, pending: 0, thisMonth: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyDeals = async (req, res) => {
  try {
    const { status } = req.query; 
    let filter = { brokerId: req.user._id };
    if (status && status !== 'All') filter.status = status;

    const deals = await Commission.find(filter)
      .populate('propertyId', 'title location propertyType features') 
      .sort({ closingDate: -1 });

    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const updateCommissionStatus = async (req, res) => {
  try {
    const { id } = req.params; 
    const { status } = req.body; 

    const validStatuses = ['Pending', 'Confirmed', 'Paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid Status. Use Pending, Confirmed, or Paid" });
    }

    const updatedDeal = await Commission.findByIdAndUpdate(
      id,
      { status: status },
      { new: true } 
    );

    if (!updatedDeal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    res.status(200).json({
      message: `Status updated to ${status} successfully`,
      updatedDeal
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};