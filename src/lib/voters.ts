import { useQuery } from "@tanstack/react-query";
import type { Voter } from "@/lib/types";

export interface VotersResult {
  items: Voter[];
  total?: number;
}

export function useVoters(
  campaignId: string | null,
  extraParams?: Record<string, string>,
  options?: { refetchInterval?: number; staleTime?: number }
) {
  const paramsKey = extraParams ? JSON.stringify(extraParams) : "";
  return useQuery({
    queryKey: ["voters", campaignId, paramsKey],
    queryFn: async (): Promise<VotersResult> => {
      const params = new URLSearchParams(extraParams);
      if (campaignId) params.set("campaignId", campaignId);
      const r = await fetch(`/api/voters?${params}`);
      return r.json();
    },
    enabled: !!campaignId,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime,
  });
}
