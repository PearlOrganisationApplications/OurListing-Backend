import Property from "../models/Property.js";
import Favorite from "../models/Favorite.js";
import Plan from "../models/Plan.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import Commission from "../models/Commission.js";
import LenderApplication from "../models/LenderApplication.js";
import LenderPipeline from "../models/LenderPipeline.js";
import MortgageListing from "../models/MortgageListing.js";
import MortgageApplication from "../models/MortgageApplication.js";

export async function executeTool(toolName, args, userContext) {
  const handler = handlers[toolName];
  if (!handler) return { error: `Unknown tool: ${toolName}` };
  try {
    return await handler(args, userContext);
  } catch (err) {
    console.error(`Tool ${toolName} failed:`, err);
    return { error: `Failed to run ${toolName}` };
  }
}

const handlers = {
  async search_properties({ location, listingType, propertyType, minPrice, maxPrice, bedroom, bathroom, balcony, status, limit = 5 }) {
    const filter = {};
    if (location) filter.location = new RegExp(location, "i");
    if (listingType) filter.listingType = listingType.toUpperCase();
    if (propertyType) filter.propertyType = new RegExp(propertyType, "i");
    if (status) filter.status = status.toUpperCase();
    if (bedroom) filter["features.bedroom"] = bedroom;
    if (bathroom) filter["features.bathroom"] = bathroom;
    if (balcony) filter["features.balcony"] = balcony;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }
    if (!status) filter.status = "ACTIVE";

    const results = await Property.find(filter).limit(limit).lean();
    return { count: results.length, results };
  },

  async get_property_details({ propertyId, title }) {
    const filter = propertyId ? { _id: propertyId } : { title: new RegExp(title || "", "i") };
    const property = await Property.findOne(filter).lean();
    return property || { error: "Property not found" };
  },

  async get_plans() {
    const plans = await Plan.find({ enabled: true }).lean();
    return { count: plans.length, plans };
  },

  async manage_favorites({ action, propertyId }, { userId }) {
    if (action === "list") {
      const favorites = await Favorite.find({ user: userId }).populate("property").lean();
      return { count: favorites.length, favorites };
    }
    if (action === "add") {
      await Favorite.updateOne({ user: userId, property: propertyId }, {}, { upsert: true });
      return { success: true, message: "Added to favorites" };
    }
    if (action === "remove") {
      await Favorite.deleteOne({ user: userId, property: propertyId });
      return { success: true, message: "Removed from favorites" };
    }
    return { error: "Invalid action" };
  },

  async get_my_plan(_args, { userId }) {
    const user = await User.findById(userId).select("planType planPrice").lean();
    return user || { error: "User not found" };
  },

  async get_buyer_mortgage_status(_args, { userId }) {
    const listings = await MortgageListing.find({ buyer: userId }).lean();
    const listingIds = listings.map((l) => l._id);
    const applications = await MortgageApplication.find({ listingId: { $in: listingIds } }).lean();
    return { listings, applications };
  },

  async get_owner_properties({ status, limit = 10 }, { userId }) {
    const filter = { ownerId: userId };
    if (status) filter.status = status.toUpperCase();
    const results = await Property.find(filter).limit(limit).lean();
    return { count: results.length, results };
  },

  async get_property_views({ propertyId }, { userId }) {
    const property = await Property.findOne({ _id: propertyId, ownerId: userId })
      .select("title views dailyStats")
      .lean();
    if (!property) return { error: "Property not found or not owned by this user" };
    return property;
  },

  async update_property_status({ propertyId, status }, { userId }) {
    const property = await Property.findOneAndUpdate(
      { _id: propertyId, ownerId: userId },
      { status: status.toUpperCase() },
      { new: true }
    );
    if (!property) return { error: "Property not found or not owned by this user" };
    return { success: true, property };
  },

  async get_broker_properties({ status, limit = 10 }, { userId }) {
    const filter = { brokerId: userId };
    if (status) filter.status = status.toUpperCase();
    const results = await Property.find(filter).limit(limit).lean();
    return { count: results.length, results };
  },

  async get_broker_leads({ tag, type, propertyId, limit = 10 }, { userId }) {
    const filter = { brokerId: userId };
    if (tag) filter.tag = tag.toUpperCase();
    if (type) filter.type = type.toUpperCase();
    if (propertyId) filter.interestedProperty = propertyId;
    const results = await Lead.find(filter).limit(limit).lean();
    return { count: results.length, results };
  },

  async get_broker_commissions({ status, limit = 10 }, { userId }) {
    const filter = { brokerId: userId };
    if (status) filter.status = status;
    const results = await Commission.find(filter).limit(limit).lean();
    const total = results.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
    return { count: results.length, totalCommission: total, results };
  },

  async get_lender_applications({ status, tag, state, city, minFico, limit = 10 }, { userId }) {
    const filter = { $or: [{ lenderId: userId }, { lenderId: null }] };
    if (status) filter.status = status;
    if (tag) filter.tag = tag.toLowerCase();
    if (state) filter.state = new RegExp(state, "i");
    if (city) filter.city = new RegExp(city, "i");
    const results = await LenderApplication.find(filter).limit(limit).lean();
    return { count: results.length, results };
  },

  async get_lender_pipeline({ stage, pipelineStatus, loanType, limit = 10 }, { userId }) {
    const filter = { lenderId: userId };
    if (stage) filter.stage = stage;
    if (pipelineStatus) filter.pipelineStatus = pipelineStatus;
    if (loanType) filter.loanType = loanType;
    const results = await LenderPipeline.find(filter).limit(limit).lean();
    return { count: results.length, results };
  },

  async get_mortgage_listings({ propertyId, limit = 10 }) {
    const filter = {};
    if (propertyId) filter.property = propertyId;
    const results = await MortgageListing.find(filter).limit(limit).lean();
    return { count: results.length, results };
  },

  async get_mortgage_applications({ status, limit = 10 }, { userId }) {
    const filter = { lender: userId };
    if (status) filter.status = status;
    const results = await MortgageApplication.find(filter).limit(limit).lean();
    return { count: results.length, results };
  },

  async get_platform_stats() {
    const [usersByRole, propertiesByStatus, totalCommission, totalFunded] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Property.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Commission.aggregate([{ $group: { _id: null, total: { $sum: "$commissionAmount" } } }]),
      LenderPipeline.aggregate([
        { $match: { stage: "Funded" } },
        { $group: { _id: null, total: { $sum: "$loanAmount" } } },
      ]),
    ]);
    return {
      usersByRole,
      propertiesByStatus,
      totalCommissionPaid: totalCommission[0]?.total || 0,
      totalLoansFunded: totalFunded[0]?.total || 0,
    };
  },
};