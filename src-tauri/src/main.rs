// DivisionT82 — Tauri v2 shell entry point.
//
// The heavy lifting lives in `divisiont82_lib` (lib.rs) so the same code can
// be reused by mobile targets in the future.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    divisiont82_lib::run()
}
