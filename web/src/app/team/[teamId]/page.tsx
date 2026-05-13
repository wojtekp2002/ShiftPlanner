import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type TeamPageProps = {
  params: Promise<{
    teamId: string;
  }>;
};

type TeamMember = {
  id: string;
  role: string;
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

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;

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
    .select("id, name, join_code, owner_id")
    .eq("id", teamId)
    .single();

  if (!team) {
    redirect("/dashboard");
  }

  const { data: membersData } = await supabase
    .from("team_members")
    .select(`
      id,
      role,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq("team_id", teamId);

  const members = (membersData ?? []) as unknown as TeamMember[];

  const currentUserRole = membership.role;
  const canManageTeam =
    currentUserRole === "owner" || currentUserRole === "manager";

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <section className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <Link
              href="/dashboard"
              className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
            >
              ← Wróć do dashboardu
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {team.name}
              </h1>

              <Badge variant="secondary">Twoja rola: {currentUserRole}</Badge>
            </div>

            <p className="mt-2 text-muted-foreground">
              Szczegóły zespołu, członkowie i moduły planowania grafiku.
            </p>
          </div>

          <LogoutButton />
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Członkowie zespołu</CardTitle>
              </CardHeader>

              <CardContent>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ten zespół nie ma jeszcze członków.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => {
                      const profile = Array.isArray(member.profiles)
                        ? member.profiles[0]
                        : member.profiles;

                      if (!profile) {
                        return null;
                      }

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-xl border bg-card p-4"
                        >
                          <div>
                            <p className="font-medium">
                              {profile.full_name ?? profile.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {profile.email}
                            </p>
                          </div>

                          <Badge>{member.role}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Dostępność</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tu dodamy formularz dostępności pracowników.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grafik</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tu dodamy widok tygodniowego grafiku.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Zmiany</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tu manager utworzy wymagane zmiany.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kod dołączenia</CardTitle>
              </CardHeader>

              <CardContent>
                {canManageTeam ? (
                  <div>
                    <p className="rounded-xl border bg-muted px-4 py-3 text-center font-mono text-lg font-semibold tracking-widest">
                      {team.join_code}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Udostępnij ten kod pracownikom, aby mogli dołączyć do
                      zespołu.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Kod dołączenia jest widoczny tylko dla managera lub
                    właściciela zespołu.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uprawnienia</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {canManageTeam
                    ? "Możesz zarządzać zespołem i przygotowywać grafik."
                    : "Możesz uzupełniać swoją dostępność i sprawdzać własne zmiany."}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}