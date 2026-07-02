import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/store";

export interface Membership {
  campaignId: string;
  campaignName: string;
  officeSought: string;
  role: "owner" | "member";
}

export function useMemberships() {
  return useQuery({
    queryKey: ["memberships"],
    queryFn: async (): Promise<{ items: Membership[]; isPlatformOwner: boolean }> =>
      (await fetch("/api/memberships")).json(),
  });
}

export function useCurrentRole(): "owner" | "member" | null {
  const currentCampaignId = useApp((s) => s.currentCampaignId);
  const { data } = useMemberships();
  const membership = data?.items.find((m) => m.campaignId === currentCampaignId);
  return membership?.role ?? null;
}

export function useIsPlatformOwner(): boolean {
  const { data } = useMemberships();
  return data?.isPlatformOwner ?? false;
}
