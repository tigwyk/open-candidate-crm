"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ListTodo,
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { StatCard } from "@/components/common/stat-card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { useApp } from "@/lib/store";
import { useVolunteers } from "@/lib/volunteers";
import type { Task, Volunteer } from "@/lib/types";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";

const STATUS_INFO: Record<string, { label: string; color: string; icon: LucideIcon; dot: string }> = {
  todo: { label: "To do", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300", icon: Circle, dot: "bg-slate-400" },
  "in-progress": { label: "In progress", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", icon: Clock, dot: "bg-cyan-500" },
  done: { label: "Done", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2, dot: "bg-emerald-500" },
  blocked: { label: "Blocked", color: "bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: AlertCircle, dot: "bg-rose-500" },
};

const PRIORITY_INFO: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "text-rose-700 bg-rose-500/15 dark:text-rose-300" },
  high: { label: "High", color: "text-amber-700 bg-amber-500/15 dark:text-amber-300" },
  medium: { label: "Medium", color: "text-slate-700 bg-slate-500/15 dark:text-slate-300" },
  low: { label: "Low", color: "text-emerald-700 bg-emerald-500/15 dark:text-emerald-300" },
};

const STATUS_FLOW = ["todo", "in-progress", "done", "blocked"];

export function TasksView() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const campaignId = useApp((s) => s.currentCampaignId);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", campaignId],
    queryFn: async (): Promise<{ items: Task[] }> => (await fetch(`/api/tasks?campaignId=${campaignId}`)).json(),
    enabled: !!campaignId,
  });
  const tasks: Task[] = data?.items ?? [];

  const { data: volunteersData } = useVolunteers(campaignId);
  const volunteers: Volunteer[] = volunteersData?.items ?? [];

  const grouped = STATUS_FLOW.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {} as Record<string, Task[]>);

  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== "done").length;
  const completionRate = tasks.length > 0 ? (grouped.done.length / tasks.length) * 100 : 0;

  async function updateStatus(id: string, status: string) {
    const r = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (r.ok) {
      toast({ title: "Task updated", duration: 1200 });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }

  async function assignVolunteer(id: string, volunteerId: string) {
    const r = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, assignedVolunteerId: volunteerId || null }),
    });
    if (r.ok) {
      toast({ title: "Assignment updated", duration: 1200 });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ListTodo} label="Open tasks" value={tasks.filter((t) => t.status !== "done").length} sub={`${grouped["in-progress"]?.length ?? 0} in progress`} accent="primary" />
        <StatCard icon={CheckCircle2} label="Completed" value={grouped.done.length} sub={`${completionRate.toFixed(0)}% completion`} accent="emerald" />
        <StatCard icon={AlertCircle} label="Overdue" value={overdue} sub="Past due date" accent="rose" />
        <StatCard icon={Clock} label="Blocked" value={grouped.blocked.length} sub="Needs attention" accent="amber" />
      </div>

      {/* Action bar */}
      <Card className="p-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {tasks.length} tasks · {completionRate.toFixed(0)}% complete
        </div>
        <CreateTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          volunteers={volunteers}
          campaignId={campaignId}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["tasks"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            toast({ title: "Task created", duration: 1500 });
            setCreateOpen(false);
          }}
        />
      </Card>

      {/* Kanban-style board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_FLOW.map((status) => {
          const info = STATUS_INFO[status];
          const Icon = info.icon;
          const items = grouped[status] ?? [];
          return (
            <Card key={status} className="flex flex-col">
              <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-6 rounded-md grid place-items-center", info.color)}>
                      <Icon className="size-3.5" />
                    </span>
                    <CardTitle className="text-sm">{info.label}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] py-0 h-4">{items.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px] scroll-area-thin">
                {items.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">No tasks</div>
                )}
                {items.map((t) => {
                  const pri = PRIORITY_INFO[t.priority] ?? PRIORITY_INFO.medium;
                  const overdue = t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== "done";
                  return (
                    <div key={t.id} className="rounded-md border bg-card p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start gap-1.5">
                        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase", pri.color)}>
                          {pri.label}
                        </span>
                        {overdue && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium mt-1.5">{t.title}</div>
                      {t.description && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {t.dueDate && (
                          <span className={cn("flex items-center gap-0.5", overdue && "text-rose-600 dark:text-rose-400 font-medium")}>
                            <Calendar className="size-3" />
                            {formatDate(t.dueDate, { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {t.volunteer && (
                          <span className="flex items-center gap-1 ml-auto">
                            <PersonAvatar first={t.volunteer.firstName} last={t.volunteer.lastName} size="sm" />
                          </span>
                        )}
                      </div>

                      {/* Status switcher */}
                      <div className="mt-2 flex gap-1">
                        {STATUS_FLOW.map((s) => {
                          const sInfo = STATUS_INFO[s];
                          const active = t.status === s;
                          return (
                            <button
                              key={s}
                              onClick={() => updateStatus(t.id, s)}
                              title={sInfo.label}
                              className={cn(
                                "flex-1 h-1.5 rounded-full transition-colors",
                                active ? sInfo.dot : "bg-muted hover:bg-muted-foreground/30"
                              )}
                            />
                          );
                        })}
                      </div>

                      {/* Assign */}
                      {t.assignedVolunteerId && (
                        <Select value={t.assignedVolunteerId} onValueChange={(v) => assignVolunteer(t.id, v)}>
                          <SelectTrigger className="h-7 mt-2 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {volunteers.map((v) => (
                              <SelectItem key={v.id} value={v.id}>{v.firstName} {v.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
