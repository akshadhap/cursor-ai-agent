import type { ReactFlowInstance } from "@xyflow/react";
import { atom } from "jotai";

export const editorAtom = atom<ReactFlowInstance | null>(null);

// 👇 NEW: move the StickyNote type here so it can be reused
export type StickyNote = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

// 👇 NEW: global sticky notes atom
export const stickyNotesAtom = atom<StickyNote[]>([]);
