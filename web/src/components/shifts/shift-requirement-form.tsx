"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  formatDisplayDate,
  getWeekDays,
} from "@/components/availability/availability-utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type ShiftRequirementFormProps = {
  teamId: string;
  weekStartDate: string;
};

export function ShiftRequirementForm({
  teamId,
  weekStartDate,
}: ShiftRequirementFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const [date, setDate] = useState(weekDays[0]?.date ?? weekStartDate);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [requiredPeople, setRequiredPeople] = useState("1");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreateShiftRequirement(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage(null);

    if (!startTime || !endTime || startTime >= endTime) {
      setIsLoading(false);
      setErrorMessage(
        "Godzina rozpoczęcia musi być wcześniejsza niż zakończenia."
      );
      return;
    }

    const parsedRequiredPeople = Number(requiredPeople);

    if (!Number.isInteger(parsedRequiredPeople) || parsedRequiredPeople <= 0) {
      setIsLoading(false);
      setErrorMessage("Liczba osób musi być dodatnią liczbą całkowitą.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsLoading(false);
      setErrorMessage("Musisz być zalogowany.");
      return;
    }

    const { error } = await supabase.from("shift_requirements").insert({
      team_id: teamId,
      date,
      start_time: startTime,
      end_time: endTime,
      required_people: parsedRequiredPeople,
      created_by: user.id,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dodaj wymaganą zmianę</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleCreateShiftRequirement} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="shift-date">Dzień</Label>

            <select
              id="shift-date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none"
            >
              {weekDays.map((day) => (
                <option key={day.date} value={day.date}>
                  {day.label} — {formatDisplayDate(day.date)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shift-start">Od</Label>
              <Input
                id="shift-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift-end">Do</Label>
              <Input
                id="shift-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="required-people">Liczba osób</Label>
            <Input
              id="required-people"
              type="number"
              min={1}
              step={1}
              value={requiredPeople}
              onChange={(event) => setRequiredPeople(event.target.value)}
              required
            />
          </div>

          {errorMessage && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Dodawanie..." : "Dodaj zmianę"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}