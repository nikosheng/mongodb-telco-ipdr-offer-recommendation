import Ipdr from '../models/Ipdr.js';
import User from '../models/User.js';
import { AzureOpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2023-05-15',
});

/**
 * Summarizes the user's activities and generates an embedding vector.
 */
const generateUserSummaryAndEmbedding = async (historyText) => {
  try {
    if (!process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY === 'your_api_key_here') {
      console.warn('Azure OpenAI API Key not set, using mock summary and embedding');
      return {
        summary: `Mock summary of activities: ${historyText.substring(0, 100)}...`,
        embedding: Array.from({ length: 1536 }, () => Math.random()),
        tags: ['Mock Location', 'Mock Service', 'example.com']
      };
    }

    // 1. Generate Summary and Tags using Chat Completion
    const summaryResponse = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_NAME || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that analyzes telecommunications activity logs (IPDR). Output your response in a valid JSON object with exactly two keys: "summary" (a string containing a short paragraph summarizing the user\'s behavior and interests) and "tags" (an array of strings). The tags must cover: 1. The locations mentioned. 2. The service types used. 3. The top 3 visited URL domain hostnames (e.g., "netflix.com", "youtube.com").' },
        { role: 'user', content: `Analyze these activities: ${historyText}` }
      ],
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const content = summaryResponse.choices[0].message.content.trim();
    let parsedContent;
    try {
        parsedContent = JSON.parse(content);
    } catch (e) {
        console.error("Failed to parse JSON from LLM:", content);
        // Fallback if JSON parsing fails
        parsedContent = { 
            summary: content, 
            tags: [] 
        };
    }

    const { summary, tags } = parsedContent;

    // 2. Generate Embedding for the Summary
    const embeddingResponse = await client.embeddings.create({
      input: summary,
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'text-embedding-3-small',
    });

    return {
      summary,
      embedding: embeddingResponse.data[0].embedding,
      tags: tags || []
    };
  } catch (error) {
    console.error('Error generating summary or embedding:', error);
    return {
      summary: 'Error generating summary',
      embedding: Array.from({ length: 1536 }, () => Math.random()),
      tags: []
    };
  }
};

export const processIpdr = async (data) => {
  // This function is for processing individual IPDR logs during ingestion
  // Mock Geo-location from IP
  const location = {
    country: 'Hong Kong',
    city: 'Hong Kong',
    district: 'Central',
    coordinates: {
      type: 'Point',
      coordinates: [114.1694 + (Math.random() - 0.5) * 0.1, 22.3193 + (Math.random() - 0.5) * 0.1]
    }
  };

  return {
    ...data,
    location
  };
};

export const updateUserProfile = async (msisdn, options = { forceUpdate: false }) => {
  try {
    const now = new Date();
    // Check if it's midnight (12am UTC)
    const isMidnight = now.getUTCHours() === 0;
    const shouldUpdateSummary = options.forceUpdate || isMidnight;

    // 1. Find last 24 IPDRs for this user
    const lastActivities = await Ipdr.find({ msisdn })
      .sort({ timestamp: -1 })
      .limit(24)
      .select('url serviceType duration location timestamp');

    if (lastActivities.length === 0) return;

    let updateFields = {
      topIpdrHistory: lastActivities.slice(0, 10).map(log => log._id)
    };

    if (shouldUpdateSummary) {
      console.log(`Triggering summary and embedding update for ${msisdn} (forceUpdate: ${options.forceUpdate}, isMidnight: ${isMidnight})`);
      
      // 2. Aggregate text for Summarization
      const historyText = lastActivities
        .map(log => `[${log.timestamp.toISOString()}] ${log.serviceType} at ${log.location.city} via ${log.url} for ${log.duration}s`)
        .join('; ');

      // 3. Generate Summary and Embedding
      const { summary, embedding, tags } = await generateUserSummaryAndEmbedding(historyText);
      
      updateFields.latestAcvititySummary = summary;
      updateFields.latestAcvititySummaryEmbedding = embedding;
      updateFields.lastSummaryUpdate = now;
      if (tags && tags.length > 0) {
        updateFields.tags = tags;
      }
    }

    // 4. Update User with attributes
    await User.findOneAndUpdate(
      { msisdn },
      { $set: updateFields },
      { upsert: true, new: true }
    );
    
    if (shouldUpdateSummary) {
      console.log(`User profile updated for ${msisdn} with summary and embedding.`);
    } else {
      console.log(`User profile updated for ${msisdn} (top history only, summary skipped).`);
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
  }
};
