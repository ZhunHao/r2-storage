"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppStore } from "@/stores/app-store";
import type { ViewMode } from "@/types";
import { Check, ChevronDown, LayoutGrid, List } from "lucide-react";
import { useState } from "react";

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
];

export function ViewToggle() {
  const { viewMode, setViewMode } = useAppStore();
  const [open, setOpen] = useState(false);
  const Icon = viewMode === "list" ? List : LayoutGrid;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-8 items-center gap-0.5 rounded-md px-1.5 text-accent-blue transition-[background-color] duration-150 hover:bg-surface-hover outline-none">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
        <ChevronDown className="h-3 w-3" strokeWidth={2} />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4}>
        <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          View as
        </p>
        {VIEW_OPTIONS.map((option) => {
          const isActive = viewMode === option.value;
          return (
            <button
              key={option.value}
              onClick={() => {
                setViewMode(option.value);
                setOpen(false);
              }}
              className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            >
              <option.icon className="h-4 w-4" />
              {option.label}
              {isActive && (
                <Check className="absolute right-2 h-4 w-4 text-accent-blue" />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
