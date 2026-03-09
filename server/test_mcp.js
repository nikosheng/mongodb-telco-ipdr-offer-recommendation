import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// Use StreamableHTTPClientTransport instead of StreamableHttpTransport
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // The SSE transport needs the endpoint where the server is listening
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:5003/mcp") 
  );

  const client = new Client({
    name: "mongodb-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    // This establishes the EventSource connection
    await client.connect(transport);

    // First, establish the actual MongoDB connection
    console.log("Connecting to MongoDB instance...");
    await client.callTool({
        name: "connect",
        arguments: {
            connectionString: process.env.MDB_MCP_CONNECTION_STRING
        }
    });

    const result = await client.callTool({
      name: "list-collections",
      arguments: {
        database: "telco-ipdr"
      }
    });

    console.log("Collections:", result.content);
  } catch (err) {
    console.error("Failed to connect or execute tool:", err);
  }
}

main();