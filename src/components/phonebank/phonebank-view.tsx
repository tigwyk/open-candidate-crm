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
  PhoneCall,
  PhoneOff,
  Voicemail,
  PhoneMissed,
  Phone,
  Loader2,
  Clock,
  CheckCircle2,
  Plus,
  Quote,
  PhoneForwarded,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { SupportBadge } from "@/components/common/badges";
import { StatCard } from "@/components/common/stat-card";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { relativeTime } from "@/lib/format";
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
import { SUPPORT_LEVELS, type CallLog, type Voter, type Volunteer } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useClaims } from "@/lib/claims";
import { useVoters } from "@/lib/voters";
import { useVolunteers } from "@/lib/volunteers";
import { useSavingAction } from "@/lib/use-saving-action";

interface VoterWithExtras extends Voter {
  precinct?: { name: string } | null;
}

interface CallLogRow extends CallLog {
  voter?: (CallLog["voter"] & { phone?: string | null; precinct?: { name: string } | null }) | null;
}

const OUTCOME_INFO: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  contacted: { label: "Contacted", color: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300", icon: CheckCircle2 },
  "no-answer": { label: "No answer", color: "text-slate-700 bg-slate-500/10 dark:text-slate-300", icon: PhoneOff },
  voicemail: { label: "Voicemail", color: "text-amber-700 bg-amber-500/10 dark:text-amber-300", icon: Voicemail },
  "wrong-number": { label: "Wrong number", color: "text-rose-700 bg-rose-500/10 dark:text-rose-300", icon: PhoneMissed },
  refused: { label: "Refused", color: "text-rose-700 bg-rose-500/10 dark:text-rose-300", icon: PhoneOff },
  "call-back": { label: "Call back later", color: "text-cyan-700 bg-cyan-500/10 dark:text-cyan-300", icon: PhoneForwarded },
};

const CALL_SCRIPT = `Hi, is this {firstName}?

This is {volunteerFirstName} calling from the Jordan Avery for City Council campaign — I'll just take a minute of your time.

Election Day is coming up on November 4th, and Jordan is running to make sure District 4 has a stronger voice on housing, schools, and neighborhood safety.

Can we count on your support?

(If yes) Thank you so much — would you like a yard sign, or want to volunteer?

(If undecided) What issues matter most to your household this year?`;

const ISSUES = ["housing", "schools", "public-safety", "budget", "parks", "transit"];

export function PhoneBankView() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [logOpen, setLogOpen] = useState(false);
  const [queueIdx, setQueueIdx] = useState(0);
  const [activeVolunteerId, setActiveVolunteerId] = useState("");
  const campaignId = useApp((s) => s.currentCampaignId);

  const params = new URLSearchParams();
  if (campaignId) params.set("campaignId", campaignId);
  if (outcomeFilter !== "all") params.set("outcome", outcomeFilter);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["call-logs", params.toString()],
    queryFn: async (): Promise<{ items: CallLogRow[] }> => (await fetch(`/api/calls?${params}`)).json(),
    enabled: !!campaignId,
    refetchInterval: 10_000,
  });
  const logs: CallLogRow[] = logsData?.items ?? [];

  const { data: votersData } = useVoters(campaignId, { limit: "200" }, { refetchInterval: 10_000 });
  const voters: VoterWithExtras[] = votersData?.items ?? [];

  const { data: volunteersData } = useVolunteers(campaignId);
  const volunteers: Volunteer[] = volunteersData?.items ?? [];

  const { claimedByOthers, claim, release } = useClaims("call", campaignId, activeVolunteerId);

  // Build call queue: prioritize undecided + low-contact voters, excluding
  // voters actively being called by someone else
  const callQueue = (voters || [])
    .filter((v) => v.phone && (v.supportLevel === "undecided" || v.supportLevel === "lean-support" || v.supportLevel === "unknown"))
    .filter((v) => !claimedByOthers.has(v.id))
    .slice(0, 20);

  const currentVoter = callQueue[queueIdx];

  // Claim the current voter while it's active; release it when it changes
  // or this view unmounts, so other phone-bankers don't duplicate the call.
  useEffect(() => {
    if (!currentVoter || !activeVolunteerId) return;
    let cancelled = false;
    claim(currentVoter.id, activeVolunteerId).then(async (r) => {
      if (cancelled) return;
      if (r.status === 409) {
        const body = await r.json();
        toast({ title: `Already claimed by ${body.claimedBy}, skipping`, duration: 2000 });
        setQueueIdx((i) => Math.min(callQueue.length - 1, i + 1));
      }
    });
    return () => {
      cancelled = true;
      release(currentVoter.id, activeVolunteerId);
    };
  }, [currentVoter?.id, activeVolunteerId]);

  // Summary
  const total = logs.length;
  const contacted = logs.filter((l) => l.outcome === "contacted").length;
  const noAnswer = logs.filter((l) => l.outcome === "no-answer").length;
  const voicemail = logs.filter((l) => l.outcome === "voicemail").length;
  const avgLen = logs.filter((l) => l.callLengthSec > 0).reduce((s, l) => s + l.callLengthSec, 0) /
    Math.max(1, logs.filter((l) => l.callLengthSec > 0).length);
  const contactRate = total > 0 ? (contacted / total) * 100 : 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Who's calling */}
      <div className="flex items-center gap-2">
        <Label className="text-xs whitespace-nowrap">Calling as</Label>
        <Select value={activeVolunteerId} onValueChange={setActiveVolunteerId}>
          <SelectTrigger className="h-8 w-[220px] text-xs">
            <SelectValue placeholder="Select yourself…" />
          </SelectTrigger>
          <SelectContent>
            {volunteers.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.firstName} {v.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={PhoneCall} label="Calls made" value={total} sub={`${contacted} connected`} accent="cyan" />
        <StatCard icon={CheckCircle2} label="Contact rate" value={`${contactRate.toFixed(0)}%`} sub="Pickup / dial" accent="emerald" />
        <StatCard icon={PhoneOff} label="No answer" value={noAnswer} sub="Try evening hours" accent="amber" />
        <StatCard icon={Clock} label="Avg call length" value={`${Math.floor(avgLen / 60)}:${String(Math.round(avgLen % 60)).padStart(2, "0")}`} sub="Connected calls" accent="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active call panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="size-4 text-primary" />
              Call Queue
            </CardTitle>
            <CardDescription className="text-xs">Next voter to dial</CardDescription>
          </CardHeader>
          <CardContent>
            {!activeVolunteerId ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <PhoneCall className="size-8 mx-auto mb-2 opacity-50" />
                Select who's calling to start the queue
              </div>
            ) : currentVoter ? (
              <div>
                <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <PersonAvatar first={currentVoter.firstName} last={currentVoter.lastName} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{currentVoter.firstName} {currentVoter.lastName}</div>
                      <div className="text-xs text-muted-foreground">{currentVoter.precinct?.name ?? "—"}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground" />
                      <span className="tabular-nums">{currentVoter.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Party:</span>
                      <Badge variant="outline" className="text-[10px] py-0 h-4">{currentVoter.partyAffiliation ?? "—"}</Badge>
                      <span className="text-muted-foreground ml-2">Support:</span>
                      <SupportBadge level={currentVoter.supportLevel} />
                    </div>
                  </div>
                </div>

                {/* Script preview */}
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    <Quote className="size-3" /> Script
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-[12px] leading-relaxed text-foreground/80 max-h-40 overflow-y-auto scroll-area-thin whitespace-pre-wrap">
                    {CALL_SCRIPT.replace(/\{firstName\}/g, currentVoter.firstName).replace(/\{volunteerFirstName\}/g, "Maya")}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => setLogOpen(true)}
                  >
                    <Plus className="size-3.5 mr-1" /> Log outcome
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQueueIdx((i) => Math.min(callQueue.length - 1, i + 1))}
                  >
                    Skip →
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground text-center mt-2">
                  {queueIdx + 1} of {callQueue.length} in queue
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <PhoneCall className="size-8 mx-auto mb-2 opacity-50" />
                Queue empty
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call log table */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Call Log</CardTitle>
              <CardDescription className="text-xs">Recent phone bank outcomes</CardDescription>
            </div>
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
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto scroll-area-thin">
              {isLoading ? (
                <div className="py-12 text-center"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No calls logged yet.</div>
              ) : (
                logs.map((l) => {
                  const info = OUTCOME_INFO[l.outcome] ?? OUTCOME_INFO["no-answer"];
                  const Icon = info.icon;
                  return (
                    <div key={l.id} className="flex items-start gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-accent/30">
                      <div className={cn("size-7 rounded-md grid place-items-center flex-shrink-0", info.color)}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {l.voter ? `${l.voter.firstName} ${l.voter.lastName}` : "Unknown"}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{info.label}</Badge>
                          {l.supportLevel && <SupportBadge level={l.supportLevel} />}
                          {l.callLengthSec > 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {Math.floor(l.callLengthSec / 60)}:{String(l.callLengthSec % 60).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          {l.voter?.phone && <span className="font-mono">{l.voter.phone}</span>}
                          {l.voter?.precinct?.name && <span>· {l.voter.precinct.name}</span>}
                          {l.volunteer && <span>· {l.volunteer.firstName} {l.volunteer.lastName}</span>}
                          {l.issuePriority && <span>· issue: {l.issuePriority}</span>}
                        </div>
                        {l.notes && (
                          <div className="text-[11px] mt-1 text-foreground/80 italic bg-muted/30 px-2 py-1 rounded">
                            "{l.notes}"
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground/70 mt-1">{relativeTime(l.calledAt)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <LogCallDialog
        key={currentVoter?.id ?? "manual"}
        open={logOpen}
        onOpenChange={setLogOpen}
        voters={currentVoter ? [currentVoter, ...voters] : voters}
        volunteers={volunteers}
        defaultVoterId={currentVoter?.id}
        volunteerId={activeVolunteerId}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["call-logs"] });
          qc.invalidateQueries({ queryKey: ["voters"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          toast({ title: "Call outcome logged", duration: 1500 });
          setLogOpen(false);
          setQueueIdx((i) => Math.min(callQueue.length - 1, i + 1));
        }}
      />
    </div>
  );
}

function LogCallDialog({ open, onOpenChange, voters, volunteers, defaultVoterId, volunteerId, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  voters: VoterWithExtras[]; volunteers: Volunteer[];
  defaultVoterId?: string;
  volunteerId?: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { saving, run } = useSavingAction();
  const [voterId, setVoterId] = useState(defaultVoterId ?? "");
  const [outcome, setOutcome] = useState("contacted");
  const [support, setSupport] = useState("");
  const [issue, setIssue] = useState("");
  const [callLength, setCallLength] = useState("");
  const [notes, setNotes] = useState("");

  async function save() {
    if (!voterId) { toast({ title: "Select a voter", variant: "destructive" }); return; }
    const voter = voters.find((v) => v.id === voterId);
    await run(
      () => fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterId,
          volunteerId: volunteerId || undefined,
          campaignId: voter?.campaignId,
          outcome,
          supportLevel: support || undefined,
          issuePriority: issue || undefined,
          callLengthSec: callLength ? parseInt(callLength) : 0,
          notes,
        }),
      }),
      {
        failTitle: "Failed to log",
        onSuccess: () => {
          setVoterId(""); setOutcome("contacted");
          setSupport(""); setIssue(""); setCallLength(""); setNotes("");
          onSaved();
        },
      }
    );
  }

  const activeVolunteer = volunteers.find((v) => v.id === volunteerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log call outcome</DialogTitle>
          <DialogDescription>Record what happened on this call.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs">Voter</Label>
            <Select value={voterId} onValueChange={setVoterId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select voter" /></SelectTrigger>
              <SelectContent>
                {voters.slice(0, 100).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.firstName} {v.lastName} — {v.phone ?? "no phone"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Logging as</Label>
              <div className="mt-1 h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
                {activeVolunteer ? `${activeVolunteer.firstName} ${activeVolunteer.lastName}` : "—"}
              </div>
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
          {outcome === "contacted" && (
            <>
              <div>
                <Label className="text-xs">Support level captured</Label>
                <Select value={support} onValueChange={setSupport}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {SUPPORT_LEVELS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Top issue</Label>
                  <Select value={issue} onValueChange={setIssue}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                        {ISSUES.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Call length (sec)</Label>
                  <input
                    type="number"
                    value={callLength}
                    onChange={(e) => setCallLength(e.target.value)}
                    placeholder="120"
                    className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
                  />
                </div>
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-[60px]" placeholder="Conversation notes…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            Log call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
