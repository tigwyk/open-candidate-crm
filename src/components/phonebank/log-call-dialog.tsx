"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PhoneOff,
  Voicemail,
  PhoneMissed,
  Loader2,
  CheckCircle2,
  PhoneForwarded,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SUPPORT_LEVELS, type CallLog, type Voter, type Volunteer } from "@/lib/types";
import { useSavingAction } from "@/lib/use-saving-action";

interface VoterWithExtras extends Voter {
  precinct?: { name: string } | null;
}

const OUTCOME_INFO: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  contacted: { label: "Contacted", color: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300", icon: CheckCircle2 },
  "no-answer": { label: "No answer", color: "text-slate-700 bg-slate-500/10 dark:text-slate-300", icon: PhoneOff },
  voicemail: { label: "Voicemail", color: "text-amber-700 bg-amber-500/10 dark:text-amber-300", icon: Voicemail },
  "wrong-number": { label: "Wrong number", color: "text-rose-700 bg-rose-500/10 dark:text-rose-300", icon: PhoneMissed },
  refused: { label: "Refused", color: "text-rose-700 bg-rose-500/10 dark:text-rose-300", icon: PhoneOff },
  "call-back": { label: "Call back later", color: "text-cyan-700 bg-cyan-500/10 dark:text-cyan-300", icon: PhoneForwarded },
};

const ISSUES = ["housing", "schools", "public-safety", "budget", "parks", "transit"];

export function LogCallDialog({ open, onOpenChange, voters, volunteers, defaultVoterId, volunteerId, onSaved }: {
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
