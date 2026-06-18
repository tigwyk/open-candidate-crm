import { create } from "zustand";

export type Module =
  | "dashboard"
  | "voters"
  | "volunteers"
  | "donors"
  | "canvass"
  | "phonebank"
  | "events"
  | "tasks";

interface AppState {
  active: Module;
  set: (m: Module) => void;
  sidebarOpen: boolean;
  setSidebar: (open: boolean) => void;
}

export const useApp = create<AppState>((set) => ({
  active: "dashboard",
  set: (m) => set({ active: m }),
  sidebarOpen: false,
  setSidebar: (open) => set({ sidebarOpen: open }),
}));
