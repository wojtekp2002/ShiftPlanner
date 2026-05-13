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
  const weekDays = getWeekDays(weekStartDate);

  const { data: requirementsData } = await supabase
    .from("shift_requirements")
    .select("id, date, start_time, end_time, required_people")
    .eq("team_id", teamId)
    .gte("date", weekStartDate)
    .lte("date", weekEndDateISO)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const requirements = (requirementsData ?? []) as ShiftRequirement[];

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
                Wymagane zmiany
              </h1>

              <Badge variant="secondary">{team.name}</Badge>
              <Badge variant="outline">Rola: {membership.role}</Badge>
            </div>

            <p className="mt-2 text-muted-foreground">
              Ustal, jakie zmiany trzeba obsadzić w wybranym tygodniu.
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

        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          <ShiftRequirementForm
            teamId={teamId}
            weekStartDate={weekStartDate}
          />

          <Card>
            <CardHeader>
              <CardTitle>Zmiany w tym tygodniu</CardTitle>
            </CardHeader>

            <CardContent>
              {requirements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nie dodano jeszcze wymaganych zmian w tym tygodniu.
                </p>
              ) : (
                <div className="space-y-4">
                  {weekDays.map((day) => {
                    const dayRequirements = requirements.filter(
                      (requirement) => requirement.date === day.date
                    );

                    if (dayRequirements.length === 0) {
                      return null;
                    }

                    return (
                      <div key={day.date} className="space-y-2">
                        <div>
                          <p className="font-medium">{day.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDisplayDate(day.date)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {dayRequirements.map((requirement) => (
                            <div
                              key={requirement.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
                            >
                              <div>
                                <p className="font-medium">
                                  {requirement.start_time.slice(0, 5)}–
                                  {requirement.end_time.slice(0, 5)}
                                </p>
                              </div>

                              <Badge>{requirement.required_people} os.</Badge>
                            </div>
                          ))}
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