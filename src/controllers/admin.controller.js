import User from '../models/User.js';
import Property from '../models/Property.js';
import Lead from '../models/Lead.js';
import MortgageListing from '../models/MortgageListing.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// --- ADMIN AUTH CONTROLLERS ---

// POST /api/admin/register
export const adminRegister = async (req, res) => {
  const { name, email, password, number, address } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const adminUser = await User.create({
      name,
      email,
      password,
      number,
      address,
      role: 'ADMIN', // Force admin role
    });

    res.status(201).json({
      _id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      token: generateToken(adminUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/login
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. User is not an admin.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/profile
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin profile not found' });
    }
    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- DASHBOARD CONTROLLER ---

// GET /api/admin/dashboard/stats
export const getDashboardStats = async (req, res) => {
  try {
    // User counts by role
    const buyerCount = await User.countDocuments({ role: 'BUYER' });
    const ownerCount = await User.countDocuments({ role: 'OWNER' });
    const brokerCount = await User.countDocuments({ role: 'BROKER' });
    const lenderCount = await User.countDocuments({ role: 'LENDER' });
    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    const totalUsers = buyerCount + ownerCount + brokerCount + lenderCount + adminCount;

    // Property counts by status
    const activeProperties = await Property.countDocuments({ status: 'Active' });
    const soldProperties = await Property.countDocuments({ status: 'Sold' });
    const inactiveProperties = await Property.countDocuments({ status: 'Inactive' });
    const draftProperties = await Property.countDocuments({ status: 'Draft' });
    const totalProperties = activeProperties + soldProperties + inactiveProperties + draftProperties;

    // Property counts by listing type
    const sellProperties = await Property.countDocuments({ listingType: 'Sell' });
    const rentProperties = await Property.countDocuments({ listingType: 'Rent' });

    // Lead counts by tag
    const hotLeads = await Lead.countDocuments({ tag: 'hot' });
    const warmLeads = await Lead.countDocuments({ tag: 'warm' });
    const coldLeads = await Lead.countDocuments({ tag: 'cold' });
    const totalLeads = hotLeads + warmLeads + coldLeads;

    // Mortgage listings
    const totalMortgages = await MortgageListing.countDocuments({});

    res.status(200).json({
      users: {
        total: totalUsers,
        buyer: buyerCount,
        owner: ownerCount,
        broker: brokerCount,
        lender: lenderCount,
        admin: adminCount
      },
      properties: {
        total: totalProperties,
        active: activeProperties,
        sold: soldProperties,
        inactive: inactiveProperties,
        draft: draftProperties,
        sellType: sellProperties,
        rentType: rentProperties
      },
      leads: {
        total: totalLeads,
        hot: hotLeads,
        warm: warmLeads,
        cold: coldLeads
      },
      mortgages: {
        total: totalMortgages
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- USER CRUD CONTROLLERS ---

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { number: { $regex: search, $options: 'i' } }
      ];
    }

    const skipIndex = (page - 1) * limit;
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .skip(skipIndex)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/users
export const createUser = async (req, res) => {
  const { name, email, password, role, number, address } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'BUYER',
      number,
      address
    });

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/users/:id
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, password, role, number, address } = req.body;

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (number !== undefined) user.number = number;
    if (address !== undefined) user.address = address;

    if (password) {
      user.password = password; // Pre-save hook will hash it automatically
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// --- PROPERTY CRUD CONTROLLERS ---

// GET /api/admin/properties
export const getAllProperties = async (req, res) => {
  try {
    const { status, listingType, ownerId, brokerId, search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (listingType) query.listingType = listingType;
    if (ownerId) query.ownerId = ownerId;
    if (brokerId) query.brokerId = brokerId;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { propertyType: { $regex: search, $options: 'i' } }
      ];
    }

    const skipIndex = (page - 1) * limit;
    const total = await Property.countDocuments(query);
    const properties = await Property.find(query)
      .populate('ownerId', 'name email role')
      .populate('brokerId', 'name email role')
      .skip(skipIndex)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      properties,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/properties/:id
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('ownerId', 'name email role number address')
      .populate('brokerId', 'name email role number address');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/properties
export const createProperty = async (req, res) => {
  try {
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
      status,
      ownerId,
      brokerId
    } = req.body;

    // Validate owner exists
    if (!ownerId) {
      return res.status(400).json({ message: 'ownerId is required' });
    }
    const ownerExists = await User.findById(ownerId);
    if (!ownerExists) {
      return res.status(404).json({ message: 'Owner user not found' });
    }

    if (brokerId) {
      const brokerExists = await User.findById(brokerId);
      if (!brokerExists) {
        return res.status(404).json({ message: 'Broker user not found' });
      }
    }

    // Resolve features
    const bedroom = Number(req.body['features[bedroom]'] || (req.body.features && req.body.features.bedroom) || 0);
    const bathroom = Number(req.body['features[bathroom]'] || (req.body.features && req.body.features.bathroom) || 0);
    const balcony = Number(req.body['features[balcony]'] || (req.body.features && req.body.features.balcony) || 0);

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

    const newProperty = await Property.create({
      title,
      info,
      listingType,
      propertyType,
      price: Number(price),
      location,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      landArea,
      status: status || 'Active',
      features: { bedroom, bathroom, balcony },
      photos: photoUrls,
      documents: documentUrls,
      ownerId,
      brokerId: brokerId || undefined
    });

    res.status(201).json(newProperty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/properties/:id
export const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

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
      status,
      ownerId,
      brokerId
    } = req.body;

    if (ownerId) {
      const ownerExists = await User.findById(ownerId);
      if (!ownerExists) {
        return res.status(404).json({ message: 'Owner user not found' });
      }
      property.ownerId = ownerId;
    }

    if (brokerId !== undefined) {
      if (brokerId) {
        const brokerExists = await User.findById(brokerId);
        if (!brokerExists) {
          return res.status(404).json({ message: 'Broker user not found' });
        }
        property.brokerId = brokerId;
      } else {
        property.brokerId = undefined; // clear broker
      }
    }

    // Update main fields
    if (title) property.title = title;
    if (info !== undefined) property.info = info;
    if (listingType) property.listingType = listingType;
    if (propertyType !== undefined) property.propertyType = propertyType;
    if (price !== undefined) property.price = Number(price);
    if (location) property.location = location;
    if (latitude !== undefined) property.latitude = Number(latitude);
    if (longitude !== undefined) property.longitude = Number(longitude);
    if (landArea !== undefined) property.landArea = landArea;
    if (status) property.status = status;

    // Resolve features
    if (req.body['features[bedroom]'] !== undefined || (req.body.features && req.body.features.bedroom) !== undefined) {
      property.features.bedroom = Number(req.body['features[bedroom]'] || (req.body.features && req.body.features.bedroom));
    }
    if (req.body['features[bathroom]'] !== undefined || (req.body.features && req.body.features.bathroom) !== undefined) {
      property.features.bathroom = Number(req.body['features[bathroom]'] || (req.body.features && req.body.features.bathroom));
    }
    if (req.body['features[balcony]'] !== undefined || (req.body.features && req.body.features.balcony) !== undefined) {
      property.features.balcony = Number(req.body['features[balcony]'] || (req.body.features && req.body.features.balcony));
    }

    // Parse uploaded files
    if (req.files) {
      const photosArray = req.files['photos[]'] || req.files['photos'] || [];
      const documentsArray = req.files['documents[]'] || req.files['documents'] || [];

      photosArray.forEach((file) => {
        property.photos.push(file.path.replace(/\\/g, '/'));
      });

      documentsArray.forEach((file) => {
        property.documents.push(file.path.replace(/\\/g, '/'));
      });
    }

    await property.save();
    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/properties/:id
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    await Property.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// --- LEAD CRUD CONTROLLERS ---

// GET /api/admin/leads
export const getAllLeads = async (req, res) => {
  try {
    const { brokerId, type, tag, search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (brokerId) query.brokerId = brokerId;
    if (type) query.type = type.toLowerCase();
    if (tag) query.tag = tag.toLowerCase();

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skipIndex = (page - 1) * limit;
    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .populate('brokerId', 'name email role')
      .populate('interestedProperty', 'title price location')
      .skip(skipIndex)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      leads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/leads/:id
export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('brokerId', 'name email role number address')
      .populate('interestedProperty', 'title price location listingType status');
      
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.status(200).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/leads
export const createLead = async (req, res) => {
  try {
    const { name, phone, type, tag, interestedProperty, brokerId } = req.body;

    if (!brokerId) {
      return res.status(400).json({ message: 'brokerId is required' });
    }
    const brokerExists = await User.findById(brokerId);
    if (!brokerExists) {
      return res.status(404).json({ message: 'Broker user not found' });
    }

    if (interestedProperty) {
      const propertyExists = await Property.findById(interestedProperty);
      if (!propertyExists) {
        return res.status(404).json({ message: 'Property not found' });
      }
    }

    const newLead = await Lead.create({
      name,
      phone,
      type: type || 'buyer',
      tag: tag || 'warm',
      interestedProperty: interestedProperty || undefined,
      brokerId
    });

    res.status(201).json(newLead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/leads/:id
export const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const { name, phone, type, tag, interestedProperty, brokerId } = req.body;

    if (brokerId) {
      const brokerExists = await User.findById(brokerId);
      if (!brokerExists) {
        return res.status(404).json({ message: 'Broker user not found' });
      }
      lead.brokerId = brokerId;
    }

    if (interestedProperty !== undefined) {
      if (interestedProperty) {
        const propertyExists = await Property.findById(interestedProperty);
        if (!propertyExists) {
          return res.status(404).json({ message: 'Property not found' });
        }
        lead.interestedProperty = interestedProperty;
      } else {
        lead.interestedProperty = undefined;
      }
    }

    if (name) lead.name = name;
    if (phone) lead.phone = phone;
    if (type) lead.type = type.toLowerCase();
    if (tag) lead.tag = tag.toLowerCase();

    lead.lastContactAt = new Date();
    await lead.save();

    res.status(200).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/leads/:id
export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    await Lead.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// --- MORTGAGE LISTING CRUD CONTROLLERS ---

// GET /api/admin/mortgages
export const getAllMortgages = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { propertyType: { $regex: search, $options: 'i' } },
        { propertyAddress: { $regex: search, $options: 'i' } },
        { buyerIntent: { $regex: search, $options: 'i' } }
      ];
    }

    const skipIndex = (page - 1) * limit;
    const total = await MortgageListing.countDocuments(query);
    const mortgages = await MortgageListing.find(query)
      .skip(skipIndex)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      mortgages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/mortgages/:id
export const getMortgageById = async (req, res) => {
  try {
    const mortgage = await MortgageListing.findById(req.params.id);
    if (!mortgage) {
      return res.status(404).json({ message: 'Mortgage listing not found' });
    }
    res.status(200).json(mortgage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/mortgages
export const createMortgage = async (req, res) => {
  try {
    const {
      propertyType,
      propertyAddress,
      purchasePrice,
      requestedLoan,
      ltvRatio,
      ficoScore,
      buyerIntent
    } = req.body;

    const newMortgage = await MortgageListing.create({
      propertyType,
      propertyAddress,
      purchasePrice,
      requestedLoan,
      ltvRatio,
      ficoScore,
      buyerIntent
    });

    res.status(201).json(newMortgage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/mortgages/:id
export const updateMortgage = async (req, res) => {
  try {
    const mortgage = await MortgageListing.findById(req.params.id);
    if (!mortgage) {
      return res.status(404).json({ message: 'Mortgage listing not found' });
    }

    const {
      propertyType,
      propertyAddress,
      purchasePrice,
      requestedLoan,
      ltvRatio,
      ficoScore,
      buyerIntent
    } = req.body;

    if (propertyType) mortgage.propertyType = propertyType;
    if (propertyAddress) mortgage.propertyAddress = propertyAddress;
    if (purchasePrice) mortgage.purchasePrice = purchasePrice;
    if (requestedLoan) mortgage.requestedLoan = requestedLoan;
    if (ltvRatio) mortgage.ltvRatio = ltvRatio;
    if (ficoScore) mortgage.ficoScore = ficoScore;
    if (buyerIntent) mortgage.buyerIntent = buyerIntent;

    await mortgage.save();
    res.status(200).json(mortgage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/mortgages/:id
export const deleteMortgage = async (req, res) => {
  try {
    const mortgage = await MortgageListing.findById(req.params.id);
    if (!mortgage) {
      return res.status(404).json({ message: 'Mortgage listing not found' });
    }
    await MortgageListing.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Mortgage listing deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// GET /api/admin/buyers
export const getAllBuyers = async (req, res) => {
  try {
    const buyers = await User.find({ role: "buyer" || "BUYER" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: buyers.length,
      buyers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// GET /api/admin/owners
export const getAllOwners = async (req, res) => {
  try {
    const owners = await User.find({ role: "owner" || "OWNER" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: owners.length,
      owners,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// GET /api/admin/brokers
export const getAllBrokers = async (req, res) => {
  try {
    const brokers = await User.find({ role: "broker" || "BROKER" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: brokers.length,
      brokers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// GET /api/admin/lenders
export const getAllLenders = async (req, res) => {
  try {
    const lenders = await User.find({ role: "lender" || "LENDER" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: lenders.length,
      lenders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




// PUT /api/admin/buyers/:id
export const updateBuyer = async (req, res) => {
  try {
    const buyer = await User.findOne({
      _id: req.params.id,
      role: "buyer",
    });

    if (!buyer) {
      return res.status(404).json({
        success: false,
        message: "Buyer not found",
      });
    }

    const { name, email, number, address, password } = req.body;

    if (name) buyer.name = name;
    if (email) buyer.email = email;
    if (number) buyer.number = number;
    if (address) buyer.address = address;
    if (password) buyer.password = password;

    await buyer.save();

    res.status(200).json({
      success: true,
      message: "Buyer updated successfully",
      buyer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// DELETE /api/admin/buyers/:id
export const deleteBuyer = async (req, res) => {
  try {
    const buyer = await User.findOne({
      _id: req.params.id,
      role: "buyer",
    });

    if (!buyer) {
      return res.status(404).json({
        success: false,
        message: "Buyer not found",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Buyer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// PUT /api/admin/owners/:id
export const updateOwner = async (req, res) => {
  try {
    const owner = await User.findOne({
      _id: req.params.id,
      role: "owner",
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    Object.assign(owner, req.body);

    await owner.save();

    res.status(200).json({
      success: true,
      message: "Owner updated successfully",
      owner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// DELETE /api/admin/owners/:id
export const deleteOwner = async (req, res) => {
  try {
    const owner = await User.findOne({
      _id: req.params.id,
      role: "owner",
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Owner deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// PUT /api/admin/brokers/:id
export const updateBroker = async (req, res) => {
  try {
    const broker = await User.findOne({
      _id: req.params.id,
      role: "broker",
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    Object.assign(broker, req.body);

    await broker.save();

    res.status(200).json({
      success: true,
      message: "Broker updated successfully",
      broker,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// DELETE /api/admin/brokers/:id
export const deleteBroker = async (req, res) => {
  try {
    const broker = await User.findOne({
      _id: req.params.id,
      role: "broker",
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Broker deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// PUT /api/admin/lenders/:id
export const updateLender = async (req, res) => {
  try {
    const lender = await User.findOne({
      _id: req.params.id,
      role: "lender",
    });

    if (!lender) {
      return res.status(404).json({
        success: false,
        message: "Lender not found",
      });
    }

    Object.assign(lender, req.body);

    await lender.save();

    res.status(200).json({
      success: true,
      message: "Lender updated successfully",
      lender,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// DELETE /api/admin/lenders/:id
export const deleteLender = async (req, res) => {
  try {
    const lender = await User.findOne({
      _id: req.params.id,
      role: "lender",
    });

    if (!lender) {
      return res.status(404).json({
        success: false,
        message: "Lender not found",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Lender deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};