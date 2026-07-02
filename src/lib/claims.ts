import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Claim {
  voterId: string;
  channel: string;
  volunteerId: string;
  volunteerName: string | null;
  claimedAt: string;
}

/**
 * Shared claim/release mechanics for the "who's working this contact right
 * now" pattern used by canvassing and phone banking. Owns the claims query
 * and the claimedByOthers Map; callers own their own trigger logic (when to
 * claim/release).
 */
export function useClaims(channel: string, campaignId: string | null, activeVolunteerId: string) {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["claims", channel, campaignId],
    queryFn: async (): Promise<{ items: Claim[] }> =>
      (await fetch(`/api/claims?channel=${channel}&campaignId=${campaignId}`)).json(),
    enabled: !!campaignId,
    refetchInterval: 8_000,
  });
  const claims = data?.items ?? [];

  const claimedByOthers = new Map(
    claims
      .filter((c) => c.volunteerId !== activeVolunteerId)
      .map((c) => [c.voterId, c.volunteerName ?? "another volunteer"])
  );

  const claimMutation = useMutation({
    mutationFn: async ({ voterId, volunteerId }: { voterId: string; volunteerId: string }) =>
      fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId, channel, volunteerId }),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["claims", channel] }),
  });

  const releaseMutation = useMutation({
    mutationFn: async ({ voterId, volunteerId }: { voterId: string; volunteerId: string }) =>
      fetch("/api/claims", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId, channel, volunteerId }),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["claims", channel] }),
  });

  return {
    claims,
    claimedByOthers,
    claim: (voterId: string, volunteerId: string) => claimMutation.mutateAsync({ voterId, volunteerId }),
    release: (voterId: string, volunteerId: string) => releaseMutation.mutateAsync({ voterId, volunteerId }),
  };
}
