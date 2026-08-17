import MortgageListing from '../models/MortgageListing.js';
import MortgageApplication from '../models/MortgageApplication.js';
import User from '../models/User.js'; 
import mongoose from 'mongoose';

export const createMortgageRequest = async (req, res) => {
    try {
        const { propertyType, purchasePrice, requestedLoan } = req.body;

        if (!propertyType || !purchasePrice || !requestedLoan) {
            return res.status(400).json({ success: false, message: "Required fields are missing." });
        }

        const listing = await MortgageListing.create(req.body);

        res.status(201).json({ 
            success: true, 
            message: "Request created successfully", 
            listingId: listing._id 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error", error: err.message });
    }
};

export const getAllListings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await MortgageListing.countDocuments();
        const listings = await MortgageListing.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            pagination: { total, page, pages: Math.ceil(total / limit) },
            data: listings
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


export const sendLoanOffer = async (req, res) => {
    try {
        const { listingId, lenderId, approvedAmount, interestRate, status } = req.body;

        const lenderUser = await User.findById(lenderId);
        if (!lenderUser || lenderUser.role !== 'LENDER') {
            return res.status(403).json({ success: false, message: "Only registered Lenders can send offers." });
        }

        const offer = await MortgageApplication.findOneAndUpdate(
            { listingId, lender: lenderId },
            { 
                approvedAmount, 
                interestRate, 
                status: status || 'Approved', 
                validUntil: new Date('2026-10-10') 
            },
            { new: true, upsert: true }
        );

        res.status(201).json({ success: true, message: "Offer processed", data: offer });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


export const getMyOffers = async (req, res) => {
    try {
        const { listingId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(listingId)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        const apps = await MortgageApplication.find({ listingId })
            .populate('lender', 'name email number') 
            .sort({ createdAt: -1 });

        const approved = apps.filter(a => a.status === 'Approved');
        const bestOffer = approved.length > 0 
            ? approved.reduce((prev, curr) => (parseFloat(prev.interestRate) < parseFloat(curr.interestRate) ? prev : curr))
            : null;

        res.status(200).json({ 
            success: true, 
            bestApprovedOffer: bestOffer, 
            allApplications: apps 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const acceptOffer =  async (req, res) => {
    try {
        const { appId } = req.body;

        const acceptedApp = await MortgageApplication.findByIdAndUpdate(
            appId,
            { 
                status: 'Accepted', 
                pipelineStatus: 'Lead Created' 
            },
            { new: true } 
        );

        if (!acceptedApp) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        await MortgageApplication.updateMany(
            { listingId: acceptedApp.listingId, _id: { $ne: appId } },
            { status: 'Expired' }
        );

        res.json({ success: true, message: "Offer accepted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const updatePipelineStatus = async (req, res) => {
    try {
        const { pipelineStatus } = req.body;
        const updated = await MortgageApplication.findByIdAndUpdate(
            req.params.appId, 
            { pipelineStatus }, 
            { new: true }
        );
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const getBuyerLoanHistory = async (req, res) => {
    try {
        const { buyerId } = req.params;

      
        const myRequests = await MortgageListing.find({ buyer: buyerId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: myRequests.length,
            data: myRequests
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const getLenderOffers = async (req, res) => {
    try {
        const { lenderId } = req.params;

        const offers = await MortgageApplication.find({ lender: lenderId })
            .populate({
                path: 'listingId',
                select: 'propertyType location loanAmount' 
            })
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            count: offers.length,
            data: offers
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


export const getActiveLoanPipeline = async (req, res) => {
    try {
        const { listingId } = req.params;
        const activeLoan = await MortgageApplication.findOne({ 
            listingId, 
            status: 'Accepted' 
        })
        .populate('lender', 'name email number')
        .populate('listingId');

        if (!activeLoan) {
            return res.status(404).json({ 
                success: false, 
                message: "No accepted offer found for this listing." 
            });
        }

        res.status(200).json({
            success: true,
            data: activeLoan
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};