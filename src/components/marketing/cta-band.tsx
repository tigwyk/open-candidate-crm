import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-16 text-center flex flex-col items-center gap-5">
        <h2 className="text-3xl font-semibold tracking-tight">
          Ready to run your campaign?
        </h2>
        <p className="text-primary-foreground/80 max-w-xl">
          Set up your campaign and start tracking voters, volunteers, and
          donors today.
        </p>
        <Button size="lg" variant="secondary" asChild>
          <Link href="/signup">Start your campaign</Link>
        </Button>
      </div>
    </section>
  );
}
