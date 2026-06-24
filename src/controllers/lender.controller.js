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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lender/dashboard
// Retrieves aggregate KPIs, new applications, and active pipeline for the
// authenticated lender.
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboard = async (req, res) => {
  try {
    const lenderId = req.user._id;
    const currentYear = new Date().getFullYear();

    // ── KPI 1: New leads = applications with status "Review" ────────────────
    const newLeadsCount = await LenderApplication.countDocuments({
      $or: [{ lenderId }, { lenderId: null }],
      status: 'REVIEW',
    });

    // ── KPI 2: Pre-approved = pipeline entries at "Pre-Approval" stage ───────
    const preApprovedCount = await LenderPipeline.countDocuments({
      lenderId,
      stage: 'PRE-APPROVAL',
    });

    // ── KPI 3: In underwriting = pipeline entries at "Underwriting" stage ────
    const inUnderwritingCount = await LenderPipeline.countDocuments({
      lenderId,
      stage: 'UNDERWRITING',
    });

    // ── KPI 4: Total funded YTD = sum of loanAmount for "Funded" entries ─────
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
    const totalFundedYtd = formatCurrency(totalFundedRaw);

    // ── New Applications (status = "Review") ─────────────────────────────────
    const newApplicationsDocs = await LenderApplication.find({
      $or: [{ lenderId }, { lenderId: null }],
      status: 'REVIEW',
    }).sort({ createdAt: -1 });

    const newApplications = newApplicationsDocs.map((app) => ({
      id: app._id.toString(),
      applicant_name: app.applicantName,
      state: app.state,
      loan_amount: app.loanAmount,
      down_payment: app.downPayment,
      credit_band: app.creditBand,
      status: app.status,
    }));

    // ── Active Pipeline (all non-Funded, non-Rejected stages) ────────────────
    const activePipelineDocs = await LenderPipeline.find({
      lenderId,
      stage: { $nin: ['FUNDED'] },
    }).sort({ createdAt: -1 });

    const activePipeline = activePipelineDocs.map((pipe) => ({
      id: pipe._id.toString(),
      applicant_name: pipe.applicantName,
      property_address: pipe.propertyAddress,
      loan_type: pipe.loanType,
      stage: pipe.stage,
      closing_date: pipe.closingDate,
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        lender_name: req.user.name,
        kpis: {
          new_leads: newLeadsCount,
          pre_approved: preApprovedCount,
          in_underwriting: inUnderwritingCount,
          total_funded_ytd: totalFundedYtd,
        },
        new_applications: newApplications,
        active_pipeline: activePipeline,
      },
    });
  } catch (error) {
    console.error('getDashboard error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lender/mortgages
// Retrieves all mortgage listings available in the marketplace.
// ─────────────────────────────────────────────────────────────────────────────
export const getMortgages = async (req, res) => {
  try {
    const mortgageDocs = await MortgageListing.find().sort({ postedDate: -1 });

    const listings = mortgageDocs.map((listing) => ({
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
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        listings,
      },
    });
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
