import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHero() {
  return (
    <div>
      <Badge variant="secondary" className="mb-6">
        MVP in progress
      </Badge>

      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        Grafik pracy tworzony szybciej, czytelniej i z mniejszym chaosem.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
        ShiftMate pomaga managerom zbierać dostępność pracowników, generować
        propozycje grafików i publikować zmiany tak, aby każdy widział dokładnie
        to, co powinien.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/auth/register"
          className={cn(buttonVariants({ size: "lg" }), "gap-2")}
        >
          Utwórz zespół
          <ArrowRight className="size-4" />
        </Link>

        <Link
          href="/auth/register"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Dołącz przez kod
        </Link>
      </div>
    </div>
  );
}