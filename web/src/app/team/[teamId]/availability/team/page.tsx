import Link from "next/link";
import { redirect } from "next/navigation";

import {
  addDays,
  formatDisplayDate,
  getStartOfCurrentWeek,
  getWeekDays,
  isValidISODate,
} from "@/components/availability/availability-utils";
import { LogoutButton } from "@/components/auth/logout-button";
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
  const weekDays = getWeekDays(weekStartDate);

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

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <section className="mx-auto max-w-6xl">
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
              Zobacz dostępność wszystkich członków zespołu w wybranym tygodniu.
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

        <div className="grid gap-4">
          {weekDays.map((day) => {
            const dayAvailability = availability.filter(
              (entry) => entry.date === day.date
            );

            return (
              <Card key={day.date}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <span>{day.label}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {formatDisplayDate(day.date)}
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {dayAvailability.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Brak zgłoszonej dostępności.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {dayAvailability.map((entry) => {
                        const profile = Array.isArray(entry.profiles)
                          ? entry.profiles[0]
                          : entry.profiles;

                        const displayName =
                          profile?.full_name ?? profile?.email ?? "Nieznany użytkownik";

                        return (
                          <div
                            key={entry.id}
                            className="rounded-xl border bg-card p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{displayName}</p>
                                {profile?.email && (
                                  <p className="text-sm text-muted-foreground">
                                    {profile.email}
                                  </p>
                                )}
                              </div>

                              <Badge>
                                {entry.start_time.slice(0, 5)}–
                                {entry.end_time.slice(0, 5)}
                              </Badge>
                            </div>

                            {entry.note && (
                              <p className="mt-3 text-sm text-muted-foreground">
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
            );
          })}
        </div>
      </section>
    </main>
  );
}