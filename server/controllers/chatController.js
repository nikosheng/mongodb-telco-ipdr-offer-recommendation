import { runAgent } from '../services/agentService.js';

export const chatWithAgent = async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Messages array is required." });
    }

    const response = await runAgent(messages);
    res.json({ content: response });
  } catch (error) {
    console.error("Error in chat controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
