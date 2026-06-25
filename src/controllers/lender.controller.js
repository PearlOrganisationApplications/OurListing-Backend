import LenderApplication from '../models/LenderApplication.js';
import LenderPipeline from '../models/LenderPipeline.js';
import MortgageListing from '../models/MortgageListing.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format a raw numeric loan amount into a human-readable dollar string
// e.g. 1200000 → "$1.2M" | 450000 → "$450K"
// ─────────────────────────────────────────────────────────────────────────────
const formatCurrency = (amount) => {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${parseFloat(millions.toFixed(1))}M`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `$${parseFloat(thousands.toFixed(0))}K`;
  }
  return `$${amount}`;
};

// Format a dollar amount as comma-separated e.g. 350000 → "$350,000"
const formatDollar = (amount) => {
  if (!amount) return '$0';
  return `$${Number(amount).toLocaleString('en-US')}`;
};

// Format a Date to YYYY-MM-DD
const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lender/dashboard
// Full dashboard: KPIs + hot leads + pending approvals + active pipeline
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboard = async (req, res) => {
  try {
    const lenderId = req.user._id;
    const currentYear = new Date().getFullYear();

    // ── KPI 1: Active Leads = all non-Rejected, non-Funded applications ──────
    const activeLeadsCount = await LenderApplication.countDocuments({
      $or: [{ lenderId }, { lenderId: null }],
      status: 'REVIEW',
    });

    // ── KPI 2: Pre-approved = pipeline entries at "Pre-Approval" stage ───────
    const preApprovedCount = await LenderPipeline.countDocuments({
      lenderId,
      stage: 'PRE-APPROVAL',
    });

    // ── KPI 3: Pending Approvals = pipeline at Pre-Approval or Underwriting ──
    const pendingApprCount = await LenderPipeline.countDocuments({
      lenderId,
      stage: 'UNDERWRITING',
    });

    // ── KPI 4: Deals Closed (YTD funded total) ───────────────────────────────
    const fundedAggResult = await LenderPipeline.aggregate([
      {
        $match: {
          lenderId,
          stage: 'FUNDED',
          fundedYear: currentYear,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$loanAmount' },
        },
      },
    ]);
    const totalFundedRaw = fundedAggResult.length > 0 ? fundedAggResult[0].total : 0;
    const dealsClosed = formatCurrency(totalFundedRaw);

    // ── Hot Leads (tag = "hot") ───────────────────────────────────────────────
    const hotLeadsDocs = await LenderApplication.find({
      $or: [{ lenderId }, { lenderId: null }],
      status: 'REVIEW',
    }).sort({ createdAt: -1 });

    const hotLeads = hotLeadsDocs.map((app) => ({
      id: app._id.toString(),
      applicant_name: app.applicantName,
      city: app.city,
      state: app.state,
      loan_amount: formatDollar(app.loanAmount),
      loan_amount_raw: app.loanAmount,
      down_payment: app.downPayment,
      credit_band: app.creditBand,
      fico_score: app.ficoScore,
      property_image: app.propertyImage,
      tag: app.tag,
      status: app.status,
    }));

    // ── Pending Approvals (pipeline at Underwriting stage) ───────────────────
    const pendingApprovalsDocs = await LenderPipeline.find({
      lenderId,
      stage: 'Underwriting',
    }).sort({ createdAt: -1 });

    const pendingApprovals = pendingApprovalsDocs.map((pipe) => ({
      id: pipe._id.toString(),
      applicant_name: pipe.applicantName,
      property_address: pipe.propertyAddress,
      property_image: pipe.propertyImage,
      loan_type: pipe.loanType,
      stage: pipe.stage,
      pipeline_status: pipe.pipelineStatus,
      closing_date: formatDate(pipe.closingDate),
    }));

    // ── Active Pipeline (all non-Funded) ─────────────────────────────────────
    const activePipelineDocs = await LenderPipeline.find({
      lenderId,
      stage: { $nin: ['FUNDED'] },
    }).sort({ createdAt: -1 });

    const activePipeline = activePipelineDocs.map((pipe) => ({
      id: pipe._id.toString(),
      applicant_name: pipe.applicantName,
      property_address: pipe.propertyAddress,
      property_image: pipe.propertyImage,
      loan_type: pipe.loanType,
      stage: pipe.stage,
      pipeline_status: pipe.pipelineStatus,
      closing_date: formatDate(pipe.closingDate),
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        lender_name: req.user.name,
        nmls_verified: true,
        kpis: {
          active_leads: activeLeadsCount,
          total_apps: totalAppsCount,
          pending_approvals: pendingApprCount,
          deals_closed: dealsClosed,
        },
        hot_leads: hotLeads,
        pending_approvals: pendingApprovals,
        active_pipeline: activePipeline,
      },
    });
  } catch (error) {
    console.error('getDashboard error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lender/hot-leads
// Returns only hot-tagged applications
// ─────────────────────────────────────────────────────────────────────────────
export const getHotLeads = async (req, res) => {
  try {
    const lenderId = req.user._id;

    const docs = await LenderApplication.find({
      $or: [{ lenderId }, { lenderId: null }],
      tag: 'hot',
    }).sort({ createdAt: -1 });

    const hotLeads = docs.map((app) => ({
      id: app._id.toString(),
      applicant_name: app.applicantName,
      city: app.city,
      state: app.state,
      loan_amount: formatDollar(app.loanAmount),
      loan_amount_raw: app.loanAmount,
      down_payment: app.downPayment,
      credit_band: app.creditBand,
      fico_score: app.ficoScore,
      property_image: app.propertyImage,
      tag: app.tag,
      status: app.status,
    }));

    return res.status(200).json({ status: 'success', data: { hot_leads: hotLeads } });
  } catch (error) {
    console.error('getHotLeads error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lender/pending-approvals
// Returns pipeline entries at Underwriting or Pre-Approval stage
// ─────────────────────────────────────────────────────────────────────────────
export const getPendingApprovals = async (req, res) => {
  try {
    const lenderId = req.user._id;

    const docs = await LenderPipeline.find({
      lenderId,
      stage: { $in: ['Pre-Approval', 'Underwriting'] },
    }).sort({ createdAt: -1 });

    const pendingApprovals = docs.map((pipe) => ({
      id: pipe._id.toString(),
      applicant_name: pipe.applicantName,
      property_address: pipe.propertyAddress,
      property_image: pipe.propertyImage,
      loan_type: pipe.loanType,
      stage: pipe.stage,
      pipeline_status: pipe.pipelineStatus,
      closing_date: formatDate(pipe.closingDate),
    }));

    return res.status(200).json({ status: 'success', data: { pending_approvals: pendingApprovals } });
  } catch (error) {
    console.error('getPendingApprovals error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lender/pipeline?status=Active|Approved|Draft
// Returns active pipeline with optional pipelineStatus filter
// ─────────────────────────────────────────────────────────────────────────────
export const getPipeline = async (req, res) => {
  try {
    const lenderId = req.user._id;
    const { status } = req.query; // Active | Approved | Draft

    const query = { lenderId, stage: { $nin: ['Funded'] } };
    if (status && ['Active', 'Approved', 'Draft'].includes(status)) {
      query.pipelineStatus = status;
    }

    const docs = await LenderPipeline.find(query).sort({ createdAt: -1 });

    const pipeline = docs.map((pipe) => ({
      id: pipe._id.toString(),
      applicant_name: pipe.applicantName,
      property_address: pipe.propertyAddress,
      property_image: pipe.propertyImage,
      loan_type: pipe.loanType,
      stage: pipe.stage,
      pipeline_status: pipe.pipelineStatus,
      closing_date: formatDate(pipe.closingDate),
    }));

    return res.status(200).json({ status: 'success', data: { pipeline } });
  } catch (error) {
    console.error('getPipeline error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lender/mortgages
// Retrieves all mortgage listings (Recommended For You / Market)
// ─────────────────────────────────────────────────────────────────────────────
export const getMortgages = async (req, res) => {
  try {
    const mortgageDocs = await MortgageListing.find().sort({ postedDate: -1 });

    const listings = mortgageDocs.map((listing) => ({
      id: listing._id.toString(),
      property_type: listing.propertyType,
      property_address: listing.propertyAddress,
      property_image: listing.propertyImage,
      buyer_name: listing.buyerName,
      purchase_price: listing.purchasePrice,
      requested_loan: listing.requestedLoan,
      ltv_ratio: listing.ltvRatio,
      fico_score: listing.ficoScore,
      buyer_intent: listing.buyerIntent,
      posted_date: listing.postedDate ? listing.postedDate.toISOString().split('T')[0] : null,
    }));

    return res.status(200).json({ status: 'success', data: { listings } });
  } catch (error) {
    console.error('getMortgages error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lender/mortgages/:id
// Retrieves a single mortgage listing by its ID.
// ─────────────────────────────────────────────────────────────────────────────
export const getMortgageById = async (req, res) => {
  try {
    const listing = await MortgageListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ status: 'error', message: 'Mortgage listing not found' });
    }

    const formattedListing = {
      id: listing._id.toString(),
      property_type: listing.propertyType,
      property_address: listing.propertyAddress,
      purchase_price: listing.purchasePrice,
      requested_loan: listing.requestedLoan,
      ltv_ratio: listing.ltvRatio,
      fico_score: listing.ficoScore,
      buyer_intent: listing.buyerIntent,
      posted_date: listing.postedDate
        ? listing.postedDate.toISOString().split('T')[0]
        : null,
    };

    return res.status(200).json({
      status: 'success',
      data: {
        listing: formattedListing,
      },
    });
  } catch (error) {
    console.error('getMortgageById error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
