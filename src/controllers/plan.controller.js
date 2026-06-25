import Plan from '../models/Plan.js';
// GET /api/plans – public endpoint that returns all enabled subscription plans
export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ enabled: true }).select('-__v');

    const formattedPlans = plans.map((plan) => ({
      id: plan._id.toString(),
      planName: plan.planName,
      amount: plan.amount,
      photo: plan.photo || '',
      description: plan.description || '',
      features: plan.features || [],
      enabled: plan.enabled,
    }));

    return res.status(200).json({ status: 'success', data: formattedPlans });
  } catch (error) {
    console.error('getPlans error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};