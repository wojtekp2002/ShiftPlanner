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
import { GenerateScheduleButton } from "@/components/schedule/generate-schedule-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type SchedulePageProps = {
  params: Promise<{
    teamId: string;
  }>;
  searchParams: Promise<{
    week?: string;
  }>;
};

type ScheduleAssignment = {
  id: string;
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

type ScheduleShift = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  required_people: number;
  schedule_assignments: ScheduleAssignment[];
};

type Schedule = {
  id: string;
  status: string;
  schedule_shifts: ScheduleShift[];
};

function getAssignmentDisplayName(assignment: ScheduleAssignment) {
  const profile = Array.isArray(assignment.profiles)
    ? assignment.profiles[0]
    : assignment.profiles;

  return profile?.full_name ?? profile?.email ?? "Nieznany użytkownik";
}

export default async function SchedulePage({
  params,
  searchParams,
}: SchedulePageProps) {
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

  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .single();

  if (!team) {
    redirect("/dashboard");
  }

  const previousWeekISO = addDays(weekStartDate, -7);
  const nextWeekISO = addDays(weekStartDate, 7);

  const { data: scheduleData } = await supabase
    .from("schedules")
    .select(`
      id,
      status,
      schedule_shifts (
        id,
        date,
        start_time,
        end_time,
        required_people,
        schedule_assignments (
          id,
          profiles (
            id,
            full_name,
            email
          )
        )
      )
    `)
    .eq("team_id", teamId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  const schedule = scheduleData as unknown as Schedule | null;
  const scheduleShifts = schedule?.schedule_shifts ?? [];

  const calendarEvents: CalendarEvent[] = scheduleShifts.map((shift) => {
    const assignments = shift.schedule_assignments ?? [];
    const assignedPeople = assignments.length;
    const missingPeople = shift.required_people - assignedPeople;

    const peopleNames =
      assignments.length > 0
        ? assignments.map(getAssignmentDisplayName).join(", ")
        : "Brak przypisanych osób";

    return {
      id: shift.id,
      date: shift.date,
      startTime: shift.start_time,
      endTime: shift.end_time,
      title:
        missingPeople > 0
          ? `${assignedPeople}/${shift.required_people} — brakuje ${missingPeople}`
          : `${assignedPeople}/${shift.required_people} obsadzone`,
      subtitle: peopleNames,
      variant: missingPeople > 0 ? "warning" : "schedule",
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
              <h1 className="text-3xl font-bold tracking-tight">Grafik</h1>

              <Badge variant="secondary">{team.name}</Badge>
              <Badge variant="outline">Rola: {membership.role}</Badge>

              {schedule && (
                <Badge variant="secondary">Status: {schedule.status}</Badge>
              )}
            </div>

            <p className="mt-2 text-muted-foreground">
              Wygeneruj i sprawdź grafik pracy dla wybranego tygodnia.
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
              href={`/team/${teamId}/schedule?week=${previousWeekISO}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Poprzedni tydzień
            </Link>

            <Link
              href={`/team/${teamId}/schedule?week=${nextWeekISO}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Następny tydzień
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-xl border bg-card p-4">
          {canManageTeam ? (
            <GenerateScheduleButton
              teamId={teamId}
              weekStartDate={weekStartDate}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Grafik może wygenerować tylko manager lub właściciel zespołu.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <WeeklyCalendar
            weekStartDate={weekStartDate}
            events={calendarEvents}
          />

          <Card>
            <CardHeader>
              <CardTitle>Szczegóły grafiku</CardTitle>
            </CardHeader>

            <CardContent>
              {!schedule ? (
                <p className="text-sm text-muted-foreground">
                  Nie wygenerowano jeszcze grafiku dla tego tygodnia.
                </p>
              ) : scheduleShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Grafik nie zawiera żadnych zmian.
                </p>
              ) : (
                <div className="space-y-3">
                  {scheduleShifts.map((shift) => {
                    const assignments = shift.schedule_assignments ?? [];
                    const missingPeople =
                      shift.required_people - assignments.length;

                    return (
                      <div
                        key={shift.id}
                        className="rounded-xl border bg-card p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {shift.date}, {shift.start_time.slice(0, 5)}–
                              {shift.end_time.slice(0, 5)}
                            </p>

                            <p className="text-sm text-muted-foreground">
                              Wymagane osoby: {shift.required_people}
                            </p>
                          </div>

                          {missingPeople > 0 ? (
                            <Badge variant="destructive">
                              Brakuje {missingPeople}
                            </Badge>
                          ) : (
                            <Badge>Obsadzone</Badge>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {assignments.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              Brak przypisanych osób.
                            </span>
                          ) : (
                            assignments.map((assignment) => (
                              <span
                                key={assignment.id}
                                className="rounded-md bg-muted px-3 py-1 text-sm"
                              >
                                {getAssignmentDisplayName(assignment)}
                              </span>
                            ))
                          )}
                        </div>
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