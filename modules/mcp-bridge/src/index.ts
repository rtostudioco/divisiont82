/**
 * DivisionT82 — Universal MCP bridge.
 *
 * A zero-dependency Model Context Protocol server over stdio (newline-
 * delimited JSON-RPC 2.0, per the MCP spec). It exposes the shell to any MCP
 * client (Claude Desktop, IDEs, local agents):
 *
 *   tools:
 *     - list_themes      → every .d82theme pack available to the shell
 *     - describe_theme   → full pack document for one theme id
 *     - get_metrics      → last known CPU/RAM snapshot (simulated until the
 *                          desktop host bridge is attached)
 *     - shell_status     → build/version info of the bridge + core
 *
 * Run:  bun modules/mcp-bridge/src/index.ts
 * Test: bun scripts/test-mcp.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");
const THEMES_DIR = join(ROOT, "themes");
const PROTOCOL_VERSION = "2024-11-05";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const TOOLS: ToolDef[] = [
  {
    name: "list_themes",
    description:
      "List every DivisionT82 theme pack (.d82theme) available to the shell, with id, name, version and tags.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "describe_theme",
    description: "Return the complete theme pack document for a given theme id (palette, glass, holo layer...).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Theme pack id, e.g. 'obsidian'" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_metrics",
    description:
      "Latest CPU/RAM metrics snapshot. Simulated until the desktop host bridge (Tauri) is attached.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "shell_status",
    description: "Version and capability information about the DivisionT82 shell and this MCP bridge.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

function listThemeFiles(): string[] {
  try {
    return readdirSync(THEMES_DIR).filter((f) => f.endsWith(".d82theme.json")).sort();
  } catch {
    return [];
  }
}

function loadPack(id: string): Record<string, unknown> | null {
  const file = join(THEMES_DIR, `${id}.d82theme.json`);
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function summarizePack(file: string): Record<string, unknown> | null {
  try {
    const pack = JSON.parse(readFileSync(join(THEMES_DIR, file), "utf8")) as Record<string, unknown>;
    return {
      id: pack.id,
      name: pack.name,
      version: pack.version,
      author: pack.author,
      tags: pack.tags,
      accent: (pack.palette as Record<string, string>)?.accent,
    };
  } catch {
    return null;
  }
}

function callTool(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case "list_themes":
      return { packs: listThemeFiles().map(summarizePack).filter(Boolean) };
    case "describe_theme": {
      const id = String(args.id ?? "");
      const pack = loadPack(id);
      if (!pack) throw new Error(`theme '${id}' not found`);
      return pack;
    }
    case "get_metrics": {
      const t = Date.now() / 1000;
      return {
        simulated: true,
        note: "Attach the Tauri host bridge for real telemetry.",
        cpuAvgPercent: Number((Math.abs(Math.sin(t / 9)) * 38 + 8).toFixed(1)),
        memPercent: Number((Math.abs(Math.sin(t / 31 + 1)) * 14 + 44).toFixed(1)),
      };
    }
    case "shell_status":
      return {
        name: "DivisionT82",
        stage: "A — monorepo",
        version: "0.1.0",
        protocolVersion: PROTOCOL_VERSION,
        capabilities: ["themes", "metrics-simulated", "status"],
        themeCount: listThemeFiles().length,
      };
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

function respond(msg: JsonRpcRequest): string | null {
  if (msg.method === "initialize") {
    return JSON.stringify({
      jsonrpc: "2.0",
      id: msg.id ?? null,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "divisiont82-mcp", version: "0.1.0" },
      },
    });
  }
  if (msg.method === "notifications/initialized" || msg.method.startsWith("notifications/")) {
    return null; // notifications are not answered
  }
  if (msg.method === "tools/list") {
    return JSON.stringify({ jsonrpc: "2.0", id: msg.id ?? null, result: { tools: TOOLS } });
  }
  if (msg.method === "tools/call") {
    const name = String((msg.params?.name as string) ?? "");
    const args = (msg.params?.arguments as Record<string, unknown>) ?? {};
    try {
      return JSON.stringify({
        jsonrpc: "2.0",
        id: msg.id ?? null,
        result: {
          content: [{ type: "text", text: JSON.stringify(callTool(name, args), null, 2) }],
          isError: false,
        },
      });
    } catch (e) {
      return JSON.stringify({
        jsonrpc: "2.0",
        id: msg.id ?? null,
        result: {
          content: [{ type: "text", text: (e as Error).message }],
          isError: true,
        },
      });
    }
  }
  if (msg.method === "ping") {
    return JSON.stringify({ jsonrpc: "2.0", id: msg.id ?? null, result: {} });
  }
  return JSON.stringify({
    jsonrpc: "2.0",
    id: msg.id ?? null,
    error: { code: -32601, message: `method not found: ${msg.method}` },
  });
}

// --- stdio loop: one JSON-RPC message per line -----------------------------
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  buffer += chunk;
  let idx: number;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let out: string | null = null;
    try {
      out = respond(JSON.parse(line) as JsonRpcRequest);
    } catch {
      out = JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "parse error" },
      });
    }
    if (out) process.stdout.write(out + "\n");
  }
});
process.stdin.on("end", () => process.exit(0));
