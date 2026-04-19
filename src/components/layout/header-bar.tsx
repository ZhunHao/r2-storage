"use client";

import { CircleHelp, CircleUser } from "lucide-react";

export function HeaderBar() {
  return (
    <header
      className="flex h-11 shrink-0 items-center justify-between px-4 bg-app-titlebar-bg"
      style={{
        borderBottom: "1px solid var(--divider)",
      }}
    >
      <div className="flex items-center">
        <span
          className="text-[17px] font-semibold tracking-tight text-accent-blue select-none"
        >
          R2 Storage
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors">
          <CircleHelp className="h-[18px] w-[18px]" />
          <span className="text-[15px]">Support</span>
        </button>
        <button className="text-text-tertiary hover:text-text-primary transition-colors">
          <CircleUser className="h-[22px] w-[22px]" />
        </button>
      </div>
    </header>
  );
}
