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
import { createClient } from "@/lib/supabase/client";

export function JoinTeamForm() {
  const router = useRouter();
  const supabase = createClient();

  const [joinCode, setJoinCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleJoinTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage(null);

    const normalizedJoinCode = joinCode.trim().toUpperCase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsLoading(false);
      setErrorMessage("Musisz być zalogowany, aby dołączyć do zespołu.");
      return;
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("join_code", normalizedJoinCode)
      .single();

    if (teamError || !team) {
      setIsLoading(false);
      setErrorMessage("Nie znaleziono zespołu o podanym kodzie.");
      return;
    }

    const { data: existingMembership } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      setIsLoading(false);
      setErrorMessage("Już należysz do tego zespołu.");
      return;
    }

    const { error: membershipError } = await supabase
      .from("team_members")
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: "employee",
      });

    setIsLoading(false);

    if (membershipError) {
      setErrorMessage(membershipError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dołącz do zespołu</CardTitle>
        <CardDescription>
          Wpisz kod otrzymany od managera lub właściciela zespołu.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleJoinTeam} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="joinCode">Kod dołączenia</Label>
            <Input
              id="joinCode"
              type="text"
              placeholder="np. K7M9Q2XD"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              required
            />
          </div>

          {errorMessage && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Dołączanie..." : "Dołącz do zespołu"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}