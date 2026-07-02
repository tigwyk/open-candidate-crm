import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface RunOptions {
  onSuccess?: () => void;
  failTitle?: string;
  /** Override the default failure toast, e.g. to read an error message out of the response body. */
  onError?: (r: Response) => void | Promise<void>;
}

/**
 * Generic skeleton behind the "save dialog" pattern repeated across the app:
 * flip a saving flag, run a fetch, toast on failure, call onSuccess on
 * success. Field state, validation, and reset lists stay in each dialog.
 */
export function useSavingAction() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  async function run(action: () => Promise<Response>, opts?: RunOptions): Promise<boolean> {
    setSaving(true);
    const r = await action();
    setSaving(false);
    if (r.ok) {
      opts?.onSuccess?.();
    } else if (opts?.onError) {
      await opts.onError(r);
    } else {
      toast({ title: opts?.failTitle ?? "Something went wrong", variant: "destructive" });
    }
    return r.ok;
  }

  return { saving, run };
}
