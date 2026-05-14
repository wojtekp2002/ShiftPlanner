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
import { ShiftRequirementForm } from "@/components/shifts/shift-requirement-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type ShiftsPageProps = {
  params: Promise<{
    teamId: string;
  }>;
  searchParams: Promise<{
    week?: string;
  }>;
};

type ShiftRequirement = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  required_people: number;
};

export default async function ShiftsPage({
  params,
  searchParams,
}: ShiftsPageProps) {
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
    redirect(`/team/${teamId}`);
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

  const { data: requirementsData } = await supabase
    .from("shift_requirements")
    .select("id, date, start_time, end_time, required_people")
    .eq("team_id", teamId)
    .gte("date", weekStartDate)
    .lte("date", weekEndDateISO)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const requirements = (requirementsData ?? []) as ShiftRequirement[];

  const calendarEvents: CalendarEvent[] = requirements.map((requirement) => ({
    id: requirement.id,
    date: requirement.date,
    startTime: requirement.start_time,
    endTime: requirement.end_time,
    title: `Potrzeba ${requirement.required_people} os.`,
    subtitle: "Wymagana zmiana",
    variant: "shift",
  }));

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
                Wymagane zmiany
              </h1>

              <Badge variant="secondary">{team.name}</Badge>
              <Badge variant="outline">Rola: {membership.role}</Badge>
            </div>

            <p className="mt-2 text-muted-foreground">
              Ustal, jakie zmiany trzeba obsadzić w wybranym tygodniu. Bloki w
              kalendarzu pokazują wymagane przedziały pracy.
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
              href={`/team/${teamId}/shifts?week=${previousWeekISO}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Poprzedni tydzień
            </Link>

            <Link
              href={`/team/${teamId}/shifts?week=${nextWeekISO}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Następny tydzień
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <ShiftRequirementForm
              teamId={teamId}
              weekStartDate={weekStartDate}
            />

            <Card>
              <CardHeader>
                <CardTitle>Lista zmian</CardTitle>
              </CardHeader>

              <CardContent>
                {requirements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nie dodano jeszcze wymaganych zmian w tym tygodniu.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {requirements.map((requirement) => (
                      <div
                        key={requirement.id}
                        className="rounded-xl border bg-card p-4"
                      >
                        <p className="font-medium">
                          {requirement.date}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          {requirement.start_time.slice(0, 5)}–
                          {requirement.end_time.slice(0, 5)}
                        </p>

                        <Badge className="mt-3">
                          {requirement.required_people} os.
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <WeeklyCalendar
            weekStartDate={weekStartDate}
            events={calendarEvents}
          />
        </div>
      </section>
    </main>
  );
}