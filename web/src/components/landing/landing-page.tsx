import Image from "next/image";

import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { SchedulePreviewCard } from "@/components/landing/schedule-preview-card";

export function LandingPage() {
  return (
    <main className="landing-surface relative min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <Image
          src="/ordo-mark-generated.png"
          alt=""
          width={512}
          height={512}
          className="pointer-events-none absolute -right-32 top-24 z-0 hidden w-[32rem] opacity-[0.045] lg:block"
          priority
        />
        <div className="landing-orbit landing-orbit-one" />
        <div className="landing-orbit landing-orbit-two" />
        <LandingHeader />

        <div className="relative z-10 grid flex-1 items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
          <LandingHero />
          <SchedulePreviewCard />
        </div>

        <div id="platforma">
          <LandingFeatures />
        </div>
      </section>
    </main>
  );
}
