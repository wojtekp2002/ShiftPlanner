import { ArrowRight, Link } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
        <Link href="/auth/register">
            <Button size="lg" className="gap-2">
                Utwórz zespół
            <ArrowRight className="size-4" />
            </Button>
        </Link>

        <Link href="/auth/register">
            <Button size="lg" variant="outline">
                Dołącz przez kod
            </Button>
        </Link>
      </div>
      
    </div>
  );
}