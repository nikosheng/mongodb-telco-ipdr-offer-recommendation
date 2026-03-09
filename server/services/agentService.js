import { tool } from "@langchain/core/tools";
import { SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { AzureChatOpenAI } from "@langchain/openai";
import "@langchain/langgraph/zod";
import { MessagesZodState, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import mongoose from "mongoose";
import User from "../models/User.js";
import Offer from "../models/Offer.js";
import AuditLog from "../models/AuditLog.js";
import Ipdr from "../models/Ipdr.js";
import { recommendOffers } from "./recommendationService.js";
import dotenv from "dotenv";

dotenv.config();

// Ensure MongoDB is connected
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected for Agent Service"))
    .catch(err => console.error("MongoDB connection error in Agent Service:", err));
}

// 1. Define Tools (acting as the agents requested)

const userTool = tool(
  async ({ msisdn }) => {
    try {
      const user = await User.findOne({ msisdn });
      if (!user) return "User not found.";
      return JSON.stringify(user);
    } catch (error) {
      return `Error fetching user: ${error.message}`;
    }
  },
  {
    name: "user_agent",
    description: "Get detailed user information (including profile, history, usage) by msisdn. Use the 'msisdn' obtained from 'find_high_usage_users_in_region' or other tools.",
    schema: z.object({
      msisdn: z.string().describe("The user's MSISDN (ID)"),
    }),
  }
);

const offerTool = tool(
  async ({ query }) => {
    try {
      let offers;
      if (query) {
        // Simple regex search by name or description
        offers = await Offer.find({
          $or: [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
          ],
        }).limit(5);
      } else {
        offers = await Offer.find({}).limit(5);
      }
      if (!offers || offers.length === 0) return "No offers found.";
      return JSON.stringify(offers);
    } catch (error) {
      return `Error fetching offers: ${error.message}`;
    }
  },
  {
    name: "offer_agent",
    description: "Get offer information from the offers collection. Can search by name/description or list available offers.",
    schema: z.object({
      query: z.string().optional().describe("Search query for offer name or description"),
    }),
  }
);

const recommendTool = tool(
  async ({ msisdn }) => {
    try {
      const user = await User.findOne({ msisdn });
      if (!user) return "User not found.";

      const recommendations = await recommendOffers(msisdn);
      if (!recommendations || recommendations.length === 0) {
        return "No suitable offers found for this user.";
      }

      // Return top 2 recommendations
      const topRecommendations = recommendations.slice(0, 2);
      
      const results = topRecommendations.map(offer => {
          let reason = offer.recommendationReason;
          
          if (!reason) {
              // Default reason if not provided by the service
              reason = "This offer is recommended based on your recent activity patterns.";
              
              if (user.tags && user.tags.length > 0 && offer.tags) {
                const matchingTags = user.tags.filter(tag => 
                  offer.tags.some(ot => ot.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(ot.toLowerCase()))
                );
                if (matchingTags.length > 0) {
                  reason = `This offer aligns with your interests in ${matchingTags.slice(0, 3).join(", ")}.`;
                } else if (user.latestActivitySummary) {
                  reason = `Based on your recent activity: "${user.latestActivitySummary.substring(0, 100)}...", this offer is the best match.`;
                }
              } else if (user.latestActivitySummary) {
                reason = `Based on your recent activity summary, this offer matches your preferences.`;
              }
          }

          return {
            id: offer._id,
            name: offer.name,
            description: offer.description,
            tags: offer.tags,
            recommendationReason: reason,
            score: offer.score
          };
      });

      return JSON.stringify({
        recommendations: results
      });
    } catch (error) {
      return `Error getting recommendations: ${error.message}`;
    }
  },
  {
    name: "recommend_agent",
    description: "Recommend the best offers (up to 2) to a user based on their ID (msisdn). Use the 'msisdn' obtained from other tools.",
    schema: z.object({
      msisdn: z.string().describe("The user's MSISDN (ID)"),
    }),
  }
);

const highValueCustomerTool = tool(
  async ({ limit = 5 }) => {
    try {
      const pipeline = [
        {
          $group: {
            _id: "$msisdn",
            totalUpload: { $sum: "$uploadVolume" },
            totalDownload: { $sum: "$downloadVolume" },
            totalDuration: { $sum: "$duration" },
          },
        },
        {
          $addFields: {
            totalVolume: { $add: ["$totalUpload", "$totalDownload"] },
          },
        },
        { $sort: { totalVolume: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "msisdn",
            as: "userInfo",
          },
        },
        {
          $project: {
            msisdn: "$_id",
            totalVolume: 1,
            totalDuration: 1,
            name: { $arrayElemAt: ["$userInfo.name", 0] },
            _id: 0,
          },
        },
      ];

      const highValueUsers = await Ipdr.aggregate(pipeline);
      
      if (!highValueUsers || highValueUsers.length === 0) {
        return "No usage data found to identify high value customers.";
      }

      // Format the output for better readability by the LLM
      const formattedResult = highValueUsers.map(u => ({
        ...u,
        totalVolumeMB: (u.totalVolume / (1024 * 1024)).toFixed(2) + " MB"
      }));

      return JSON.stringify(formattedResult);
    } catch (error) {
      return `Error identifying high value customers: ${error.message}`;
    }
  },
  {
    name: "high_value_customer_agent",
    description: "Identify high value customers based on their data usage volume (upload + download). Returns a list of top users sorted by usage.",
    schema: z.object({
      limit: z.number().optional().describe("Number of top users to return. Default is 5."),
    }),
  }
);

const findHighUsageUsersInRegionTool = tool(
  async ({ country, minUsageGB, limit = 10 }) => {
    try {
      const minUsageMB = minUsageGB * 1024;
      
      const pipeline = [
        {
          $match: {
            "roaming_plan_usage": {
              $elemMatch: {
                "planName": { $regex: new RegExp(country, "i") },
                "totalUsageMB": { $gt: minUsageMB }
              }
            }
          }
        },
        {
          $project: {
            msisdn: 1,
            name: 1,
            roaming_plan_usage: {
              $filter: {
                input: "$roaming_plan_usage",
                as: "plan",
                cond: {
                  $and: [
                    { $regexMatch: { input: "$$plan.planName", regex: new RegExp(country, "i") } },
                    { $gt: ["$$plan.totalUsageMB", minUsageMB] }
                  ]
                }
              }
            }
          }
        },
        { $unwind: "$roaming_plan_usage" }, // Flatten in case multiple matching plans
        {
          $group: {
            _id: "$msisdn",
            name: { $first: "$name" },
            totalUsageMB: { $sum: "$roaming_plan_usage.totalUsageMB" },
            matchedPlans: { $push: "$roaming_plan_usage.planName" } // Optional: Keep track of plans
          }
        },
        { $sort: { totalUsageMB: -1 } },
        { $limit: limit },
        {
          $project: {
            msisdn: "$_id",
            name: 1,
            usage: { 
              $concat: [
                { $toString: { $round: [{ $divide: ["$totalUsageMB", 1024] }, 2] } },
                " GB" 
              ] 
            },
            _id: 0
          }
        }
      ];

      const users = await User.aggregate(pipeline);

      if (!users || users.length === 0) {
        return `No users found in ${country} with usage over ${minUsageGB}GB.`;
      }

      return JSON.stringify(users) + "\n\nIMPORTANT: The 'msisdn' field in the results above represents the user ID. Use this exact 'msisdn' value (e.g. '85290000003') when calling 'user_agent' or 'recommend_agent'. Do NOT use the array index.";

    } catch (error) {
      return `Error finding users: ${error.message}`;
    }
  },
  {
    name: "find_high_usage_users_in_region",
    description: "Find users in a specific region/country whose roaming traffic usage exceeds a certain limit in GB. Returns a list of users with their 'msisdn'.",
    schema: z.object({
      country: z.string().describe("The country or region name (e.g., 'Asia', 'US', 'Global')"),
      minUsageGB: z.number().describe("The minimum traffic usage in GB (e.g., 5)"),
      limit: z.number().optional().describe("Limit the number of users returned. Default is 10."),
    }),
  }
);

const fulfillmentTool = tool(
  async ({ msisdn, offerId, offerName }) => {
    try {
      // 1. Mock sending the offer (e.g. logging to console)
      console.log(`[Mock Send] Sending offer ${offerId} (${offerName}) to user ${msisdn}`);

      // 2. Log to Audit Logs in MongoDB
      const log = new AuditLog({
        action: 'send_offer',
        msisdn,
        offerId,
        offerName,
        agent: 'fulfillment_agent',
        status: 'success',
        metadata: {
          channel: 'chat_agent'
        }
      });
      await log.save();

      // 3. Update User's Customer Journey
      await User.findOneAndUpdate(
        { msisdn },
        {
          $push: {
            customerJourney: {
              action: 'pushed',
              offerId: offerId,
              offerName: offerName,
              timestamp: new Date(),
              details: 'Sent via AI Agent'
            }
          }
        }
      );

      return `Successfully sent offer "${offerName}" (ID: ${offerId}) to user ${msisdn}. Logged in audit-logs and updated customer journey.`;
    } catch (error) {
      console.error("Fulfillment Tool Error:", error);
      return `Error sending offer: ${error.message}`;
    }
  },
  {
    name: "fulfillment_agent",
    description: "Send a selected offer to a user and log the action. Use this ONLY when the user explicitly confirms they want to send the offer.",
    schema: z.object({
      msisdn: z.string().describe("The user's MSISDN"),
      offerId: z.string().describe("The ID of the offer to send"),
      offerName: z.string().optional().describe("The name of the offer to send"),
    }),
  }
);

const findUsersInRegionTool = tool(
  async ({ country, limit = 10 }) => {
    try {
      const users = await User.find({
        "currentLocation.country": { $regex: new RegExp(country, "i") }
      }).limit(limit);

      if (!users || users.length === 0) {
        return `No users found currently located in ${country}.`;
      }

      return JSON.stringify(users.map(u => ({
        msisdn: u.msisdn,
        name: u.name,
        currentLocation: u.currentLocation?.country || "Unknown",
        tags: u.tags
      }))) + "\n\nIMPORTANT: The 'msisdn' field in the results above represents the user ID. Use this exact 'msisdn' value when calling 'user_agent' or 'recommend_agent'.";
    } catch (error) {
      return `Error finding users in region: ${error.message}`;
    }
  },
  {
    name: "find_users_in_region",
    description: "Find users currently located in a specific region or country (e.g., 'Japan', 'USA'). Use this when looking for users in a location without specific usage criteria.",
    schema: z.object({
      country: z.string().describe("The country or region name to search for."),
      limit: z.number().optional().describe("Limit the number of users returned. Default is 10."),
    }),
  }
);

const tools = [userTool, offerTool, recommendTool, fulfillmentTool, highValueCustomerTool, findHighUsageUsersInRegionTool, findUsersInRegionTool];
const toolNode = new ToolNode(tools);

// 2. Define Model
const model = new AzureChatOpenAI({
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  azureOpenAIApiInstanceName: "nikoopenaiplayground",
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_NAME,
  temperature: 0,
}).bindTools(tools);

// 3. Define Logic
const shouldContinue = (state) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
};

const callModel = async (state) => {
  const { messages } = state;
  const response = await model.invoke(messages);
  return { messages: [response] };
};

// 4. Create Graph
const workflow = new StateGraph(MessagesZodState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", "__end__"])
  .addEdge("tools", "agent");

export const graph = workflow.compile();

export const runAgent = async (incomingMessages) => {
  const systemMessage = new SystemMessage(
    "You are a helpful Telco AI Assistant. Always format your responses using **Markdown** for better readability.\n" +
    "- Use **tables** to display lists of data (like users, offers, plans).\n" +
    "- Use **bold** for key terms, names, and prices.\n" +
    "- Use `inline code` for technical IDs (like MSISDNs, Offer IDs).\n" +
    "- Use > blockquotes for important summaries or recommendations.\n" +
    "- Keep responses concise and professional."
  );

  // Prepend system message
  const messages = [systemMessage, ...incomingMessages];

  const finalState = await graph.invoke({ messages });
  return finalState.messages[finalState.messages.length - 1].content;
};
