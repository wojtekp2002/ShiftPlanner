import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const proofPoints = [
  "Dostępność bez arkuszy i wiadomości",
  "Obsada widoczna zanim pojawią się braki",
  "Grafik gotowy do spokojnej publikacji",
];

const stats = [
  ["1 rytm", "dla całego tygodnia pracy"],
  ["0 chaosu", "w zbieraniu dostępności"],
  ["pełna obsada", "zanim grafik trafi do zespołu"],
];

export function LandingHero() {
  return (
    <div className="landing-enter max-w-3xl">
      <Badge
        variant="secondary"
        className="mb-6 h-7 rounded-full border border-[#d7c8b2]/70 bg-[#fffaf1]/80 px-3 text-foreground shadow-sm backdrop-blur"
      >
        Premium workforce planning · zaprojektowane dla spokojnego zarządzania
      </Badge>

      <h1 className="text-balance font-serif text-4xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
        Harmonijny grafik pracy dla zespołów, które cenią porządek.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
        Ordo porządkuje dostępność, potrzeby obsady i publikację zmian w jednym
        eleganckim procesie. Mniej ręcznego dopinania grafiku, więcej jasności
        dla managera i zespołu.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/auth/register"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-12 rounded-full bg-primary px-6 text-base text-primary-foreground shadow-[0_18px_45px_rgba(86,66,46,0.22)] hover:bg-primary/90"
          )}
        >
          Zacznij planować
          <ArrowRight className="size-4" />
        </Link>

        <Link
          href="/auth/login"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-12 rounded-full border-[#d7c8b2]/80 bg-[#fffaf1]/65 px-6 text-base backdrop-blur hover:bg-[#fffaf1]"
          )}
        >
          Zobacz doświadczenie
        </Link>
      </div>

      <div className="mt-8 grid gap-3 text-sm text-foreground/80 sm:grid-cols-3">
        {proofPoints.map((point) => (
          <div key={point} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#a77f45]" />
            <span>{point}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[#d7c8b2]/65 bg-[#d7c8b2]/65">
        {stats.map(([value, label]) => (
          <div key={value} className="bg-[#fffaf1]/75 p-4 backdrop-blur">
            <p className="font-serif text-xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
