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
  StickyNote,
  Vote,
  DoorOpen,
  PhoneCall,
  DollarSign,
  HeartHandshake,
  Loader2,
} from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { SupportBadge, PartyBadge } from "@/components/common/badges";
import { SUPPORT_LEVELS, type Voter } from "@/lib/types";
import { formatCurrency, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface VoterRow extends Voter {
  precinct?: { name: string; code: string } | null;
  household?: { address: string } | null;
  _count?: { callLogs: number; canvassLogs: number; donations: number };
}

export function VotersView() {
  const qc = useQueryClient();
  const { toast } = useToast();
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
    queryKey: ["precincts"],
    queryFn: async () => (await fetch("/api/precincts")).json(),
  });

  const params = new URLSearchParams();
  if (debouncedQ) params.set("q", debouncedQ);
  if (supportFilter !== "all") params.set("support", supportFilter);
  if (partyFilter !== "all") params.set("party", partyFilter);
  if (precinctFilter !== "all") params.set("precinctId", precinctFilter);
  if (contactedOnly) params.set("contacted", "1");

  const { data, isLoading } = useQuery({
    queryKey: ["voters", params.toString()],
    queryFn: async () => {
      const r = await fetch(`/api/voters?${params}`);
      return r.json();
    },
    staleTime: 10_000,
  });

  const voters: VoterRow[] = data?.items ?? [];

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
          <SummaryPill icon={Users} label="Total" value={summary.total} />
          <SummaryPill icon={Vote} label="Supporters" value={summary.supporters} accent="emerald" />
          <SummaryPill icon={PhoneCall} label="Contacted" value={summary.contacted} accent="cyan" />
          <SummaryPill icon={HeartHandshake} label="Volunteers" value={summary.volunteers} accent="violet" />
          <SummaryPill icon={MapPin} label="Yard signs" value={summary.yardsigns} accent="amber" />
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
              {(precinctsData?.items ?? []).map((p: any) => (
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

function SummaryPill({ icon: Icon, label, value, accent = "primary" }: {
  icon: any;
  label: string;
  value: number | string;
  accent?: "primary" | "emerald" | "violet" | "amber" | "cyan";
}) {
  const colors: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    violet: "text-violet-600 bg-violet-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    cyan: "text-cyan-600 bg-cyan-500/10",
  };
  return (
    <Card className="p-3 flex items-center gap-2.5">
      <div className={`size-8 rounded-md grid place-items-center ${colors[accent]}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-base font-semibold tabular-nums leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    </Card>
  );
}

function VoterDetailSheet({
  voter,
  onClose,
  onUpdate,
}: {
  voter: VoterRow | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Voter>) => void;
}) {
  return (
    <Sheet open={!!voter} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {voter && (
          <VoterDetailForm key={voter.id} voter={voter} onUpdate={onUpdate} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function VoterDetailForm({
  voter,
  onUpdate,
}: {
  voter: VoterRow;
  onUpdate: (id: string, patch: Partial<Voter>) => void;
}) {
  const [notes, setNotes] = useState(voter.notes ?? "");

  return (
    <>
      <SheetHeader className="pb-3 border-b">
        <SheetTitle className="flex items-center gap-3">
          <PersonAvatar first={voter.firstName} last={voter.lastName} size="lg" />
          <div>
            <div>{voter.firstName} {voter.lastName}</div>
            <div className="text-xs font-normal text-muted-foreground">
              {voter.precinct?.name ?? "No precinct assigned"}
            </div>
          </div>
        </SheetTitle>
        <SheetDescription className="sr-only">Voter record</SheetDescription>
      </SheetHeader>

      <div className="p-4 space-y-5">
        {/* Contact info */}
        <div className="space-y-1.5 text-sm">
          {voter.phone && (
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <span className="tabular-nums">{voter.phone}</span>
            </div>
          )}
          {voter.email && (
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <span className="truncate">{voter.email}</span>
            </div>
          )}
          {(voter.household?.address || voter.registeredAddress) && (
            <div className="flex items-start gap-2">
              <MapPin className="size-4 text-muted-foreground mt-0.5" />
              <span>{voter.household?.address ?? voter.registeredAddress}</span>
            </div>
          )}
        </div>

        {/* Quick facts */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Fact label="Party" value={<PartyBadge party={voter.partyAffiliation} />} />
          <Fact label="Voter since" value={voter.voterSince ?? "—"} />
          <Fact label="Birth year" value={voter.birthYear ?? "—"} />
          <Fact label="Recent votes" value={`${voter.votedIn2024 ? "✓" : "—"}24 ${voter.votedIn2022 ? "✓" : "—"}22 ${voter.votedIn2020 ? "✓" : "—"}20`} />
        </div>

        {/* Support level */}
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Support Level</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {SUPPORT_LEVELS.map((s) => (
              <button
                key={s.value}
                onClick={() => onUpdate(voter.id, { supportLevel: s.value })}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs border transition-colors",
                  voter.supportLevel === s.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-accent"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm cursor-pointer">
              <HeartHandshake className="size-4 text-violet-500" />
              Recruited as volunteer
            </Label>
            <Switch
              checked={voter.volunteer ?? false}
              onCheckedChange={(v) => onUpdate(voter.id, { volunteer: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm cursor-pointer">
              <MapPin className="size-4 text-amber-500" />
              Yard sign placed
            </Label>
            <Switch
              checked={voter.hasYardSign ?? false}
              onCheckedChange={(v) => onUpdate(voter.id, { hasYardSign: v })}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Field Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdate(voter.id, { notes })}
            placeholder="Issues raised, follow-up reminders, etc."
            className="mt-1.5 min-h-[80px]"
          />
        </div>

        {/* History */}
        {((voter._count?.callLogs ?? 0) + (voter._count?.canvassLogs ?? 0) > 0) && (
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Outreach history</Label>
            <div className="mt-1.5 text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Calls</span>
                <span>{voter._count?.callLogs ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Door knocks</span>
                <span>{voter._count?.canvassLogs ?? 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
