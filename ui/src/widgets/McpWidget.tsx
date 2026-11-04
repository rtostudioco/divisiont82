import { useCallback, useEffect, useState } from "react";
import { Bot, CircleStop, Play } from "lucide-react";
import bridge from "../ipc/bridge";
import type { McpStatus } from "../ipc/bridge";

const TOOLS = ["list_themes", "get_metrics", "shell_status"] as const;

/**
 * Level 2 widget — the shell as a live MCP client.
 *
 * In Tauri it manages the real bridge child process (stdio JSON-RPC);
 * in the web demo it runs against the simulated session.
 */
export function McpWidget() {
  const [status, setStatus] = useState<McpStatus>({ running: false, tools: 0, error: null, script: null });
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string>("");

  const refresh = useCallback(async () => {
    try {
      setStatus(await bridge.mcpStatus());
    } catch {
      /* keep last known state */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onStatus = () => void refresh();
    window.addEventListener("d82.mcp.status", onStatus);
    return () => window.removeEventListener("d82.mcp.status", onStatus);
  }, [refresh]);

  const toggle = async () => {
    setBusy(true);
    try {
      setStatus(status.running ? await bridge.mcpStop() : await bridge.mcpStart());
    } catch (e) {
      setStatus((s) => ({ ...s, running: false, error: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  const call = async (tool: string) => {
    setBusy(true);
    setOutput(`→ ${tool} …`);
    try {
      const res = await bridge.mcpCall(tool, {});
      const text = res?.content?.[0]?.text ?? JSON.stringify(res, null, 2);
      setOutput(`${tool} → ${res?.isError ? "ERROR" : "OK"}\n${text}`);
    } catch (e) {
      setOutput(`${tool} → FAILED\n${(e as Error).message}`);
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  const dotClass = status.running ? "mcp__dot--on" : status.error ? "mcp__dot--err" : "mcp__dot--off";

  return (
    <div className="widget mcp" role="group" aria-label="AI Core MCP">
      <div className="widget__label">
        <Bot size={11} /> AI CORE · MCP CLIENT
      </div>

      <div className="mcp__row">
        <span className={`mcp__dot ${dotClass}`} aria-hidden="true" />
        <span className="mcp__state">
          {status.running ? `ONLINE · ${status.tools} TOOLS` : status.error ? "FAULT" : "OFFLINE"}
        </span>
        <button className="mcp__btn mcp__btn--primary" onClick={() => void toggle()} disabled={busy} aria-live="polite">
          {status.running ? <CircleStop size={11} /> : <Play size={11} />}
          {status.running ? "STOP" : "START"}
        </button>
      </div>

      {status.error && <div className="mcp__error">{status.error}</div>}

      <div className="mcp__tools">
        {TOOLS.map((tool) => (
          <button key={tool} className="mcp__tool" onClick={() => void call(tool)} disabled={busy || !status.running}>
            {tool}
          </button>
        ))}
      </div>

      <pre className="mcp__out" aria-live="polite">
        {output || "// start the bridge, then call a tool\n// obsidian · get_metrics · shell_status"}
      </pre>
    </div>
  );
}
