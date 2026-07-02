"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Users,
  TrendingUp,
  Search,
  Mail,
  Phone,
  Building2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  RotateCw,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { useCurrentRole } from "@/lib/memberships";
import { PersonAvatar } from "@/components/common/person-avatar";
import { StatCard } from "@/components/common/stat-card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatCompactCurrency, formatCurrency, formatDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSavingAction } from "@/lib/use-saving-action";
import type { Donor, Donation } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CAPACITY_INFO: Record<string, { label: string; color: string }> = {
  major: { label: "Major", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200" },
  mid: { label: "Mid", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200" },
  small: { label: "Small", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200" },
  unknown: { label: "Unknown", color: "bg-muted text-muted-foreground border-border" },
};

const TYPE_INFO: Record<string, string> = {
  individual: "Individual",
  pac: "PAC",
  "small-business": "Small Business",
  family: "Family",
};

export function DonorsView() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [capacity, setCapacity] = useState("all");
  const [type, setType] = useState("all");
  const [recordOpen, setRecordOpen] = useState(false);
  const campaignId = useApp((s) => s.currentCampaignId);
  const role = useCurrentRole();

  const params = new URLSearchParams();
  if (campaignId) params.set("campaignId", campaignId);
  if (q) params.set("q", q);
  if (capacity !== "all") params.set("capacity", capacity);
  if (type !== "all") params.set("type", type);

  const { data, isLoading } = useQuery({
    queryKey: ["donors", params.toString()],
    queryFn: async (): Promise<{ items: Donor[] }> => (await fetch(`/api/donors?${params}`)).json(),
    enabled: !!campaignId,
  });
  const donors: Donor[] = data?.items ?? [];

  const { data: donationsData } = useQuery({
    queryKey: ["all-donations", campaignId],
    queryFn: async (): Promise<{ items: Donation[] }> => (await fetch(`/api/donations?limit=200&campaignId=${campaignId}`)).json(),
    enabled: !!campaignId,
  });
  const recentDonations: Donation[] = donationsData?.items ?? [];

  const totalRaised = donors.reduce((s, d) => s + (d.totalDonatedCents ?? 0), 0);
  const avgGift = donors.length > 0 ? totalRaised / donors.length / 100 : 0;
  const recurringCount = donors.filter((d) => d.isRecurring).length;
  const complianceIssues = recentDonations.filter((d) => !d.complianceVerified).length;

  // Top donors
  const topDonors = [...donors].sort((a, b) => (b.totalDonatedCents ?? 0) - (a.totalDonatedCents ?? 0)).slice(0, 5);

  if (role && role !== "owner") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        You don't have access to donor and donation data.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Total raised" value={formatCompactCurrency(totalRaised)} sub={`${donors.length} donors`} accent="emerald" />
        <StatCard icon={Users} label="Active donors" value={donors.length} sub={`${recurringCount} recurring`} accent="primary" />
        <StatCard icon={TrendingUp} label="Avg gift size" value={formatCurrency(avgGift * 100)} sub="Per donor" accent="amber" />
        <StatCard icon={AlertTriangle} label="Compliance flags" value={complianceIssues} sub="Needs review" accent="rose" />
      </div>

      {/* Top donors strip */}
      {topDonors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Donors</CardTitle>
            <CardDescription className="text-xs">Largest cumulative contributions this cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {topDonors.map((d, i) => {
                const max = topDonors[0].totalDonatedCents ?? 1;
                const pct = ((d.totalDonatedCents ?? 0) / max) * 100;
                return (
                  <div key={d.id} className="flex items-center gap-3">
                    <div className="text-xs font-medium text-muted-foreground w-5">#{i + 1}</div>
                    <PersonAvatar first={d.firstName} last={d.lastName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{d.firstName} {d.lastName}</span>
                        <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatCompactCurrency(d.totalDonatedCents ?? 0)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search donors, employers, emails…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={capacity} onValueChange={setCapacity}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Capacity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All capacities</SelectItem>
            <SelectItem value="major">Major</SelectItem>
            <SelectItem value="mid">Mid</SelectItem>
            <SelectItem value="small">Small</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="pac">PAC</SelectItem>
            <SelectItem value="small-business">Small Business</SelectItem>
            <SelectItem value="family">Family</SelectItem>
          </SelectContent>
        </Select>
        <RecordDonationDialog
          open={recordOpen}
          onOpenChange={setRecordOpen}
          donors={donors}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["donors"] });
            qc.invalidateQueries({ queryKey: ["all-donations"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            toast({ title: "Donation recorded", duration: 1500 });
            setRecordOpen(false);
          }}
        />
      </Card>

      {/* Donor table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5">Donor</th>
                <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Type</th>
                <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">Employer</th>
                <th className="text-right font-medium px-4 py-2.5">Total</th>
                <th className="text-right font-medium px-4 py-2.5 hidden md:table-cell">Gifts</th>
                <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">Last gift</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              )}
              {!isLoading && donors.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No donors match these filters.</td></tr>
              )}
              {donors.map((d) => {
                const cap = CAPACITY_INFO[d.capacity] ?? CAPACITY_INFO.unknown;
                return (
                  <tr key={d.id} className="border-b last:border-b-0 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <PersonAvatar first={d.firstName} last={d.lastName} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium truncate flex items-center gap-1.5">
                            {d.firstName} {d.lastName}
                            {d.isRecurring && <RotateCw className="size-3 text-emerald-500" />}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {d.email ?? d.phone ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn("text-[10px] py-0 h-4 border", cap.color)}>{cap.label}</Badge>
                        <span className="text-[11px] text-muted-foreground">{TYPE_INFO[d.type] ?? d.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <div className="text-[12px]">
                        {d.employer && d.employer !== "—" ? (
                          <span className="flex items-center gap-1"><Building2 className="size-3 text-muted-foreground" />{d.employer}</span>
                        ) : "—"}
                      </div>
                      {d.occupation && <div className="text-[10px] text-muted-foreground">{d.occupation}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {formatCurrency(d.totalDonatedCents ?? 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                      {d.donationCount ?? 0}
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-[11px] text-muted-foreground">
                      {d.lastDonationDate ? formatDate(d.lastDonationDate) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent donations feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Donations</CardTitle>
          <CardDescription className="text-xs">Latest gifts received</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentDonations.slice(0, 12).map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded hover:bg-accent/30">
                <PersonAvatar first={d.donor?.firstName} last={d.donor?.lastName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {d.donor ? `${d.donor.firstName} ${d.donor.lastName}` : "Unknown donor"}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3" />
                    {formatDate(d.donationDate)}
                    <span>·</span>
                    <span className="uppercase">{d.method}</span>
                    {d.inKindDescription && <><span>·</span><span>{d.inKindDescription}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.complianceVerified ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-amber-500" />
                  )}
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    +{formatCurrency(d.amountCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecordDonationDialog({ open, onOpenChange, donors, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  donors: Donor[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { saving, run } = useSavingAction();
  const [donorId, setDonorId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("online");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [compliance, setCompliance] = useState(true);
  const [notes, setNotes] = useState("");

  async function save() {
    if (!donorId || !amount) {
      toast({ title: "Donor and amount required", variant: "destructive" });
      return;
    }
    const dollars = parseFloat(amount);
    if (isNaN(dollars) || dollars <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    const donor = donors.find((d) => d.id === donorId);
    await run(
      () => fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorId,
          campaignId: donor?.campaignId,
          amountCents: Math.round(dollars * 100),
          method,
          donationDate: new Date(date).toISOString(),
          complianceVerified: compliance,
          notes,
        }),
      }),
      {
        failTitle: "Failed to record donation",
        onSuccess: () => {
          setDonorId(""); setAmount(""); setMethod("online"); setNotes("");
          setCompliance(true);
          onSaved();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 ml-auto">
          <Plus className="size-3.5 mr-1" /> Record donation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a donation</DialogTitle>
          <DialogDescription>Log a contribution for compliance and reporting.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Donor</Label>
            <Select value={donorId} onValueChange={setDonorId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select donor" />
              </SelectTrigger>
              <SelectContent>
                {donors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName} · {d.capacity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (USD)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50.00" className="mt-1" type="number" />
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="in-kind">In-kind</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="mt-1" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs pb-2">
                <input type="checkbox" checked={compliance} onChange={(e) => setCompliance(e.target.checked)} />
                Compliance verified
              </label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Earmark, in-kind description…" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            Save donation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
