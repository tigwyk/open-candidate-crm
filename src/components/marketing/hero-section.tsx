import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="bg-civic-grid border-b">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-20 md:py-28 text-center flex flex-col items-center gap-6">
        <Badge variant="outline" className="text-xs">
          Built for local races, not federal PACs
        </Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-3xl">
          The campaign CRM built for city council, school board, and mayor
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Track voters, volunteers, and donors in one place — without the bloat
          of a generic sales CRM built for someone else&apos;s campaign.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Button size="lg" asChild>
            <Link href="/signup">Start your campaign</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
