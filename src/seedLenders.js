import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import MortgageListing from './models/MortgageListing.js';
import LenderApplication from './models/LenderApplication.js';
import LenderPipeline from './models/LenderPipeline.js';

dotenv.config();

const seedLenders = async () => {
  try {
    await connectDB();

    console.log('--- Starting Lender Data Seeding ---');

    // 1. Ensure we have at least one Lender
    let lender = await User.findOne({ role: 'LENDER' });
    if (!lender) {
      console.log('No lender found. Creating a default lender...');
      lender = await User.create({
        name: 'Default Lender',
        email: 'lender@ourlisting.com',
        password: 'password123',
        number: '555-0199',
        address: '100 Finance Way',
        role: 'LENDER'
      });
      console.log(`Created Lender: ${lender.email}`);
    } else {
      console.log(`Using existing Lender: ${lender.email}`);
    }

    // Clear existing data to avoid duplicates on multiple runs
    await MortgageListing.deleteMany({});
    await LenderApplication.deleteMany({});
    await LenderPipeline.deleteMany({});
    console.log('Cleared existing lender data.');

    // 2. Create Mortgage Listings (Marketplace feed)
    console.log('Creating Mortgage Listings...');
    await MortgageListing.create([
      {
        propertyType: 'Single Family Home',
        propertyAddress: '123 Maple St, Austin, TX',
        purchasePrice: '$500,000',
        requestedLoan: '$400,000',
        ltvRatio: '80%',
        ficoScore: '740+',
        buyerIntent: 'Purchase'
      },
      {
        propertyType: 'Condo',
        propertyAddress: '456 Ocean Dr, Miami, FL',
        purchasePrice: '$350,000',
        requestedLoan: '$300,000',
        ltvRatio: '85%',
        ficoScore: '680-719',
        buyerIntent: 'Refinance'
      },
      {
        propertyType: 'Townhouse',
        propertyAddress: '789 Riverside Blvd, Chicago, IL',
        purchasePrice: '$450,000',
        requestedLoan: '$350,000',
        ltvRatio: '77%',
        ficoScore: '720-739',
        buyerIntent: 'Purchase'
      }
    ]);

    // 3. Create Lender Applications
    console.log('Creating Lender Applications...');
    await LenderApplication.create([
      {
        applicantName: 'John Doe',
        state: 'TX',
        loanAmount: '$400k',
        downPayment: '20%',
        creditBand: '740+',
        status: 'REVIEW',
        lenderId: lender._id // Assigned specifically to our lender
      },
      {
        applicantName: 'Jane Smith',
        state: 'FL',
        loanAmount: '$300k',
        downPayment: '15%',
        creditBand: '680-719',
        status: 'REVIEW',
        lenderId: null // Open to marketplace
      },
      {
        applicantName: 'Alice Johnson',
        state: 'IL',
        loanAmount: '$350k',
        downPayment: '23%',
        creditBand: '720-739',
        status: 'PRE-APPROVED',
        lenderId: lender._id
      }
    ]);

    // 4. Create Lender Pipeline Data
    console.log('Creating Lender Pipeline Data...');
    const currentYear = new Date().getFullYear();
    await LenderPipeline.create([
      {
        applicantName: 'Bob Williams',
        propertyAddress: '321 Oak Ave, Denver, CO',
        loanType: 'CONVENTIONAL',
        stage: 'PRE-APPROVAL',
        closingDate: 'Oct 15',
        loanAmount: 450000,
        lenderId: lender._id
      },
      {
        applicantName: 'Charlie Brown',
        propertyAddress: '654 Pine Rd, Seattle, WA',
        loanType: 'FHA',
        stage: 'UNDERWRITING',
        closingDate: 'Nov 01',
        loanAmount: 320000,
        lenderId: lender._id
      },
      {
        applicantName: 'Diana Prince',
        propertyAddress: '987 Cedar Ln, Boston, MA',
        loanType: 'JUMBO',
        stage: 'FUNDED',
        closingDate: 'Sep 20',
        loanAmount: 1200000,
        fundedYear: currentYear,
        lenderId: lender._id
      },
      {
        applicantName: 'Evan Wright',
        propertyAddress: '111 Elm St, Portland, OR',
        loanType: 'VA',
        stage: 'FUNDED',
        closingDate: 'Aug 05',
        loanAmount: 850000,
        fundedYear: currentYear,
        lenderId: lender._id
      }
    ]);

    console.log('--- Lender Data Seeding Complete! ---');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding lender data:', error);
    process.exit(1);
  }
};

seedLenders();
