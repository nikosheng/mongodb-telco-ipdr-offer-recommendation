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
    description: "Get user information from the users collection by msisdn (user ID).",
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
  async ({ userId }) => {
    try {
      const user = await User.findOne({ msisdn: userId });
      if (!user) return "User not found.";

      const recommendations = await recommendOffers(userId);
      if (!recommendations || recommendations.length === 0) {
        return "No suitable offers found for this user.";
      }

      const bestOffer = recommendations[0];
      
      // Construct a reason based on user tags and offer tags/description
      let reason = "This offer is recommended based on your recent activity patterns.";
      if (user.tags && user.tags.length > 0 && bestOffer.tags) {
        const matchingTags = user.tags.filter(tag => 
          bestOffer.tags.some(ot => ot.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(ot.toLowerCase()))
        );
        if (matchingTags.length > 0) {
          reason = `This offer aligns with your interests in ${matchingTags.slice(0, 3).join(", ")}.`;
        } else if (user.latestActivitySummary) {
          reason = `Based on your recent activity: "${user.latestActivitySummary.substring(0, 100)}...", this offer is the best match.`;
        }
      } else if (user.latestActivitySummary) {
        reason = `Based on your recent activity summary, this offer matches your preferences.`;
      }

      return JSON.stringify({
        bestOffer: {
          id: bestOffer._id,
          name: bestOffer.name,
          description: bestOffer.description,
          tags: bestOffer.tags
        },
        recommendationReason: reason
      });
    } catch (error) {
      return `Error getting recommendations: ${error.message}`;
    }
  },
  {
    name: "recommend_agent",
    description: "Recommend the single best offer to a user based on their ID (msisdn) and provide a reason.",
    schema: z.object({
      userId: z.string().describe("The user's MSISDN (ID)"),
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

const tools = [userTool, offerTool, recommendTool, fulfillmentTool, highValueCustomerTool];
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
  const finalState = await graph.invoke({ messages: incomingMessages });
  return finalState.messages[finalState.messages.length - 1].content;
};
