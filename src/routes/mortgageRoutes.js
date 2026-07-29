import express from 'express';
const router = express.Router();
import { 
    createMortgageRequest, getAllListings, sendLoanOffer, 
    getMyOffers, acceptOffer, updatePipelineStatus , getBuyerLoanHistory 
} from '../controllers/mortgageController.js';
import { protect } from '../middlewares/auth.middleware.js';

router.post('/request', createMortgageRequest);         
router.get('/listings', getAllListings);               
router.post('/send-offer', sendLoanOffer);             
router.get('/my-offers/:listingId', getMyOffers);      
router.post('/accept', acceptOffer);                   
router.patch('/pipeline/:appId', updatePipelineStatus);
router.get("/properties-of-loan/:buyerId",  getBuyerLoanHistory )

export default router;