"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSavingAction } from "@/lib/use-saving-action";
import type { Donor } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RecordDonationDialog({ open, onOpenChange, donors, onSaved }: {
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
