const searchProperties = {
  name: "search_properties",
  description:
    "Search property listings using structured filters. Use for questions about " +
    "finding properties by location, price, type, bedrooms, etc.",
  parameters: {
    type: "OBJECT",
    properties: {
      location: { type: "STRING", description: "City, area, or location text (partial match)" },
      listingType: { type: "STRING", description: "SELL, RENT, or LEASE" },
      propertyType: { type: "STRING" },
      minPrice: { type: "NUMBER" },
      maxPrice: { type: "NUMBER" },
      bedroom: { type: "NUMBER" },
      bathroom: { type: "NUMBER" },
      balcony: { type: "NUMBER" },
      status: { type: "STRING", description: "ACTIVE, SOLD, INACTIVE, or DRAFT" },
      limit: { type: "NUMBER", description: "Max results, default 5" },
    },
  },
};

const getPropertyDetails = {
  name: "get_property_details",
  description:
    "Get full details of a single property by its title or ID, including photos, " +
    "documents, land area, and view count.",
  parameters: {
    type: "OBJECT",
    properties: {
      propertyId: { type: "STRING" },
      title: { type: "STRING", description: "Property title if ID isn't known (partial match)" },
    },
  },
};

const manageFavorites = {
  name: "manage_favorites",
  description:
    "List, add, or remove the current user's favorite/saved properties.",
  parameters: {
    type: "OBJECT",
    properties: {
      action: { type: "STRING", description: "list, add, or remove" },
      propertyId: { type: "STRING", description: "Required for add/remove" },
    },
    required: ["action"],
  },
};

const getPlans = {
  name: "get_plans",
  description: "List all available subscription plans and their features.",
  parameters: { type: "OBJECT", properties: {} },
};

const getMyPlan = {
  name: "get_my_plan",
  description: "Get the current logged-in user's active plan and price.",
  parameters: { type: "OBJECT", properties: {} },
};

const getBuyerMortgageStatus = {
  name: "get_buyer_mortgage_status",
  description:
    "Get the current buyer's mortgage listing/application status, approved amount, " +
    "interest rate, and pipeline stage.",
  parameters: { type: "OBJECT", properties: {} },
};

const getOwnerProperties = {
  name: "get_owner_properties",
  description:
    "Get properties listed by the current owner. Use for 'my properties' questions.",
  parameters: {
    type: "OBJECT",
    properties: {
      status: { type: "STRING", description: "ACTIVE, SOLD, INACTIVE, or DRAFT" },
      limit: { type: "NUMBER" },
    },
  },
};

const getPropertyViews = {
  name: "get_property_views",
  description:
    "Get view statistics (total and daily) for one of the owner's properties.",
  parameters: {
    type: "OBJECT",
    properties: {
      propertyId: { type: "STRING"},
    },
    required: ["propertyId"],
  },
};

const updatePropertyStatus = {
  name: "update_property_status",
  description: "Update the status of one of the owner's own properties.",
  parameters: {
    type: "OBJECT",
    properties: {
      propertyId: { type: "STRING" },
      status: { type: "STRING", description: "ACTIVE, SOLD, INACTIVE, or DRAFT" },
    },
    required: ["propertyId", "status"],
  },
};

const getBrokerProperties = {
  name: "get_broker_properties",
  description: "Get properties the current broker is assigned to.",                     
  parameters: {
    type: "OBJECT",
    properties: { status: { type: "STRING" }, limit: { type: "NUMBER" } },
  },
};

const getBrokerLeads = {
  name: "get_broker_leads",
  description:
    "Get the current broker's leads, optionally filtered by tag (HOT/WARM/COLD), " +
    "type (BUYER/OWNER), or interested property.",
  parameters: {
    type: "OBJECT",
    properties: {
      tag: { type: "STRING", description: "HOT, WARM, or COLD" },
      type: { type: "STRING", description: "BUYER or OWNER" },
      propertyId: { type: "STRING" },
      limit: { type: "NUMBER" },
    },
  },
};

const getBrokerCommissions = {
  name: "get_broker_commissions",
  description:
    "Get the current broker's commission records, optionally filtered by status " +
    "(Pending, Confirmed, Paid).",
  parameters: {
    type: "OBJECT",
    properties: {
      status: { type: "STRING", description: "Pending, Confirmed, or Paid" },
      limit: { type: "NUMBER" },
    },
  },
};

const getLenderApplications = {
  name: "get_lender_applications",
  description:
    "Get mortgage applications assigned to the current lender (or marketplace-wide " +
    "if unassigned), filterable by status, tag, city, or state.",
  parameters: {
    type: "OBJECT",
    properties: {
      status: { type: "STRING", description: "Review, Pre-Approved, Rejected, or Funded" },
      tag: { type: "STRING", description: "hot, warm, or cold" },
      state: { type: "STRING" },
      city: { type: "STRING" },
      minFico: { type: "NUMBER", description: "Minimum FICO score as a number, e.g. 740" },
      limit: { type: "NUMBER" },
    },
  },
};

const getLenderPipeline = {
  name: "get_lender_pipeline",
  description:
    "Get the current lender's active loan pipeline, filterable by stage, " +
    "pipeline status, loan type, or closing date range.",
  parameters: {
    type: "OBJECT",
    properties: {
      stage: { type: "STRING" },
      pipelineStatus: { type: "STRING", description: "Active, Approved, or Draft" },
      loanType: { type: "STRING" },
      limit: { type: "NUMBER" },
    },
  },
};

const getMortgageListings = {
  name: "get_mortgage_listings",
  description:
    "Get mortgage listings (buyer-side loan requests tied to specific properties), " +
    "filterable by property or buyer intent.",
  parameters: {
    type: "OBJECT",
    properties: {
      propertyId: { type: "STRING" },
      limit: { type: "NUMBER" },
    },
  },
};

const getMortgageApplications = {
  name: "get_mortgage_applications",
  description:
    "Get mortgage applications submitted against mortgage listings, filterable by status.",
  parameters: {
    type: "OBJECT",
    properties: {
      status: { type: "STRING", description: "Approved, Under Review, Rejected, Expired, Accepted" },
      limit: { type: "NUMBER" },
    },
  },
};

const getPlatformStats = {
  name: "get_platform_stats",
  description:
    "Get platform-wide aggregate stats: user counts by role, property counts by " +
    "status, plan popularity, total commissions, total loans funded.",
  parameters: { type: "OBJECT", properties: {} },
};

const commonTools = [searchProperties, getPropertyDetails, getPlans];

const toolsByRole = {
  buyer: [...commonTools, manageFavorites, getMyPlan, getBuyerMortgageStatus],
  OWNER: [...commonTools, getOwnerProperties, getPropertyViews, updatePropertyStatus],
  BROKER: [...commonTools, getBrokerProperties, getBrokerLeads, getBrokerCommissions],
  LENDER: [
    ...commonTools,
    getLenderApplications,
    getLenderPipeline,
    getMortgageListings,
    getMortgageApplications,
  ],
  ADMIN: [...commonTools, getPlatformStats],
};

export function getToolsForRole(role) {
  const declarations = toolsByRole[role] || commonTools;
  return [{ functionDeclarations: declarations }];
}