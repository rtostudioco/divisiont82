//! Level 2 — System metrics collection (feature: `metrics`).
//!
//! Thin, snapshot-based wrapper over `sysinfo`. The Tauri host calls
//! [`collect()`] on a timer and pushes snapshots to the webview over IPC.

use serde::Serialize;

/// One CPU core reading.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuCore {
    pub name: String,
    pub usage_percent: f32,
}

/// A point-in-time snapshot of the machine.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricsSnapshot {
    pub cpu_avg_percent: f32,
    pub cpu_cores: Vec<CpuCore>,
    pub mem_total_bytes: u64,
    pub mem_used_bytes: u64,
    pub mem_percent: f64,
    pub collected_at_ms: u128,
}

/// Collects a fresh metrics snapshot. Cheap enough to call 1–2×/second.
pub fn collect() -> MetricsSnapshot {
    use sysinfo::System;

    let mut sys = System::new();
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cores: Vec<CpuCore> = sys
        .cpus()
        .iter()
        .map(|c| CpuCore {
            name: c.name().to_string(),
            usage_percent: c.cpu_usage(),
        })
        .collect();

    let cpu_avg_percent = if cores.is_empty() {
        0.0
    } else {
        cores.iter().map(|c| c.usage_percent).sum::<f32>() / cores.len() as f32
    };

    let mem_total = sys.total_memory();
    let mem_used = sys.used_memory();

    MetricsSnapshot {
        cpu_avg_percent,
        cpu_cores: cores,
        mem_total_bytes: mem_total,
        mem_used_bytes: mem_used,
        mem_percent: if mem_total == 0 {
            0.0
        } else {
            (mem_used as f64 / mem_total as f64) * 100.0
        },
        collected_at_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0),
    }
}
