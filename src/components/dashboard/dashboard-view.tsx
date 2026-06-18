"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DashboardMetrics } from "@/lib/types";
import { StatCard } from "@/components/common/stat-card";
import { FundraisingBar } from "@/components/common/fundraising-bar";
import { PersonAvatar } from "@/components/common/person-avatar";
import { SupportBadge } from "@/components/common/badges";
import {
  Users,
  HeartHandshake,
  DollarSign,
  DoorOpen,
  PhoneCall,
  CalendarDays,
  ListTodo,
  CheckCircle2,
  TrendingUp,
  Vote,
  Clock,
  MapPin,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCompactCurrency, formatCurrency, formatDate, formatTime, relativeTime } from "@/lib/format";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

export function DashboardView() {
  const { data, isLoading, isError, refetch } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Failed to load dashboard.</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-3">Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysToElection = Math.max(0, Math.ceil((new Date(data.campaign.electionDate).getTime() - Date.now()) / 86_400_000));
  const supportPct = data.totals.voters > 0 ? (data.totals.supporters / data.totals.voters) * 100 : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Campaign header */}
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary/8 via-emerald-500/4 to-transparent">
          <CardContent className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30 text-primary">
                  {data.campaign.party ?? "Nonpartisan"}
                </Badge>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                  {data.campaign.district}
                </Badge>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                {data.campaign.candidateName}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.campaign.officeSought} · Election {formatDate(data.campaign.electionDate)}
              </p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <div className="text-3xl font-bold tabular-nums text-primary">{daysToElection}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Days to election</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-border" />
              <div className="hidden sm:block text-center">
                <div className="text-2xl font-semibold tabular-nums">{data.totals.supporters}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Supporters</div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Users}
          label="Registered voters"
          value={data.totals.voters.toLocaleString()}
          sub={`${data.totals.votersContacted} contacted`}
          accent="primary"
        />
        <StatCard
          icon={HeartHandshake}
          label="Volunteers"
          value={data.totals.volunteers}
          sub="Active this cycle"
          accent="emerald"
        />
        <StatCard
          icon={DollarSign}
          label="Total raised"
          value={formatCompactCurrency(data.totals.raisedCents)}
          sub={`${data.totals.donors} donors · ${data.totals.donations} gifts`}
          accent="amber"
        />
        <StatCard
          icon={DoorOpen}
          label="Doors knocked"
          value={data.totals.canvassDoors}
          sub="Across all precincts"
          accent="violet"
        />
        <StatCard
          icon={PhoneCall}
          label="Calls made"
          value={data.totals.callsMade}
          sub="Phone bank outreach"
          accent="cyan"
        />
        <StatCard
          icon={ListTodo}
          label="Open tasks"
          value={data.totals.tasksOpen}
          sub={`${data.totals.events} events scheduled`}
          accent="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fundraising progress */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Fundraising Progress</CardTitle>
                <CardDescription className="text-xs">
                  {formatCurrency(data.fundraising.raisedCents)} raised of {formatCurrency(data.fundraising.goalCents)} goal
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">{data.fundraising.percent.toFixed(1)}%</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <FundraisingBar
              raised={data.fundraising.raisedCents}
              goal={data.fundraising.goalCents}
            />
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.fundraising.byMethod.map((m) => (
                <div key={m.method} className="rounded-lg border bg-card/60 p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{m.method}</div>
                  <div className="text-sm font-semibold tabular-nums mt-1">
                    {formatCompactCurrency(m.totalCents)}
                  </div>
                </div>
              ))}
            </div>
            {/* Recent donations */}
            <div className="mt-5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Recent donations</div>
              <div className="space-y-1">
                {data.fundraising.recent.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-accent/30 -mx-2">
                    <PersonAvatar first={d.donor?.firstName} last={d.donor?.lastName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        {d.donor ? `${d.donor.firstName} ${d.donor.lastName}` : "Unknown donor"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {d.method}{d.inKindDescription ? ` · ${d.inKindDescription}` : ""} · {relativeTime(d.donationDate)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      +{formatCurrency(d.amountCents)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Support Breakdown</CardTitle>
            <CardDescription className="text-xs">All tracked voters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.outreach.supportBreakdown.map((s) => ({ name: s.level, value: s.count }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={70}
                    paddingAngle={1}
                  >
                    {data.outreach.supportBreakdown.map((s) => {
                      const colors: Record<string, string> = {
                        "strong-support": "oklch(0.55 0.11 155)",
                        "lean-support": "oklch(0.7 0.13 75)",
                        "undecided": "oklch(0.7 0.13 75)",
                        "lean-oppose": "oklch(0.62 0.18 28)",
                        "strong-oppose": "oklch(0.55 0.22 28)",
                        "unknown": "oklch(0.75 0.01 130)",
                      };
                      return <Cell key={s.level} fill={colors[s.level] ?? "oklch(0.7 0.01 130)"} />;
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number, _n, p: any) => [v, p.payload.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {data.outreach.supportBreakdown
                .sort((a, b) => b.count - a.count)
                .map((s) => {
                  const total = data.outreach.supportBreakdown.reduce((acc, x) => acc + x.count, 0);
                  const pct = total > 0 ? (s.count / total) * 100 : 0;
                  return (
                    <div key={s.level} className="flex items-center gap-2 text-xs">
                      <SupportBadge level={s.level} />
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="tabular-nums text-muted-foreground w-8 text-right">{s.count}</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outreach trends */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Outreach Activity — Last 14 days</CardTitle>
            <CardDescription className="text-xs">Daily canvass doors and phone calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.outreach.canvassByDay.map((c, i) => ({
                  day: c.day,
                  Canvass: c.count,
                  Calls: data.outreach.callsByDay[i].count,
                }))}>
                  <defs>
                    <linearGradient id="gCanvass" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.11 155)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="oklch(0.55 0.11 155)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.09 200)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="oklch(0.55 0.09 200)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 130)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={1} stroke="oklch(0.6 0.01 130)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.6 0.01 130)" allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="Canvass" stroke="oklch(0.55 0.11 155)" strokeWidth={2} fill="url(#gCanvass)" />
                  <Area type="monotone" dataKey="Calls" stroke="oklch(0.55 0.09 200)" strokeWidth={2} fill="url(#gCalls)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-600" />Canvass doors</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan-600" />Phone calls</span>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming Events</CardTitle>
            <CardDescription className="text-xs">Next on the schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingEvents.length === 0 && (
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
              )}
              {data.upcomingEvents.map((e) => {
                const d = new Date(e.startTime);
                return (
                  <div key={e.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center pt-0.5">
                      <div className="text-[10px] uppercase font-medium text-primary">{d.toLocaleString("en-US", { month: "short" })}</div>
                      <div className="text-lg font-bold leading-none tabular-nums">{d.getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0 pb-3 border-b last:border-b-0">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <Clock className="size-3" />
                        <span>{formatTime(e.startTime)}</span>
                        {e.location && (
                          <>
                            <MapPin className="size-3 ml-1" />
                            <span className="truncate">{e.location}</span>
                          </>
                        )}
                      </div>
                      {e.attendeeCount !== undefined && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{e.attendeeCount} RSVPs</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription className="text-xs">Latest donations, contacts, and tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.recentActivity.map((a, i) => {
                const Icon =
                  a.kind === "donation" ? DollarSign :
                  a.kind === "canvass" ? DoorOpen :
                  a.kind === "call" ? PhoneCall :
                  a.kind === "event" ? CalendarDays : ListTodo;
                const color =
                  a.kind === "donation" ? "text-emerald-600 bg-emerald-500/10" :
                  a.kind === "canvass" ? "text-violet-600 bg-violet-500/10" :
                  a.kind === "call" ? "text-cyan-600 bg-cyan-500/10" :
                  a.kind === "event" ? "text-amber-600 bg-amber-500/10" :
                  "text-rose-600 bg-rose-500/10";
                return (
                  <div key={i} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded hover:bg-accent/30">
                    <div className={`size-7 rounded-md grid place-items-center ${color}`}>
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{a.label}</div>
                      <div className="text-[11px] text-muted-foreground">{a.sub}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground whitespace-nowrap">{relativeTime(a.at)}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Precinct performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Precinct Performance</CardTitle>
            <CardDescription className="text-xs">Support & contact rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.precincts.map((p) => {
                const supportPct = p.total > 0 ? (p.supporters / p.total) * 100 : 0;
                const contactPct = p.total > 0 ? (p.contacted / p.total) * 100 : 0;
                return (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground tabular-nums">{p.supporters}/{p.total}</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${supportPct}%` }} />
                      </div>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${contactPct}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                      <span>{supportPct.toFixed(0)}% support</span>
                      <span>{contactPct.toFixed(0)}% contacted</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground mt-4 pt-3 border-t">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" />Supporters</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-accent" />Contacted</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="h-28 rounded-xl bg-muted animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 rounded-xl bg-muted animate-pulse" />
        <div className="h-72 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}
