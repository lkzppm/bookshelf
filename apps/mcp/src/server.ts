import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { ApiClient } from "./api.js";
import { buildMcpServer } from "./tools.js";

const port = Number(process.env.PORT ?? 9400);
const apiUrl = process.env.API_URL ?? "http://localhost:9300";
const api = new ApiClient(apiUrl);

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Stateless streamable HTTP: a fresh server+transport per request, nothing to
// keep in memory between calls — scales on plain HTTP infra.
app.post("/mcp", async (req, res) => {
  const server = buildMcpServer(api);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("mcp request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "internal server error" },
        id: null,
      });
    }
  }
});

for (const method of ["get", "delete"] as const) {
  app[method]("/mcp", (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "method not allowed — stateless server, POST only" },
      id: null,
    });
  });
}

app.listen(port, () => {
  console.log(`bookshelf mcp on :${port} (api: ${apiUrl})`);
});
