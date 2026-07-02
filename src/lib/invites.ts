import { useQuery } from "@tanstack/react-query";

export interface PendingInvite {
  id: string;
  email: string;
  status: "pending" | "bounced";
  bounceType: string | null;
  expiresAt: string;
  createdAt: string;
}

export function useInvites(campaignId: string | null) {
  return useQuery({
    queryKey: ["invites", campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<{ items: PendingInvite[] }> =>
      (await fetch(`/api/invites?campaignId=${campaignId}`)).json(),
  });
}
