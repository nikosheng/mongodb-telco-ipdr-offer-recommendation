import OfferPushLog from '../models/OfferPushLog.js';
import Offer from '../models/Offer.js';

// @desc    Log a new offer push
// @route   POST /api/push-logs
// @access  Public
export const logOfferPush = async (req, res) => {
  try {
    const { offerId, userId, msisdn } = req.body;

    // Optional: Fetch offer name if not provided but useful for redundancy
    let offerName = req.body.offerName;
    if (!offerName && offerId) {
      const offer = await Offer.findById(offerId);
      if (offer) offerName = offer.name;
    }

    const pushLog = new OfferPushLog({
      offerId,
      offerName,
      userId,
      msisdn,
      pushedAt: new Date(),
      status: 'pushed'
    });

    const savedLog = await pushLog.save();
    res.status(201).json(savedLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update offer push status (click/purchase)
// @route   PUT /api/push-logs/:id
// @access  Public
export const updatePushStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'clicked' or 'purchased'
    const { id } = req.params;

    if (!['clicked', 'purchased'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const log = await OfferPushLog.findById(id);

    if (!log) {
      return res.status(404).json({ message: 'Push log not found' });
    }

    log.status = status;
    log.actionTimestamp = new Date();
    
    const updatedLog = await log.save();
    res.json(updatedLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily summary of offer pushes
// @route   GET /api/push-logs/summary
// @access  Public
export const getDailySummary = async (req, res) => {
  try {
    const { date } = req.query; // Expecting YYYY-MM-DD
    
    let targetDateStart = new Date();
    if (date) {
      targetDateStart = new Date(date);
    }
    targetDateStart.setHours(0, 0, 0, 0);

    const targetDateEnd = new Date(targetDateStart);
    targetDateEnd.setHours(23, 59, 59, 999);

    const summary = await OfferPushLog.aggregate([
      {
        $match: {
          pushedAt: { $gte: targetDateStart, $lte: targetDateEnd }
        }
      },
      {
        $group: {
          _id: "$offerName", // Group by offer Name
          totalPushed: { $sum: 1 },
          clicked: { 
            $sum: { 
              $cond: [{ $or: [{ $eq: ["$status", "clicked"] }, { $eq: ["$status", "purchased"] }] }, 1, 0] 
            } 
          },
          purchased: { 
            $sum: { 
              $cond: [{ $eq: ["$status", "purchased"] }, 1, 0] 
            } 
          }
        }
      },
      {
        $project: {
          offerName: "$_id",
          totalPushed: 1,
          clicked: 1,
          purchased: 1,
          clickRate: { 
            $cond: [ { $eq: [ "$totalPushed", 0 ] }, 0, { $multiply: [ { $divide: [ "$clicked", "$totalPushed" ] }, 100 ] } ]
          },
          purchaseRate: { 
            $cond: [ { $eq: [ "$totalPushed", 0 ] }, 0, { $multiply: [ { $divide: [ "$purchased", "$totalPushed" ] }, 100 ] } ]
          }
        }
      },
      { $sort: { totalPushed: -1 } }
    ]);

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
