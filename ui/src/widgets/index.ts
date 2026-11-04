import type { ComponentType } from "react";
import { CalendarWidget } from "./CalendarWidget";
import { ClockWidget } from "./ClockWidget";
import { CpuWidget } from "./CpuWidget";
import { McpWidget } from "./McpWidget";
import { NetworkWidget } from "./NetworkWidget";
import { RamWidget } from "./RamWidget";
import { ShortcutsWidget } from "./ShortcutsWidget";
import { WeatherWidget } from "./WeatherWidget";

/** Registry: widget kind (matches d82-core `WidgetKind`) → React component. */
export const WIDGET_REGISTRY: Record<string, ComponentType<{ settings?: Record<string, unknown> }>> = {
  cpu: CpuWidget,
  ram: RamWidget,
  clock: ClockWidget,
  calendar: CalendarWidget,
  weather: WeatherWidget,
  network: NetworkWidget,
  shortcuts: ShortcutsWidget,
  mcp: McpWidget,
};
