"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Loader2,
  CheckCircle2,
  CalendarCheck,
  Megaphone,
  HandHeart,
  PhoneCall,
  DoorOpen,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CampaignEvent } from "@/lib/types";
import { useApp } from "@/lib/store";
import { CreateEventDialog } from "@/components/events/create-event-dialog";

const TYPE_INFO: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  "town-hall": { label: "Town Hall", icon: Megaphone, color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  "canvass-kickoff": { label: "Canvass Kickoff", icon: DoorOpen, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  "phone-bank": { label: "Phone Bank", icon: PhoneCall, color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  fundraiser: { label: "Fundraiser", icon: HandHeart, color: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  rally: { label: "Rally", icon: Megaphone, color: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  "volunteer-meeting": { label: "Volunteer Meeting", icon: Users, color: "bg-primary/10 text-primary" },
  campaign: { label: "Campaign Event", icon: CalendarCheck, color: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
};

export function EventsView() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const campaignId = useApp((s) => s.currentCampaignId);

  const { data, isLoading } = useQuery({
    queryKey: ["events", campaignId],
    queryFn: async (): Promise<{ items: CampaignEvent[] }> => (await fetch(`/api/events?campaignId=${campaignId}`)).json(),
    enabled: !!campaignId,
  });
  const events: CampaignEvent[] = data?.items ?? [];

  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.startTime).getTime() >= now && e.status === "scheduled")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const past = events
    .filter((e) => new Date(e.startTime).getTime() < now || e.status === "completed")
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // Summary
  const totalRSVPs = events.reduce((s, e) => s + (e.attendeeCount ?? 0), 0);
  const upcomingRSVPs = upcoming.reduce((s, e) => s + (e.attendeeCount ?? 0), 0);

  async function markComplete(id: string) {
    const r = await fetch("/api/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "completed" }),
    });
    if (r.ok) {
      toast({ title: "Marked complete", duration: 1500 });
      qc.invalidateQueries({ queryKey: ["events"] });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CalendarDays} label="Upcoming events" value={upcoming.length} sub="On the schedule" accent="primary" />
        <StatCard icon={CalendarCheck} label="Past events" value={past.length} sub="Completed" accent="emerald" />
        <StatCard icon={Users} label="Total RSVPs" value={totalRSVPs} sub={`${upcomingRSVPs} for upcoming`} accent="violet" />
        <StatCard icon={Megaphone} label="Event types" value={Object.keys(TYPE_INFO).length} sub="Available formats" accent="amber" />
      </div>

      {/* Action bar */}
      <Card className="p-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {events.length} events total · {upcoming.length} upcoming
        </div>
        <CreateEventDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          campaignId={campaignId}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["events"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            toast({ title: "Event created", duration: 1500 });
            setCreateOpen(false);
          }}
        />
      </Card>

      {/* Upcoming events list */}
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Upcoming</div>
        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : upcoming.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No upcoming events. Create one to get started.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {upcoming.map((e) => <EventCard key={e.id} event={e} onComplete={() => markComplete(e.id)} />)}
          </div>
        )}
      </div>

      {/* Past events */}
      {past.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Past</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {past.slice(0, 6).map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onComplete }: { event: CampaignEvent; onComplete?: () => void }) {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : null;
  const type = TYPE_INFO[event.type] ?? TYPE_INFO.campaign;
  const TypeIcon = type.icon;
  const isPast = start.getTime() < Date.now();

  return (
    <Card className={cn("p-4 hover:shadow-md transition-shadow", isPast && "opacity-75")}>
      <div className="flex gap-4">
        {/* Date block */}
        <div className="flex flex-col items-center justify-center min-w-[64px]">
          <div className="text-[10px] uppercase font-medium text-primary">{start.toLocaleString("en-US", { month: "short" })}</div>
          <div className="text-2xl font-bold leading-none tabular-nums">{start.getDate()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{start.toLocaleString("en-US", { weekday: "short" })}</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded", type.color)}>
                  <TypeIcon className="size-3" /> {type.label}
                </span>
                {event.status === "completed" && (
                  <Badge variant="outline" className="text-[10px] py-0 h-4 bg-emerald-50 dark:bg-emerald-950/30">
                    <CheckCircle2 className="size-2.5 mr-0.5" /> Done
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold mt-1.5">{event.title}</h3>
            </div>
            {onComplete && event.status === "scheduled" && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onComplete}>
                Mark done
              </Button>
            )}
          </div>

          {event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatTime(start)}{end ? ` – ${formatTime(end)}` : ""}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {event.location}
              </span>
            )}
            {event.attendeeCount !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {event.attendeeCount} RSVPs
                {event.capacity && ` / ${event.capacity}`}
              </span>
            )}
          </div>

          {event.address && (
            <div className="text-[11px] text-muted-foreground/70 mt-1">{event.address}</div>
          )}
        </div>
      </div>
    </Card>
  );
}
