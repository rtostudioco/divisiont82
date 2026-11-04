import { Github, Layers, Moon, Rocket, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface LaunchItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const DEFAULTS: LaunchItem[] = [
  { label: "GitHub", href: "https://github.com/", icon: Github },
  { label: "Docs", href: "https://github.com/", icon: Layers },
  { label: "Themes", href: "https://github.com/", icon: Moon },
  { label: "Shell", href: "https://github.com/", icon: Terminal },
  { label: "Roadmap", href: "https://github.com/", icon: Rocket },
];

/** Level 2 widget — quick access tiles (Windows/Linux shortcuts in the shell). */
export function ShortcutsWidget() {
  return (
    <div className="widget" role="group" aria-label="Launchpad">
      <div className="widget__label">
        <Rocket size={11} /> LAUNCHPAD
      </div>
      <div className="launch__grid">
        {DEFAULTS.map(({ label, href, icon: Icon }) => (
          <a key={label} className="launch__item" href={href} target="_blank" rel="noreferrer noopener">
            <Icon size={16} />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
