/**
 * DivisionT82 — MCP bridge end-to-end test.
 *
 * Spawns the real bridge as a child process, speaks MCP over stdio
 * (newline-delimited JSON-RPC) and asserts the handshake + tool calls work.
 * Exit 0 = bridge conforms.
 */
import { spawn } from "node:child_process";

const BRIDGE = new URL("../modules/mcp-bridge/src/index.ts", import.meta.url).pathname;

interface RpcResp {
  jsonrpc: string;
  id?: number | string | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

const child = spawn("bun", [BRIDGE], { stdio: ["pipe", "pipe", "pipe"] });

const pending = new Map<number, (r: RpcResp) => void>();
let lineBuf = "";

child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk: string) => {
  lineBuf += chunk;
  let idx: number;
  while ((idx = lineBuf.indexOf("\n")) >= 0) {
    const line = lineBuf.slice(0, idx).trim();
    lineBuf = lineBuf.slice(idx + 1);
    if (!line) continue;
    const msg = JSON.parse(line) as RpcResp;
    const id = typeof msg.id === "number" ? msg.id : undefined;
    const resolve = id !== undefined ? pending.get(id) : undefined;
    if (resolve) {
      pending.delete(id);
      resolve(msg);
    }
  }
});

child.stderr.on("data", (d: Buffer) => console.error("[bridge stderr]", d.toString()));

function rpc(method: string, params?: Record<string, unknown>): Promise<RpcResp> {
  return new Promise((resolve, reject) => {
    const id = pending.size + Math.floor(Math.random() * 10_000) + 1;
    pending.set(id, resolve);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`timeout on ${method}`));
      }
    }, 5000);
  });
}

function assert(cond: boolean, what: string): void {
  if (!cond) {
    console.error(`✗ ${what}`);
    child.kill();
    process.exit(1);
  }
  console.log(`✓ ${what}`);
}

async function main(): Promise<void> {
  const init = await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "d82-test", version: "0.0.1" },
  });
  assert(init.result !== undefined, "MCP initialize handshake");
  const info = (init.result?.serverInfo ?? {}) as { name?: string };
  assert(info.name === "divisiont82-mcp", "serverInfo.name is divisiont82-mcp");

  // notifications/initialized — no response expected; just send it
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  const tools = await rpc("tools/list");
  const toolNames = ((tools.result?.tools ?? []) as Array<{ name: string }>).map((t) => t.name);
  assert(toolNames.includes("list_themes"), "tools/list exposes list_themes");
  assert(toolNames.includes("describe_theme"), "tools/list exposes describe_theme");
  assert(toolNames.includes("shell_status"), "tools/list exposes shell_status");

  const status = await rpc("tools/call", { name: "shell_status", arguments: {} });
  const statusText = String(
    ((status.result?.content as Array<{ type: string; text: string }>) ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(""),
  );
  assert(statusText.includes("DivisionT82"), "shell_status reports DivisionT82");

  const list = await rpc("tools/call", { name: "list_themes", arguments: {} });
  const listText = String(
    ((list.result?.content as Array<{ type: string; text: string }>) ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(""),
  );
  for (const id of ["obsidian", "quantum", "neural", "minimal"]) {
    assert(listText.includes(id), `list_themes includes '${id}'`);
  }

  const describe = await rpc("tools/call", { name: "describe_theme", arguments: { id: "obsidian" } });
  const describeText = String(
    ((describe.result?.content as Array<{ type: string; text: string }>) ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(""),
  );
  assert(describeText.includes("#22d3ee"), "describe_theme returns obsidian palette");

  const missing = await rpc("tools/call", { name: "describe_theme", arguments: { id: "nope" } });
  const missingResult = missing.result as { isError?: boolean } | undefined;
  assert(missingResult?.isError === true, "describe_theme errors gracefully for unknown id");

  const bad = await rpc("bogus/method");
  assert(bad.error?.code === -32601, "unknown method returns JSON-RPC error -32601");

  child.kill();
  console.log("\nMCP bridge: all checks passed.");
  process.exit(0);
}

main().catch((e) => {
  console.error("✗ MCP test failed:", e);
  child.kill();
  process.exit(1);
});
