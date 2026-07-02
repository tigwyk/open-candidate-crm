"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  Users,
  Megaphone,
  HandHeart,
  PhoneCall,
  DoorOpen,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSavingAction } from "@/lib/use-saving-action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_INFO: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  "town-hall": { label: "Town Hall", icon: Megaphone, color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  "canvass-kickoff": { label: "Canvass Kickoff", icon: DoorOpen, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  "phone-bank": { label: "Phone Bank", icon: PhoneCall, color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  fundraiser: { label: "Fundraiser", icon: HandHeart, color: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  rally: { label: "Rally", icon: Megaphone, color: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  "volunteer-meeting": { label: "Volunteer Meeting", icon: Users, color: "bg-primary/10 text-primary" },
  campaign: { label: "Campaign Event", icon: CalendarCheck, color: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
};

export function CreateEventDialog({ open, onOpenChange, campaignId, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; campaignId: string | null; onSaved: () => void;
}) {
  const { toast } = useToast();
  const { saving, run } = useSavingAction();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("campaign");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("90");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");

  async function save() {
    if (!title || !date || !time) {
      toast({ title: "Title, date, and time required", variant: "destructive" });
      return;
    }
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + (parseInt(duration) || 90) * 60_000);

    await run(
      () => fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          location,
          address,
          capacity: capacity ? parseInt(capacity) : null,
          description,
          campaignId,
        }),
      }),
      {
        failTitle: "Failed to create event",
        onSuccess: () => {
          setTitle(""); setType("campaign"); setDate(""); setTime("");
          setDuration("90"); setLocation(""); setAddress("");
          setCapacity(""); setDescription("");
          onSaved();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5 mr-1" /> New event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a new event</DialogTitle>
          <DialogDescription>Town halls, canvass kickoffs, rallies, and more.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="District 4 Town Hall" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_INFO).map(([k, info]) => (
                  <SelectItem key={k} value={k}>{info.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Start time</Label>
              <Input value={time} onChange={(e) => setTime(e.target.value)} type="time" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Duration (min)</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Community Center" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Capacity</Label>
              <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} type="number" placeholder="50" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[60px]" placeholder="What's this event about?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            Create event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
