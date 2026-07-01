import { create } from "zustand";
import { persist } from "zustand/middleware";

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

  currentCampaignId: string | null;
  setCampaign: (id: string) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      active: "dashboard",
      set: (m) => set({ active: m }),
      sidebarOpen: false,
      setSidebar: (open) => set({ sidebarOpen: open }),

      currentCampaignId: null,
      setCampaign: (id) => set({ currentCampaignId: id }),
    }),
    {
      name: "campaignground-app",
      partialize: (state) => ({ currentCampaignId: state.currentCampaignId }),
    }
  )
);
