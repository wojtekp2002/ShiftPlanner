import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Team = {
  id: string;
  name: string;
  join_code: string;
};

type TeamMembership = {
  role: string;
  teams: Team | Team[] | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name ?? user.email ?? "Użytkowniku";

    const { data: teamMembershipsData } = await supabase
    .from("team_members")
    .select(`
        role,
        teams (
            id,
            name,
            join_code
        )
    `)
    .eq("user_id", user.id);

    const teamMemberships = (teamMembershipsData ?? []) as unknown as TeamMembership[];

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <section className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Dashboard</p>
            <h1 className="text-3xl font-bold tracking-tight">
              Cześć, {fullName}
            </h1>
          </div>

          <LogoutButton />
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
                <CardTitle>Twoje zespoły</CardTitle>
            </CardHeader>

            <CardContent>
                {teamMemberships.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Nie należysz jeszcze do żadnego zespołu.
                </p>
                ) : (
                <div className="space-y-3">
                    {teamMemberships.map((membership) => {
                        const team = Array.isArray(membership.teams)
                            ? membership.teams[0]
                            : membership.teams;

                        if (!team) {
                            return null;
                        }

                        return (
                            <div key={team.id} className="rounded-xl border bg-card p-4">
                            <p className="font-medium">{team.name}</p>

                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                <p>Rola: {membership.role}</p>
                                <p>Kod dołączenia: {team.join_code}</p>
                            </div>
                            </div>
                        );
                    })}
                </div>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Najbliższe zmiany</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tutaj później pokażemy Twoje zaplanowane zmiany.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Szybkie akcje</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Link
                href="/teams/new"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                >
                Utwórz zespół
              </Link>
              <Button variant="outline">Dołącz przez kod</Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}