import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <CalendarDays className="size-5" />
        </div>

        <div>
          <p className="text-lg font-semibold leading-none">ShiftMate</p>
          <p className="text-sm text-muted-foreground">
            Smart work schedule planner
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/auth/login"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Zaloguj się
        </Link>

        <Link href="/auth/register" className={cn(buttonVariants())}>
          Utwórz konto
        </Link>
      </div>
    </header>
  );
}