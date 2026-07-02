import { useQuery } from "@tanstack/react-query";
import type { Volunteer } from "@/lib/types";

export function useVolunteers(campaignId: string | null) {
  return useQuery({
    queryKey: ["volunteers", campaignId],
    queryFn: async (): Promise<{ items: Volunteer[] }> =>
      (await fetch(`/api/volunteers?campaignId=${campaignId}`)).json(),
    enabled: !!campaignId,
  });
}
