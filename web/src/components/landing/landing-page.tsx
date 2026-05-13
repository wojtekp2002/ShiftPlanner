import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { SchedulePreviewCard } from "@/components/landing/schedule-preview-card";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <LandingHeader />

        <div className="grid flex-1 items-center gap-10 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <LandingHero />
          <SchedulePreviewCard />
        </div>

        <LandingFeatures />
      </section>
    </main>
  );
}