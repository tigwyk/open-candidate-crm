"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DoorOpen,
  Home,
  UserX,
  Ban,
  Languages,
  CheckCircle2,
  MapPin,
  Loader2,
  ClipboardList,
  TrendingUp,
  Plus,
} from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { SupportBadge } from "@/components/common/badges";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SUPPORT_LEVELS } from "@/lib/types";

const OUTCOME_INFO: Record<string, { label: string; color: string; icon: any }> = {
  canvassed: { label: "Canvassed", color: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300", icon: CheckCircle2 },
  "not-home": { label: "Not home", color: "text-amber-700 bg-amber-500/10 dark:text-amber-300", icon: Home },
  refused: { label: "Refused", color: "text-rose-700 bg-rose-500/10 dark:text-rose-300", icon: Ban },
  "wrong-address": { label: "Wrong address", color: "text-slate-700 bg-slate-500/10 dark:text-slate-300", icon: UserX },
  "language-barrier": { label: "Language barrier", color: "text-violet-700 bg-violet-500/10 dark:text-violet-300", icon: Languages },
};

const ISSUES = ["housing", "schools", "public-safety", "budget", "parks", "transit"];

export function CanvassView() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [logOpen, setLogOpen] = useState(false);

  const params = new URLSearchParams();
  if (outcomeFilter !== "all") params.set("outcome", outcomeFilter);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["canvass-logs", params.toString()],
    queryFn: async () => (await fetch(`/api/canvass?${params}`)).json(),
  });
  const logs: any[] = logsData?.items ?? [];

  const { data: votersData } = useQuery({
    queryKey: ["canvass-voters"],
    queryFn: async () => (await fetch(`/api/voters?limit=200`)).json(),
  });
  const voters: any[] = votersData?.items ?? [];

  const { data: volunteersData } = useQuery({
    queryKey: ["canvass-volunteers"],
    queryFn: async () => (await fetch("/api/volunteers")).json(),
  });
  const volunteers: any[] = volunteersData?.items ?? [];

  // Build walk lists grouped by precinct (top 5 streets to knock)
  const walkLists = (voters || [])
    .filter((v) => v.supportLevel === "undecided" || v.supportLevel === "unknown" || v.supportLevel === "lean-support")
    .reduce<Record<string, any[]>>((acc, v) => {
      const key = v.precinct?.name ?? "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(v);
      return acc;
    }, {});
  const walkListEntries = Object.entries(walkLists).sort((a, b) => b[1].length - a[1].length).slice(0, 5);

  // Summary
  const total = logs.length;
  const canvassed = logs.filter((l) => l.outcome === "canvassed").length;
  const notHome = logs.filter((l) => l.outcome === "not-home").length;
  const refused = logs.filter((l) => l.outcome === "refused").length;
  const contacted = logs.filter((l) => l.outcome === "canvassed").length;
  const yardSigns = logs.filter((l) => l.yardSign).length;
  const contactRate = total > 0 ? (contacted / total) * 100 : 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={DoorOpen} label="Doors knocked" value={total} sub="Total attempts" accent="violet" />
        <SummaryCard icon={CheckCircle2} label="Contact rate" value={`${contactRate.toFixed(0)}%`} sub={`${contacted} reached`} accent="emerald" />
        <SummaryCard icon={Home} label="Not home" value={notHome} sub="Try again later" accent="amber" />
        <SummaryCard icon={MapPin} label="Yard signs placed" value={yardSigns} sub="Via canvass" accent="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Walk lists */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Walk Lists</CardTitle>
            <CardDescription className="text-xs">Priority doors to knock this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {walkListEntries.map(([precinct, list]) => (
                <div key={precinct} className="rounded-lg border p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{precinct}</div>
                      <div className="text-[11px] text-muted-foreground">{list.length} priority doors</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      <ClipboardList className="size-3 mr-1" />
                      {list.filter((v) => v.supportLevel === "undecided").length} undecided
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {list.slice(0, 4).map((v) => (
                      <div key={v.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <MapPin className="size-3" />
                        <span className="flex-1 truncate">{v.household?.address ?? v.registeredAddress}</span>
                        <SupportBadge level={v.supportLevel} />
                      </div>
                    ))}
                    {list.length > 4 && (
                      <div className="text-[11px] text-muted-foreground italic pt-1">
                        + {list.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {walkListEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">No walk lists available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Canvass log table */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Canvass Activity Log</CardTitle>
              <CardDescription className="text-xs">Recent door-knock outcomes</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="All outcomes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All outcomes</SelectItem>
                  {Object.entries(OUTCOME_INFO).map(([k, info]) => (
                    <SelectItem key={k} value={k}>{info.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8" onClick={() => setLogOpen(true)}>
                <Plus className="size-3.5 mr-1" /> Log
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-y-auto scroll-area-thin">
              {isLoading ? (
                <div className="py-12 text-center"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No canvass logs yet.</div>
              ) : (
                logs.map((l) => {
                  const info = OUTCOME_INFO[l.outcome] ?? OUTCOME_INFO["not-home"];
                  const Icon = info.icon;
                  return (
                    <div key={l.id} className="flex items-start gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-accent/30">
                      <div className={cn("size-7 rounded-md grid place-items-center flex-shrink-0", info.color)}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {l.voter ? `${l.voter.firstName} ${l.voter.lastName}` : "Unknown voter"}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{info.label}</Badge>
                          {l.supportLevel && <SupportBadge level={l.supportLevel} />}
                          {l.yardSign && <Badge variant="outline" className="text-[10px] py-0 h-4 bg-amber-50">Yard sign</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          {l.household?.address && <span className="flex items-center gap-0.5"><MapPin className="size-3" />{l.household.address}</span>}
                          {l.voter?.precinct?.name && <span>· {l.voter.precinct.name}</span>}
                          {l.volunteer && <span>· {l.volunteer.firstName} {l.volunteer.lastName}</span>}
                          {l.issuePriority && <span>· issue: {l.issuePriority}</span>}
                        </div>
                        {l.notes && (
                          <div className="text-[11px] mt-1 text-foreground/80 italic bg-muted/30 px-2 py-1 rounded">
                            "{l.notes}"
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground/70 mt-1">{relativeTime(l.contactedAt)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log outcome dialog */}
      <LogCanvassDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        voters={voters}
        volunteers={volunteers}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["canvass-logs"] });
          qc.invalidateQueries({ queryKey: ["canvass-voters"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          toast({ title: "Canvass outcome logged", duration: 1500 });
          setLogOpen(false);
        }}
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string | number; sub: string;
  accent: "violet" | "emerald" | "amber" | "rose";
}) {
  const colors: Record<string, string> = {
    violet: "text-violet-600 bg-violet-500/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    rose: "text-rose-600 bg-rose-500/10",
  };
  return (
    <Card className="p-3 flex items-center gap-2.5">
      <div className={cn("size-9 rounded-md grid place-items-center", colors[accent])}>
        <Icon className="size-4.5" />
      </div>
      <div>
        <div className="text-lg font-semibold tabular-nums leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
        <div className="text-[10px] text-muted-foreground/70">{sub}</div>
      </div>
    </Card>
  );
}

function LogCanvassDialog({ open, onOpenChange, voters, volunteers, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  voters: any[]; volunteers: any[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [voterId, setVoterId] = useState("");
  const [volunteerId, setVolunteerId] = useState("");
  const [outcome, setOutcome] = useState("canvassed");
  const [support, setSupport] = useState("");
  const [yardSign, setYardSign] = useState(false);
  const [issue, setIssue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!voterId) { toast({ title: "Select a voter", variant: "destructive" }); return; }
    setSaving(true);
    const voter = voters.find((v) => v.id === voterId);
    const r = await fetch("/api/canvass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voterId,
        householdId: voter?.householdId,
        volunteerId: volunteerId || undefined,
        campaignId: voter?.campaignId,
        outcome,
        supportLevel: support || undefined,
        yardSign,
        issuePriority: issue || undefined,
        notes,
      }),
    });
    setSaving(false);
    if (r.ok) {
      setVoterId(""); setVolunteerId(""); setOutcome("canvassed");
      setSupport(""); setYardSign(false); setIssue(""); setNotes("");
      onSaved();
    } else {
      toast({ title: "Failed to log", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log canvass outcome</DialogTitle>
          <DialogDescription>Record what happened at the door.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs">Voter</Label>
            <Select value={voterId} onValueChange={setVoterId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select voter" /></SelectTrigger>
              <SelectContent>
                {voters.slice(0, 100).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.firstName} {v.lastName} — {v.household?.address ?? "no address"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Volunteer</Label>
              <Select value={volunteerId} onValueChange={setVolunteerId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {volunteers.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.firstName} {v.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(OUTCOME_INFO).map(([k, info]) => (
                    <SelectItem key={k} value={k}>{info.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {outcome === "canvassed" && (
            <>
              <div>
                <Label className="text-xs">Support level captured</Label>
                <Select value={support} onValueChange={setSupport}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {SUPPORT_LEVELS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Top issue mentioned</Label>
                <Select value={issue} onValueChange={setIssue}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {ISSUES.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={yardSign} onChange={(e) => setYardSign(e.target.checked)} />
                Yard sign requested
              </label>
            </>
          )}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-[60px]" placeholder="Conversation summary, follow-up needed…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            Log outcome
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
