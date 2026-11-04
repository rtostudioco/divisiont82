//! Universal MCP — live host client (Etapa B).
//!
//! Spawns the zero-dependency MCP bridge (`modules/mcp-bridge`) as a child
//! process and speaks newline-delimited JSON-RPC 2.0 over stdio, turning the
//! shell itself into an MCP client. The AI Core widget (and any future in-shell
//! agent) can call `list_themes`, `describe_theme`, `get_metrics` and
//! `shell_status` without ever leaving the desktop.
//!
//! Production note (v0.3): `bun` is required on PATH today. The plan is to
//! ship the bridge as a bundled Tauri sidecar binary so end users need nothing
//! installed.

use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::State;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(5);

/// Live status of the MCP host client.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpStatus {
    pub running: bool,
    pub tools: usize,
    pub error: Option<String>,
    pub script: Option<String>,
}

struct McpSession {
    child: Child,
    stdin: ChildStdin,
    /// Request id → oneshot-ish channel that the reader thread resolves.
    pending: Arc<Mutex<HashMap<u64, Sender<Value>>>>,
}

impl Drop for McpSession {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

/// Managed handle for the MCP child process.
#[derive(Default)]
pub struct McpHandle {
    session: Mutex<Option<McpSession>>,
    next_id: AtomicU64,
    tools: AtomicUsize,
    error: Mutex<Option<String>>,
    script: Mutex<Option<PathBuf>>,
}

impl McpHandle {
    fn request(
        &self,
        session: &mut McpSession,
        method: &str,
        params: Value,
    ) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = channel();
        if let Ok(mut pending) = session.pending.lock() {
            pending.insert(id, tx);
        }

        let line = serde_json::json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        });
        let raw = serde_json::to_string(&line).map_err(|e| e.to_string())?;
        let sent = session
            .stdin
            .write_all(raw.as_bytes())
            .and_then(|_| session.stdin.write_all(b"\n"))
            .and_then(|_| session.stdin.flush());
        if let Err(e) = sent {
            if let Ok(mut pending) = session.pending.lock() {
                pending.remove(&id);
            }
            return Err(format!("mcp stdin write failed: {e}"));
        }

        match rx.recv_timeout(REQUEST_TIMEOUT) {
            Ok(response) => {
                if let Some(err) = response.get("error") {
                    return Err(format!("mcp error: {err}"));
                }
                Ok(response.get("result").cloned().unwrap_or(Value::Null))
            }
            Err(_) => {
                if let Ok(mut pending) = session.pending.lock() {
                    pending.remove(&id);
                }
                Err("mcp request timed out (bridge unresponsive?)".into())
            }
        }
    }

    fn status(&self) -> McpStatus {
        let running = self.session.lock().map(|s| s.is_some()).unwrap_or(false);
        McpStatus {
            running,
            tools: self.tools.load(Ordering::SeqCst),
            error: self.error.lock().ok().and_then(|e| e.clone()),
            script: self
                .script
                .lock()
                .ok()
                .and_then(|s| s.clone())
                .map(|p| p.display().to_string()),
        }
    }

    fn record_error(&self, message: String) {
        if let Ok(mut slot) = self.error.lock() {
            *slot = Some(message);
        }
    }
}

fn resolve_script() -> Option<PathBuf> {
    if let Ok(from_env) = std::env::var("D82_MCP_SCRIPT") {
        let path = PathBuf::from(from_env);
        if path.is_file() {
            return Some(path);
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        for candidate in [
            cwd.join("modules/mcp-bridge/src/index.ts"),
            cwd.join("../modules/mcp-bridge/src/index.ts"),
        ] {
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

/// Starts the MCP bridge child and performs the initialize handshake.
#[tauri::command]
pub fn mcp_start(handle: State<'_, McpHandle>) -> Result<McpStatus, String> {
    if handle.status().running {
        return Ok(handle.status());
    }

    let script = resolve_script().ok_or_else(|| {
        "mcp bridge script not found — set D82_MCP_SCRIPT or run from the repo root".to_string()
    })?;

    let mut child = Command::new("bun")
        .arg(&script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("failed to spawn 'bun' for the MCP bridge: {e}"))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "mcp bridge stdout unavailable".to_string())?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "mcp bridge stdin unavailable".to_string())?;

    let pending: Arc<Mutex<HashMap<u64, Sender<Value>>>> = Arc::new(Mutex::new(HashMap::new()));
    let pending_reader = Arc::clone(&pending);
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let Ok(value) = serde_json::from_str::<Value>(&line) else {
                continue;
            };
            let Some(id) = value.get("id").and_then(Value::as_u64) else {
                continue;
            };
            if let Ok(map) = pending_reader.lock() {
                if let Some(tx) = map.get(&id) {
                    let _ = tx.send(value);
                }
            }
        }
        // EOF: the bridge died — pending calls will time out and surface it.
    });

    let mut session = McpSession { child, stdin, pending };

    let mut handshake = || -> Result<usize, String> {
        handle.request(
            &mut session,
            "initialize",
            serde_json::json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "divisiont82-shell",
                    "version": env!("CARGO_PKG_VERSION"),
                },
            }),
        )?;
        let notify = serde_json::json!({ "jsonrpc": "2.0", "method": "notifications/initialized" });
        session
            .stdin
            .write_all(notify.to_string().as_bytes())
            .and_then(|_| session.stdin.write_all(b"\n"))
            .and_then(|_| session.stdin.flush())
            .map_err(|e| e.to_string())?;
        let tools = handle.request(&mut session, "tools/list", serde_json::json!({}))?;
        Ok(tools
            .get("tools")
            .and_then(Value::as_array)
            .map(|a| a.len())
            .unwrap_or(0))
    };

    match handshake() {
        Ok(count) => {
            handle.tools.store(count, Ordering::SeqCst);
            if let Ok(mut slot) = handle.error.lock() {
                *slot = None;
            }
            if let Ok(mut slot) = handle.script.lock() {
                *slot = Some(script.clone());
            }
            *handle
                .session
                .lock()
                .map_err(|_| "mcp session poisoned".to_string())? = Some(session);
            Ok(handle.status())
        }
        Err(e) => {
            handle.record_error(e.clone());
            Err(e) // session dropped here → child killed
        }
    }
}

/// Stops the MCP bridge child process.
#[tauri::command]
pub fn mcp_stop(handle: State<'_, McpHandle>) -> McpStatus {
    if let Ok(mut slot) = handle.session.lock() {
        *slot = None; // Drop impl kills the child
    }
    handle.tools.store(0, Ordering::SeqCst);
    handle.status()
}

/// Current MCP client status.
#[tauri::command]
pub fn mcp_status(handle: State<'_, McpHandle>) -> McpStatus {
    handle.status()
}

/// Calls an MCP tool (`list_themes`, `describe_theme`, `get_metrics`,
/// `shell_status`, …) and returns the raw JSON-RPC `result` document.
#[tauri::command]
pub fn mcp_call(
    handle: State<'_, McpHandle>,
    tool: String,
    args: Option<Value>,
) -> Result<Value, String> {
    let mut guard = handle
        .session
        .lock()
        .map_err(|_| "mcp session poisoned".to_string())?;
    let session = guard
        .as_mut()
        .ok_or_else(|| "mcp bridge is not running (start the AI Core first)".to_string())?;
    handle.request(
        session,
        "tools/call",
        serde_json::json!({ "name": tool, "arguments": args.unwrap_or(Value::Null) }),
    )
}
