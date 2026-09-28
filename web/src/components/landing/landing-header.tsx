import Image from "next/image";
import Link from "next/link";
import { LogIn } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  return (
    <header className="relative z-20 overflow-hidden rounded-[2rem] border border-[#d7c8b2]/60 bg-[#fffaf1]/78 px-4 py-3 shadow-[0_20px_80px_rgba(64,47,31,0.08)] backdrop-blur-xl sm:px-5">
      <Image
        src="/ordo-mark-generated.png"
        alt=""
        width={112}
        height={112}
        className="pointer-events-none absolute -left-6 -top-9 size-28 object-contain opacity-[0.09]"
        priority
      />

      <div className="relative flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Ordo">
          <Image
            src="/ordo-mark-generated.png"
            alt=""
            width={34}
            height={34}
            className="size-8 object-contain"
            priority
          />

          <div className="flex items-baseline gap-3">
            <span className="font-serif text-2xl font-semibold leading-none tracking-tight">
              Ordo
            </span>
            <span className="hidden text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground md:inline">
              Workforce rhythm
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
          <a href="#platforma" className="transition hover:text-foreground">
            Platforma
          </a>
          <a href="#proces" className="transition hover:text-foreground">
            Proces
          </a>
          <a href="#zespoly" className="transition hover:text-foreground">
            Zespoły
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "hidden rounded-full px-4 sm:inline-flex"
            )}
          >
            Zaloguj się
          </Link>

          <Link
            href="/auth/login"
            aria-label="Zaloguj się"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "rounded-full sm:hidden"
            )}
          >
            <LogIn className="size-4" />
          </Link>

          <Link
            href="/auth/register"
            className={cn(
              buttonVariants(),
              "rounded-full bg-foreground px-4 text-background shadow-sm hover:bg-foreground/90"
            )}
          >
            Start
          </Link>
        </div>
      </div>
    </header>
  );
}
