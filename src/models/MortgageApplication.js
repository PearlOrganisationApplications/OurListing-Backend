import mongoose from 'mongoose';

const mortgageApplicationSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MortgageListing',
      required: true,
    },

    lender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    requestedAmount: { 
      type: String, 
      required: true 
    }, 
    propertyAddress: { 
      type: String, 
      default: '' 
    }, 

    approvedAmount: { 
      type: String, 
      default: '0' 
    }, 
    interestRate: { 
      type: String, 
      default: '0' 
    }, 
    
    status: {
      type: String,
      enum: ['Approved', 'Under Review', 'Rejected', 'Expired', 'Accepted'],
      default: 'Under Review',
    },

    pipelineStatus: {
      type: String,
      enum: [
        'Offer Stage', 
        'Lead Created', 
        'Documents', 
        'Underwriting', 
        'Conditional Approval', 
        'Final Approval', 
        'Closing', 
        'Loan Funded', 
        'Completed'
      ],
      default: 'Offer Stage',
    },

    validUntil: { 
      type: Date 
    }, 
    submittedAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { timestamps: true } 
);

const MortgageApplication = mongoose.model('MortgageApplication', mortgageApplicationSchema);

export default MortgageApplication;