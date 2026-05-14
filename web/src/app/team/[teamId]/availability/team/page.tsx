import Link from "next/link";
import { redirect } from "next/navigation";

import {
  addDays,
  getStartOfCurrentWeek,
  isValidISODate,
} from "@/components/availability/availability-utils";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  type CalendarEvent,
  WeeklyCalendar,
} from "@/components/calendar/weekly-calendar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type TeamAvailabilityPageProps = {
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
  profiles:
    | {
        id: string;
        full_name: string | null;
        email: string;
      }
    | {
        id: string;
        full_name: string | null;
        email: string;
      }[]
    | null;
};

function getProfileDisplayName(entry: AvailabilityEntry) {
  const profile = Array.isArray(entry.profiles)
    ? entry.profiles[0]
    : entry.profiles;

  return profile?.full_name ?? profile?.email ?? "Nieznany użytkownik";
}

export default async function TeamAvailabilityPage({
  params,
  searchParams,
}: TeamAvailabilityPageProps) {
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

  const canManageTeam =
    membership.role === "owner" || membership.role === "manager";

  if (!canManageTeam) {
    redirect(`/team/${teamId}/availability`);
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
    .select(`
      id,
      date,
      start_time,
      end_time,
      note,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq("team_id", teamId)
    .gte("date", weekStartDate)
    .lte("date", weekEndDateISO)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const availability = (availabilityData ?? []) as unknown as AvailabilityEntry[];

  const calendarEvents: CalendarEvent[] = availability.map((entry) => {
    const displayName = getProfileDisplayName(entry);

    return {
      id: entry.id,
      date: entry.date,
      startTime: entry.start_time,
      endTime: entry.end_time,
      title: displayName,
      subtitle: entry.note ?? "Dostępny/a",
      variant: "availability",
    };
  });

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
                Dostępność zespołu
              </h1>

              <Badge variant="secondary">{team.name}</Badge>
              <Badge variant="outline">Rola: {membership.role}</Badge>
            </div>

            <p className="mt-2 text-muted-foreground">
              Zobacz, kto i kiedy może pracować w wybranym tygodniu.
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
              href={`/team/${teamId}/availability/team?week=${previousWeekISO}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Poprzedni tydzień
            </Link>

            <Link
              href={`/team/${teamId}/availability/team?week=${nextWeekISO}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Następny tydzień
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <WeeklyCalendar
            weekStartDate={weekStartDate}
            events={calendarEvents}
          />

          <Card>
            <CardHeader>
              <CardTitle>Podsumowanie dostępności</CardTitle>
            </CardHeader>

            <CardContent>
              {availability.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak zgłoszonej dostępności w tym tygodniu.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {availability.map((entry) => {
                    const displayName = getProfileDisplayName(entry);

                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl border bg-card p-4"
                      >
                        <p className="font-medium">{displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.date}, {entry.start_time.slice(0, 5)}–
                          {entry.end_time.slice(0, 5)}
                        </p>

                        {entry.note && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}