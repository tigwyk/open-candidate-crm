"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
import { useSavingAction } from "@/lib/use-saving-action";
import type { Volunteer } from "@/lib/types";

export function CreateTaskDialog({ open, onOpenChange, volunteers, campaignId, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  volunteers: Volunteer[]; campaignId: string | null; onSaved: () => void;
}) {
  const { toast } = useToast();
  const { saving, run } = useSavingAction();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedVolunteerId, setAssignedVolunteerId] = useState("");

  async function save() {
    if (!title) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    await run(
      () => fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assignedVolunteerId: assignedVolunteerId || null,
          campaignId,
        }),
      }),
      {
        failTitle: "Failed to create task",
        onSuccess: () => {
          setTitle(""); setDescription(""); setPriority("medium");
          setDueDate(""); setAssignedVolunteerId("");
          onSaved();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5 mr-1" /> New task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a task</DialogTitle>
          <DialogDescription>Track work, assignments, and deadlines.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Print walk-list packets" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[60px]" placeholder="Details, links, deliverables…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Due date</Label>
              <Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Assign to volunteer</Label>
            <Select value={assignedVolunteerId} onValueChange={setAssignedVolunteerId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {volunteers.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.firstName} {v.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
