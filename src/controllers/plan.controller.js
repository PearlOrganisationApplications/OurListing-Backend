import Plan from '../models/Plan.js';

// GET /api/plans – public endpoint that returns all enabled subscription plans
export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ enabled: true }).select('-_id -__v'); // hide internal fields
    return res.status(200).json({ status: 'success', data: plans });
  } catch (error) {
    console.error('getPlans error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
