"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addDays,
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

type AvailabilityEntry = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  note: string | null;
};

type DayAvailabilityState = {
  startTime: string;
  endTime: string;
  note: string;
};

type WeeklyAvailabilityFormProps = {
  teamId: string;
  weekStartDate: string;
  initialAvailability: AvailabilityEntry[];
};

type AvailabilityInsertRow = {
  team_id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  note: string | null;
};

function createInitialDayState(
  weekDays: { date: string }[],
  initialAvailability: AvailabilityEntry[]
) {
  return weekDays.reduce<Record<string, DayAvailabilityState>>((acc, day) => {
    const existingEntry = initialAvailability.find(
      (entry) => entry.date === day.date
    );

    acc[day.date] = {
      startTime: existingEntry?.start_time.slice(0, 5) ?? "",
      endTime: existingEntry?.end_time.slice(0, 5) ?? "",
      note: existingEntry?.note ?? "",
    };

    return acc;
  }, {});
}

export function WeeklyAvailabilityForm({
  teamId,
  weekStartDate,
  initialAvailability,
}: WeeklyAvailabilityFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const [availabilityByDate, setAvailabilityByDate] = useState(() =>
    createInitialDayState(weekDays, initialAvailability)
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function updateDayAvailability(
    date: string,
    patch: Partial<DayAvailabilityState>
  ) {
    setAvailabilityByDate((current) => ({
      ...current,
      [date]: {
        ...current[date],
        ...patch,
      },
    }));
  }

  async function handleSaveAvailability() {
    setIsLoading(true);
    setErrorMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsLoading(false);
      setErrorMessage("Musisz być zalogowany.");
      return;
    }

    for (const day of weekDays) {
      const dayState = availabilityByDate[day.date];

      const hasStartTime = Boolean(dayState.startTime);
      const hasEndTime = Boolean(dayState.endTime);

      if (hasStartTime !== hasEndTime) {
        setIsLoading(false);
        setErrorMessage(
          `Uzupełnij obie godziny albo zostaw pusty dzień: ${day.label}.`
        );
        return;
      }

      if (hasStartTime && hasEndTime && dayState.startTime >= dayState.endTime) {
        setIsLoading(false);
        setErrorMessage(
          `Godzina rozpoczęcia musi być wcześniejsza niż zakończenia: ${day.label}.`
        );
        return;
      }
    }

    const weekEndDate = addDays(weekStartDate, 6);

    const { error: deleteError } = await supabase
      .from("availability")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .gte("date", weekStartDate)
      .lte("date", weekEndDate);

    if (deleteError) {
      setIsLoading(false);
      setErrorMessage(deleteError.message);
      return;
    }

    const rowsToInsert: AvailabilityInsertRow[] = [];

    for (const day of weekDays) {
      const dayState = availabilityByDate[day.date];

      if (!dayState.startTime || !dayState.endTime) {
        continue;
      }

      rowsToInsert.push({
        team_id: teamId,
        user_id: user.id,
        date: day.date,
        start_time: dayState.startTime,
        end_time: dayState.endTime,
        note: dayState.note.trim() || null,
      });
    }

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("availability")
        .insert(rowsToInsert);

      if (insertError) {
        setIsLoading(false);
        setErrorMessage(insertError.message);
        return;
      }
    }

    setIsLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moja dostępność w tygodniu</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Zostaw puste pola, jeśli w danym dniu jesteś niedostępny/a. Jeżeli
          możesz pracować, wpisz godzinę rozpoczęcia i zakończenia.
        </p>

        <div className="grid gap-4">
          {weekDays.map((day) => {
            const dayState = availabilityByDate[day.date];

            const isDayAvailable = Boolean(
              dayState.startTime && dayState.endTime
            );

            return (
              <div
                key={day.date}
                className="rounded-xl border bg-card p-4"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{day.label}</p>

                      {isDayAvailable ? (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          Dostępny/a
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          Niedostępny/a
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDisplayDate(day.date)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateDayAvailability(day.date, {
                          startTime: "00:00",
                          endTime: "23:59",
                        })
                      }
                    >
                      Cały dzień
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateDayAvailability(day.date, {
                          startTime: "",
                          endTime: "",
                          note: "",
                        })
                      }
                    >
                      Wyczyść
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${day.date}-start`}>Od</Label>
                    <Input
                      id={`${day.date}-start`}
                      type="time"
                      value={dayState.startTime}
                      onChange={(event) =>
                        updateDayAvailability(day.date, {
                          startTime: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${day.date}-end`}>Do</Label>
                    <Input
                      id={`${day.date}-end`}
                      type="time"
                      value={dayState.endTime}
                      onChange={(event) =>
                        updateDayAvailability(day.date, {
                          endTime: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor={`${day.date}-note`}>
                    Notatka opcjonalna
                  </Label>
                  <Input
                    id={`${day.date}-note`}
                    type="text"
                    placeholder="np. mogę tylko rano"
                    value={dayState.note}
                    onChange={(event) =>
                      updateDayAvailability(day.date, {
                        note: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={isLoading}
          onClick={handleSaveAvailability}
        >
          {isLoading ? "Zapisywanie..." : "Zapisz dostępność"}
        </Button>
      </CardContent>
    </Card>
  );
}