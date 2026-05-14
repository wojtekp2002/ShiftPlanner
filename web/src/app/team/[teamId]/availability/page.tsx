import Link from "next/link";
import { redirect } from "next/navigation";

import {
  addDays,
  getStartOfCurrentWeek,
  isValidISODate,
} from "@/components/availability/availability-utils";
import { InteractiveAvailabilityCalendar } from "@/components/availability/interactive-availability-calendar";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

type AvailabilityPageProps = {
  params: Promise<{
    teamId: string;
  }>;
  searchParams: Promise<{
    week?: string;
  }>;
};

type AvailabilityEntry = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  note: string | null;
};

export default async function AvailabilityPage({
  params,
  searchParams,
}: AvailabilityPageProps) {
  const { teamId } = await params;
  const { week } = await searchParams;

  const weekStartDate =
    week && isValidISODate(week) ? week : getStartOfCurrentWeek();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .single();

  if (!team) {
    redirect("/dashboard");
  }

  const weekEndDateISO = addDays(weekStartDate, 6);
  const previousWeekISO = addDays(weekStartDate, -7);
  const nextWeekISO = addDays(weekStartDate, 7);

  const { data: availabilityData } = await supabase
    .from("availability")
    .select("id, date, start_time, end_time, note")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .gte("date", weekStartDate)
    .lte("date", weekEndDateISO)
    .order("date", { ascending: true });

  const availability = (availabilityData ?? []) as AvailabilityEntry[];

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <section className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <Link
              href={`/team/${teamId}`}
              className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
            >
              ← Wróć do zespołu
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Dostępność
              </h1>

              <Badge variant="secondary">{team.name}</Badge>
              <Badge variant="outline">Rola: {membership.role}</Badge>
            </div>

            <p className="mt-2 text-muted-foreground">
              Kliknij plus przy wybranym dniu albo istniejący blok, aby ustawić
              swoją dostępność.
            </p>
          </div>

          <LogoutButton />
        </header>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div>
            <p className="text-sm text-muted-foreground">Tydzień od</p>
            <p className="font-medium">{weekStartDate}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/team/${teamId}/availability?week=${previousWeekISO}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Poprzedni tydzień
            </Link>

            <Link
              href={`/team/${teamId}/availability?week=${nextWeekISO}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Następny tydzień
            </Link>
          </div>
        </div>

        <InteractiveAvailabilityCalendar
          key={weekStartDate}
          teamId={teamId}
          weekStartDate={weekStartDate}
          initialAvailability={availability}
        />
      </section>
    </main>
  );
}