"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HeartHandshake,
  Phone,
  Mail,
  Clock,
  TrendingUp,
  DoorOpen,
  PhoneCall,
  ListTodo,
  Plus,
  Loader2,
  Star,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { StatCard } from "@/components/common/stat-card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { useVolunteers } from "@/lib/volunteers";
import type { Volunteer } from "@/lib/types";

interface VolunteerRow extends Volunteer {
  _count?: { canvassLogs: number; callLogs: number; assignedTasks: number };
}

const ROLE_INFO: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  coordinator: { label: "Coordinator", color: "bg-violet-500/10 text-violet-700 dark:text-violet-300", icon: Star },
  canvasser: { label: "Canvasser", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: DoorOpen },
  "phone-banker": { label: "Phone Banker", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", icon: PhoneCall },
  designer: { label: "Designer", color: "bg-pink-500/10 text-pink-700 dark:text-pink-300", icon: HeartHandshake },
  data: { label: "Data", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: TrendingUp },
  general: { label: "General", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300", icon: HeartHandshake },
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  lead: { label: "Lead", color: "bg-violet-600 text-white" },
  active: { label: "Active", color: "bg-emerald-600 text-white" },
  inactive: { label: "Inactive", color: "bg-slate-400 text-white" },
};

export function VolunteersView() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const campaignId = useApp((s) => s.currentCampaignId);

  const { data, isLoading } = useVolunteers(campaignId);

  const volunteers: VolunteerRow[] = (data?.items as VolunteerRow[] | undefined) ?? [];
  const filtered = roleFilter === "all" ? volunteers : volunteers.filter((v) => v.role === roleFilter);

  // Summary metrics
  const totalHours = volunteers.reduce((s, v) => s + v.hoursLogged, 0);
  const totalPledged = volunteers.reduce((s, v) => s + (v.hoursPledged ?? 0), 0);
  const active = volunteers.filter((v) => v.status === "active" || v.status === "lead").length;
  const leads = volunteers.filter((v) => v.status === "lead").length;
  const totalDoors = volunteers.reduce((s, v) => s + (v._count?.canvassLogs ?? 0), 0);
  const totalCalls = volunteers.reduce((s, v) => s + (v._count?.callLogs ?? 0), 0);

  async function updateStatus(id: string, status: string) {
    const r = await fetch("/api/volunteers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (r.ok) {
      toast({ title: "Status updated", duration: 1500 });
      qc.invalidateQueries({ queryKey: ["volunteers"] });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={HeartHandshake} label="Active volunteers" value={active} sub={`${leads} team leads`} accent="violet" />
        <StatCard icon={Clock} label="Hours logged" value={totalHours.toFixed(0)} sub={`of ${totalPledged} pledged`} accent="emerald" />
        <StatCard icon={DoorOpen} label="Doors knocked" value={totalDoors} sub="By volunteer team" accent="amber" />
        <StatCard icon={PhoneCall} label="Calls made" value={totalCalls} sub="By volunteer team" accent="cyan" />
      </div>

      {/* Filter + actions */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {Object.entries(ROLE_INFO).map(([key, info]) => (
              <SelectItem key={key} value={key}>{info.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground ml-1">
          {filtered.length} volunteer{filtered.length !== 1 ? "s" : ""}
        </div>
        <Button size="sm" className="ml-auto h-9">
          <Plus className="size-3.5 mr-1" /> Add volunteer
        </Button>
      </Card>

      {/* Volunteer grid */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((v) => {
            const role = ROLE_INFO[v.role] ?? ROLE_INFO.general;
            const status = STATUS_INFO[v.status] ?? STATUS_INFO.inactive;
            const RoleIcon = role.icon;
            const pledgePct = v.hoursPledged && v.hoursPledged > 0
              ? Math.min(100, (v.hoursLogged / v.hoursPledged) * 100)
              : 0;
            return (
              <Card key={v.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <PersonAvatar first={v.firstName} last={v.lastName} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{v.firstName} {v.lastName}</h3>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", status.color)}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded", role.color)}>
                        <RoleIcon className="size-3" /> {role.label}
                      </span>
                      {v.zip && <span className="text-[11px] text-muted-foreground">ZIP {v.zip}</span>}
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="mt-3 space-y-0.5 text-[12px]">
                  {v.email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3" />
                      <span className="truncate">{v.email}</span>
                    </div>
                  )}
                  {v.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="size-3" />
                      <span className="tabular-nums">{v.phone}</span>
                    </div>
                  )}
                </div>

                {/* Hours progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Hours pledge</span>
                    <span className="font-medium tabular-nums">{v.hoursLogged.toFixed(1)} / {v.hoursPledged ?? 0}h</span>
                  </div>
                  <Progress value={pledgePct} className="h-1.5" />
                </div>

                {/* Stats */}
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                  <Stat icon={DoorOpen} value={v._count?.canvassLogs ?? 0} label="Doors" />
                  <Stat icon={PhoneCall} value={v._count?.callLogs ?? 0} label="Calls" />
                  <Stat icon={ListTodo} value={v._count?.assignedTasks ?? 0} label="Tasks" />
                </div>

                {v.skills && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {v.skills.split(",").map((s: string) => (
                      <Badge key={s} variant="outline" className="text-[10px] py-0 h-4">{s}</Badge>
                    ))}
                  </div>
                )}

                {/* Status changer */}
                <Select value={v.status} onValueChange={(s) => updateStatus(v.id, s)}>
                  <SelectTrigger className="h-7 mt-3 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="rounded-md bg-muted/40 py-1.5">
      <Icon className="size-3 mx-auto text-muted-foreground" />
      <div className="text-xs font-semibold tabular-nums mt-0.5">{value}</div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
