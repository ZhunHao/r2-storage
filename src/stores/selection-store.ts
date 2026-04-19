"use client";

import { create } from "zustand";

interface SelectionState {
  selectedKeys: Set<string>;
  anchorKey: string | null;

  select: (key: string) => void;
  toggleSelect: (key: string) => void;
  rangeSelect: (key: string, allKeys: string[]) => void;
  selectAll: (keys: string[]) => void;
  clearSelection: () => void;
  isSelected: (key: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedKeys: new Set<string>(),
  anchorKey: null,

  select: (key) =>
    set({ selectedKeys: new Set([key]), anchorKey: key }),

  toggleSelect: (key) =>
    set((state) => {
      const next = new Set(state.selectedKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return { selectedKeys: next, anchorKey: key };
    }),

  rangeSelect: (key, allKeys) =>
    set((state) => {
      const anchor = state.anchorKey;
      if (!anchor) {
        return { selectedKeys: new Set([key]), anchorKey: key };
      }
      const startIdx = allKeys.indexOf(anchor);
      const endIdx = allKeys.indexOf(key);
      if (startIdx === -1 || endIdx === -1) {
        return { selectedKeys: new Set([key]), anchorKey: key };
      }
      const min = Math.min(startIdx, endIdx);
      const max = Math.max(startIdx, endIdx);
      const range = allKeys.slice(min, max + 1);
      return { selectedKeys: new Set(range) };
    }),

  selectAll: (keys) =>
    set({ selectedKeys: new Set(keys) }),

  clearSelection: () =>
    set({ selectedKeys: new Set(), anchorKey: null }),

  isSelected: (key) => get().selectedKeys.has(key),
}));
