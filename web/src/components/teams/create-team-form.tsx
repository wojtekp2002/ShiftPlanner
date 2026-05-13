"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateJoinCode } from "@/lib/generate-join-code";
import { createClient } from "@/lib/supabase/client";

export function CreateTeamForm() {
  const router = useRouter();
  const supabase = createClient();

  const [teamName, setTeamName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreateTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsLoading(false);
      setErrorMessage("Musisz być zalogowany, aby utworzyć zespół.");
      return;
    }

    const joinCode = generateJoinCode();

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: teamName,
        join_code: joinCode,
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (teamError || !team) {
      setIsLoading(false);
      setErrorMessage(teamError?.message ?? "Nie udało się utworzyć zespołu.");
      return;
    }

    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "owner",
    });

    setIsLoading(false);

    if (memberError) {
      setErrorMessage(memberError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utwórz zespół</CardTitle>
        <CardDescription>
          Stwórz zespół pracy i zaproś pracowników przez kod dołączenia.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleCreateTeam} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="teamName">Nazwa zespołu</Label>
            <Input
              id="teamName"
              type="text"
              placeholder="np. Kawiarnia Luna"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              required
            />
          </div>

          {errorMessage && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Tworzenie..." : "Utwórz zespół"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}