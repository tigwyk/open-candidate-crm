"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  Filter,
  Phone,
  Mail,
  MapPin,
  Vote,
  DoorOpen,
  PhoneCall,
  DollarSign,
  HeartHandshake,
  Loader2,
} from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { SupportBadge, PartyBadge } from "@/components/common/badges";
import { StatCard } from "@/components/common/stat-card";
import { SUPPORT_LEVELS, type Voter } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/lib/store";
import { useVoters } from "@/lib/voters";
import { VoterDetailSheet } from "@/components/voters/voter-detail-sheet";

interface VoterRow extends Voter {
  precinct?: { name: string; code: string } | null;
  household?: { address: string } | null;
  _count?: { callLogs: number; canvassLogs: number; donations: number };
}

interface Precinct {
  id: string;
  name: string;
}

export function VotersView() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const campaignId = useApp((s) => s.currentCampaignId);
  const [q, setQ] = useState("");
  const [supportFilter, setSupportFilter] = useState<string>("all");
  const [partyFilter, setPartyFilter] = useState<string>("all");
  const [precinctFilter, setPrecinctFilter] = useState<string>("all");
  const [contactedOnly, setContactedOnly] = useState(false);
  const [selected, setSelected] = useState<VoterRow | null>(null);
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data: precinctsData } = useQuery({
    queryKey: ["precincts", campaignId],
    queryFn: async (): Promise<{ items: Precinct[] }> => (await fetch(`/api/precincts?campaignId=${campaignId}`)).json(),
    enabled: !!campaignId,
  });

  const extraParams: Record<string, string> = {};
  if (debouncedQ) extraParams.q = debouncedQ;
  if (supportFilter !== "all") extraParams.support = supportFilter;
  if (partyFilter !== "all") extraParams.party = partyFilter;
  if (precinctFilter !== "all") extraParams.precinctId = precinctFilter;
  if (contactedOnly) extraParams.contacted = "1";

  const { data, isLoading } = useVoters(campaignId, extraParams, { staleTime: 10_000 });

  const voters: VoterRow[] = (data?.items as VoterRow[] | undefined) ?? [];

  // Compute summary
  const summary = useMemo(() => {
    if (!voters.length) return null;
    const supporters = voters.filter((v) => v.supportLevel === "strong-support" || v.supportLevel === "lean-support").length;
    const contacted = voters.filter((v) => (v._count?.callLogs ?? 0) > 0 || (v._count?.canvassLogs ?? 0) > 0).length;
    const volunteers = voters.filter((v) => v.volunteer).length;
    const yardsigns = voters.filter((v) => v.hasYardSign).length;
    return { total: data?.total ?? voters.length, supporters, contacted, volunteers, yardsigns };
  }, [voters, data]);

  async function updateVoter(id: string, patch: Partial<Voter>) {
    const r = await fetch("/api/voters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (r.ok) {
      toast({ title: "Voter updated", duration: 1500 });
      qc.invalidateQueries({ queryKey: ["voters"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (selected?.id === id) setSelected({ ...selected, ...patch });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Users} label="Total" value={summary.total} />
          <StatCard icon={Vote} label="Supporters" value={summary.supporters} accent="emerald" />
          <StatCard icon={PhoneCall} label="Contacted" value={summary.contacted} accent="cyan" />
          <StatCard icon={HeartHandshake} label="Volunteers" value={summary.volunteers} accent="violet" />
          <StatCard icon={MapPin} label="Yard signs" value={summary.yardsigns} accent="amber" />
        </div>
      )}

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, phone, address, or notes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={supportFilter} onValueChange={setSupportFilter}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Support" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All support</SelectItem>
              {SUPPORT_LEVELS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={partyFilter} onValueChange={setPartyFilter}>
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue placeholder="Party" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All parties</SelectItem>
              {["Dem", "Rep", "Ind", "Green", "Lib", "NPP"].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={precinctFilter} onValueChange={setPrecinctFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Precinct" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All precincts</SelectItem>
              {(precinctsData?.items ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={contactedOnly ? "default" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setContactedOnly((v) => !v)}
          >
            <Filter className="size-3.5 mr-1" /> Contacted
          </Button>
        </div>
      </Card>

      {/* Voters table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5">Voter</th>
                <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Contact</th>
                <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">Precinct</th>
                <th className="text-left font-medium px-4 py-2.5">Support</th>
                <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">History</th>
                <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Tags</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto" />
                  </td>
                </tr>
              )}
              {!isLoading && voters.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No voters match these filters.
                  </td>
                </tr>
              )}
              {voters.map((v) => (
                <tr
                  key={v.id}
                  className="border-b last:border-b-0 hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => setSelected(v)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <PersonAvatar first={v.firstName} last={v.lastName} size="sm" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {v.firstName} {v.lastName}
                          {v.volunteer && <HeartHandshake className="inline size-3 ml-1.5 text-violet-500" />}
                          {v.hasYardSign && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-500 align-middle" title="Yard sign" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {v.household?.address ?? v.registeredAddress ?? "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <div className="text-[12px] text-muted-foreground">
                      {v.phone && <div className="flex items-center gap-1"><Phone className="size-3" />{v.phone}</div>}
                      {v.email && <div className="flex items-center gap-1 truncate"><Mail className="size-3" />{v.email}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    <div className="text-[12px]">{v.precinct?.name ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{v.precinct?.code}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <PartyBadge party={v.partyAffiliation} />
                      <SupportBadge level={v.supportLevel} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5" title="Calls">
                        <PhoneCall className="size-3" />
                        {v._count?.callLogs ?? 0}
                      </span>
                      <span className="flex items-center gap-0.5" title="Doors">
                        <DoorOpen className="size-3" />
                        {v._count?.canvassLogs ?? 0}
                      </span>
                      <span className="flex items-center gap-0.5" title="Donations">
                        <DollarSign className="size-3" />
                        {v._count?.donations ?? 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {v.votedIn2024 && <Badge variant="outline" className="text-[10px] py-0 h-4">V24</Badge>}
                      {v.votedIn2022 && <Badge variant="outline" className="text-[10px] py-0 h-4">V22</Badge>}
                      {v.votedIn2020 && <Badge variant="outline" className="text-[10px] py-0 h-4">V20</Badge>}
                      {v.tags?.split(",").map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] py-0 h-4">{t}</Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.total !== undefined && (
          <div className="px-4 py-2 border-t text-[11px] text-muted-foreground bg-muted/20">
            Showing {voters.length} of {data.total} voters
          </div>
        )}
      </Card>

      {/* Voter detail sheet */}
      <VoterDetailSheet
        voter={selected}
        onClose={() => setSelected(null)}
        onUpdate={updateVoter}
      />
    </div>
  );
}
