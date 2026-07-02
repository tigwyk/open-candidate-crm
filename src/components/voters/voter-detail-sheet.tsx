"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  HeartHandshake,
} from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { PartyBadge } from "@/components/common/badges";
import { SUPPORT_LEVELS, SUPPORT_SOURCE_LABELS, type Voter } from "@/lib/types";
import { cn } from "@/lib/utils";
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

export function VoterDetailSheet({
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
          {voter.supportLevelSource && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Last set via {SUPPORT_SOURCE_LABELS[voter.supportLevelSource] ?? voter.supportLevelSource}
            </p>
          )}
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
