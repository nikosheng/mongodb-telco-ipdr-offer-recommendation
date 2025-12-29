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

    // Use the latest summary embedding for recommendation
    const queryVector = user.latestAcvititySummaryEmbedding;

    if (!queryVector || queryVector.length === 0) {
        console.log("User has no activity embedding for vector search.");
        return [];
    }

    // 2. Search Logic
    // Try Atlas Vector Search first, fallback to JS calculation if it fails (e.g. local DB)
    try {
        const pipeline = [
            {
                $vectorSearch: {
                    index: "offer_embedding", // Requires an Atlas Vector Search Index named 'offer_embedding'
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
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ];

        // This will throw if $vectorSearch is not supported (e.g. local standalone)
        const offers = await Offer.aggregate(pipeline);
        
        // If successful and returned results
        if (offers.length > 0) {
            console.log(`Found ${offers.length} offers via Atlas Vector Search.`);
            return offers;
        }
        
        // If empty results, it might mean the index is syncing or empty, let's fall through to fallback
        console.log("Atlas Vector Search returned 0 results, attempting fallback...");
        throw new Error("No results from vector search");

    } catch (vectorError) {
        // 3. Fallback: In-Memory Cosine Similarity
        console.warn("Vector Search unavailable (using in-memory fallback):", vectorError.message);
        
        const allOffers = await Offer.find({});
        
        const scoredOffers = allOffers.map(offer => {
            // Calculate similarity if offer has embedding
            let score = 0;
            if (offer.descriptionEmbedding) {
                score = cosineSimilarity(queryVector, offer.descriptionEmbedding);
            }

            return { ...offer.toObject(), score };
        });

        // Sort by score descending and take top 10
        return scoredOffers
            .filter(o => o.score > 0.1) // Minimum relevance threshold
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }

  } catch (error) {
    console.error("Error in recommendation service:", error);
    throw error;
  }
};
