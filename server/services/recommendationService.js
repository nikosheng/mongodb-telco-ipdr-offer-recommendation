import Offer from '../models/Offer.js';
import User from '../models/User.js';

// Helper for fallback in-memory cosine similarity
const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return magA && magB ? dotProduct / (magA * magB) : 0;
};

export const recommendOffers = async (userId) => {
  try {
    // 1. Get User Profile
    const user = await User.findOne({ msisdn: userId });
    if (!user) {
        console.log("User not found.");
        return [];
    }

    // 2. Usage-Based Recommendation Logic
    // Check if user has high roaming usage (> 50%)
    const highUsagePlans = [];
    if (user.roaming_plan_usage && user.roaming_plan_usage.length > 0) {
        // Fetch full offer details for the plans the user has to get their limits
        const userPlanNames = user.roaming_plan_usage.map(p => p.planName);
        const planDetails = await Offer.find({ name: { $in: userPlanNames } });

        user.roaming_plan_usage.forEach(usage => {
            const offerDetail = planDetails.find(o => o.name === usage.planName);
            if (offerDetail && offerDetail.limitGB) {
                const limitMB = offerDetail.limitGB * 1024;
                const percentage = (usage.totalUsageMB / limitMB) * 100;
                
                if (percentage >= 50) {
                    highUsagePlans.push({
                        planName: usage.planName,
                        percentage: percentage.toFixed(1),
                        offerId: offerDetail._id
                    });
                }
            }
        });
    }

    // If high usage found, prioritize repurchasing/upselling those plans
    let recommendedOffers = [];
    
    if (highUsagePlans.length > 0) {
        console.log(`User has high usage on plans: ${highUsagePlans.map(p => p.planName).join(', ')}`);
        // Recommend the same plans for repurchase
        // We could also look for "bigger" versions, but for now let's recommend the same one (top-up logic)
        const repurchaseOffers = await Offer.find({ name: { $in: highUsagePlans.map(p => p.planName) } });
        
        repurchaseOffers.forEach(offer => {
            const usageInfo = highUsagePlans.find(p => p.planName === offer.name);
            recommendedOffers.push({
                ...offer.toObject(),
                score: 0.95, // Prioritized top-up recommendation
                recommendationReason: `You have used ${usageInfo.percentage}% of your ${offer.name}. We recommend topping up or repurchasing to stay connected.`
            });
        });
    }

    // 3. New Country/Region Detection (Roaming without Plan)
    // Check if user is in a location that doesn't match their active plans
    if (user.currentLocation) {
        // Use the newly added country field, or fallback to coordinate-based detection
        let detectedCountry = user.currentLocation.country;
        
        if (!detectedCountry && user.currentLocation.coordinates) {
            // Fallback logic for older users/data
            const summary = user.latestActivitySummary || "";
            if (summary.includes("Japan") || (user.currentLocation.coordinates[0] > 130 && user.currentLocation.coordinates[0] < 145)) detectedCountry = "Japan";
            else if (summary.includes("Europe") || summary.includes("France") || summary.includes("Germany")) detectedCountry = "Europe";
            else if (summary.includes("USA") || summary.includes("United States")) detectedCountry = "USA";
        }

        if (detectedCountry) {
            // Check if user has a plan for this country
            const hasPlan = user.roaming_plan_usage && user.roaming_plan_usage.some(p => p.planName.includes(detectedCountry));
            
            if (!hasPlan) {
                console.log(`User detected in ${detectedCountry} without active plan.`);
                
                // Find offers for this country
                const countryOffers = await Offer.find({ 
                    $or: [
                        { name: { $regex: detectedCountry, $options: 'i' } },
                        { description: { $regex: detectedCountry, $options: 'i' } }
                    ]
                });

                countryOffers.forEach(offer => {
                    recommendedOffers.push({
                        ...offer.toObject(),
                        score: 0.99, // Critical location-based recommendation
                        recommendationReason: `We detected you are currently in ${detectedCountry} but do not have an active roaming plan. Stay connected with this offer.`
                    });
                });
            }
        }
    }

    // 4. Similarity Search Logic (Vector Search)
    const queryVector = user.latestActivitySummaryEmbedding;
    let vectorOffers = [];

    if (queryVector && queryVector.length > 0) {
        try {
            const pipeline = [
                {
                    $vectorSearch: {
                        index: "offer_embedding",
                        path: "descriptionEmbedding",
                        queryVector: queryVector,
                        numCandidates: 10,
                        limit: 3
                    }
                },
                {
                    $project: {
                        name: 1,
                        description: 1,
                        tags: 1,
                        limitGB: 1,
                        score: { $meta: "vectorSearchScore" }
                    }
                }
            ];

            vectorOffers = await Offer.aggregate(pipeline);
        } catch (vectorError) {
            console.warn("Vector Search unavailable, using fallback.");
            // Fallback logic... (simplified for brevity, keeping existing structure)
             const allOffers = await Offer.find({});
             vectorOffers = allOffers.map(offer => {
                let score = 0;
                if (offer.descriptionEmbedding) {
                    score = cosineSimilarity(queryVector, offer.descriptionEmbedding);
                }
                return { ...offer.toObject(), score };
            }).sort((a, b) => b.score - a.score).slice(0, 5);
        }
    }

    // Merge Results: Usage-based recommendations first, then vector search results
    // Filter out duplicates
    const existingIds = new Set(recommendedOffers.map(o => o._id.toString()));
    
    vectorOffers.forEach(vo => {
        if (!existingIds.has(vo._id.toString())) {
            recommendedOffers.push({
                ...vo,
                // If not already scored by high usage logic
                recommendationReason: vo.recommendationReason || "Recommended based on your activity profile."
            });
        }
    });

    // Sort by score descending to ensure highest priority offers are first
    recommendedOffers.sort((a, b) => (b.score || 0) - (a.score || 0));

    return recommendedOffers;

  } catch (error) {
    console.error("Error in recommendation service:", error);
    throw error;
  }
};

export const findSimilarUsers = async (userId) => {
  try {
    // 1. Get Target User Profile
    const user = await User.findOne({ msisdn: userId });
    if (!user) {
        console.log("User not found.");
        return [];
    }

    const queryVector = user.latestActivitySummaryEmbedding;

    if (!queryVector || queryVector.length === 0) {
        console.log("User has no activity embedding for similar user search.");
        return [];
    }

    // 2. Search Logic
    try {
        const pipeline = [
            {
                $vectorSearch: {
                    index: "user_summary_embedding", // Confirmed Atlas Vector Search Index name
                    path: "latestActivitySummaryEmbedding",
                    queryVector: queryVector,
                    numCandidates: 20,
                    limit: 6 // Fetch 6 because the user themselves will likely be the top result; need buffer to get 3 after self-filter
                }
            },
            {
                $project: {
                    msisdn: 1,
                    name: 1,
                    latestActivitySummary: 1,
                    tags: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ];

        let similarUsers = await User.aggregate(pipeline);
        
        // Filter out the search user themselves and calculate shared tags
        const searchUserTags = user.tags || [];
        similarUsers = similarUsers
            .filter(u => u.msisdn !== userId)
            .map(u => ({
                ...u,
                 sharedTags: (u.tags || []).filter(tag => searchUserTags.includes(tag))
             }))
             .slice(0, 3);

        if (similarUsers.length > 0) {
            console.log(`Found ${similarUsers.length} similar users via Atlas Vector Search.`);
            return similarUsers;
        }
        
        console.log("Atlas Vector Search returned 0 similar users, attempting fallback...");
        throw new Error("No results from vector search");

    } catch (vectorError) {
        console.warn("Vector Search unavailable for users (using in-memory fallback):", vectorError.message);
        
        const allUsers = await User.find({ msisdn: { $ne: userId } });
        const searchUserTags = user.tags || [];
        
        const scoredUsers = allUsers.map(u => {
            let score = 0;
            if (u.latestActivitySummaryEmbedding && u.latestActivitySummaryEmbedding.length > 0) {
                score = cosineSimilarity(queryVector, u.latestActivitySummaryEmbedding);
            }

            return { 
                msisdn: u.msisdn,
                name: u.name,
                latestActivitySummary: u.latestActivitySummary,
                tags: u.tags,
                sharedTags: (u.tags || []).filter(tag => searchUserTags.includes(tag)),
                score 
            };
        });

        return scoredUsers
            .filter(u => u.score > 0.1)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }

  } catch (error) {
    console.error("Error in findSimilarUsers:", error);
    throw error;
  }
};
