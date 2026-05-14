"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  formatDisplayDate,
  getWeekDays,
} from "@/components/availability/availability-utils";
import {
  type CalendarEvent,
  WeeklyCalendar,
} from "@/components/calendar/weekly-calendar";
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
  id?: string;
  startTime: string;
  endTime: string;
  note: string;
};

type InteractiveAvailabilityCalendarProps = {
  teamId: string;
  weekStartDate: string;
  initialAvailability: AvailabilityEntry[];
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
      id: existingEntry?.id,
      startTime: existingEntry?.start_time.slice(0, 5) ?? "",
      endTime: existingEntry?.end_time.slice(0, 5) ?? "",
      note: existingEntry?.note ?? "",
    };

    return acc;
  }, {});
}

export function InteractiveAvailabilityCalendar({
  teamId,
  weekStartDate,
  initialAvailability,
}: InteractiveAvailabilityCalendarProps) {
  const router = useRouter();
  const supabase = createClient();

  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  const [availabilityByDate, setAvailabilityByDate] = useState(() =>
    createInitialDayState(weekDays, initialAvailability)
  );

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calendarEvents: CalendarEvent[] = Object.entries(availabilityByDate)
    .filter(([, dayState]) => dayState.startTime && dayState.endTime)
    .map(([date, dayState]) => ({
      id: dayState.id ?? date,
      date,
      startTime: dayState.startTime,
      endTime: dayState.endTime,
      title: "Dostępny/a",
      subtitle: dayState.note || undefined,
      variant: "availability",
    }));

  const selectedDay = selectedDate
    ? weekDays.find((day) => day.date === selectedDate)
    : null;

  const selectedDayState = selectedDate
    ? availabilityByDate[selectedDate]
    : null;

  function selectDate(date: string) {
    setSelectedDate(date);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function updateSelectedDay(patch: Partial<DayAvailabilityState>) {
    if (!selectedDate) {
      return;
    }

    setAvailabilityByDate((current) => ({
      ...current,
      [selectedDate]: {
        ...current[selectedDate],
        ...patch,
      },
    }));
  }

  async function saveSelectedDay() {
    if (!selectedDate || !selectedDayState) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const hasStartTime = Boolean(selectedDayState.startTime);
    const hasEndTime = Boolean(selectedDayState.endTime);

    if (hasStartTime !== hasEndTime) {
      setIsLoading(false);
      setErrorMessage("Uzupełnij obie godziny albo wyczyść dzień.");
      return;
    }

    if (
      hasStartTime &&
      hasEndTime &&
      selectedDayState.startTime >= selectedDayState.endTime
    ) {
      setIsLoading(false);
      setErrorMessage("Godzina rozpoczęcia musi być wcześniejsza niż zakończenia.");
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

    const { error: deleteError } = await supabase
      .from("availability")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .eq("date", selectedDate);

    if (deleteError) {
      setIsLoading(false);
      setErrorMessage(deleteError.message);
      return;
    }

    let insertedId: string | undefined;

    if (selectedDayState.startTime && selectedDayState.endTime) {
      const { data: insertedAvailability, error: insertError } = await supabase
        .from("availability")
        .insert({
          team_id: teamId,
          user_id: user.id,
          date: selectedDate,
          start_time: selectedDayState.startTime,
          end_time: selectedDayState.endTime,
          note: selectedDayState.note.trim() || null,
        })
        .select("id")
        .single();

      if (insertError) {
        setIsLoading(false);
        setErrorMessage(insertError.message);
        return;
      }

      insertedId = insertedAvailability?.id;
    }

    setAvailabilityByDate((current) => ({
      ...current,
      [selectedDate]: {
        ...current[selectedDate],
        id: insertedId,
      },
    }));

    setIsLoading(false);
    setSuccessMessage("Dostępność została zapisana.");
    router.refresh();
  }

  async function clearSelectedDay() {
    if (!selectedDate) {
      return;
    }

    setAvailabilityByDate((current) => ({
      ...current,
      [selectedDate]: {
        startTime: "",
        endTime: "",
        note: "",
      },
    }));

    await saveSelectedDay();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <WeeklyCalendar
        weekStartDate={weekStartDate}
        events={calendarEvents}
        onAddEvent={selectDate}
        onEventClick={(event) => selectDate(event.date)}
      />

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Edytuj dzień</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {!selectedDate || !selectedDay || !selectedDayState ? (
            <p className="text-sm text-muted-foreground">
              Kliknij plus przy wybranym dniu albo istniejący blok w kalendarzu,
              aby ustawić dostępność.
            </p>
          ) : (
            <>
              <div>
                <p className="font-medium">{selectedDay.label}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDisplayDate(selectedDate)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="availability-start">Od</Label>
                  <Input
                    id="availability-start"
                    type="time"
                    value={selectedDayState.startTime}
                    onChange={(event) =>
                      updateSelectedDay({
                        startTime: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability-end">Do</Label>
                  <Input
                    id="availability-end"
                    type="time"
                    value={selectedDayState.endTime}
                    onChange={(event) =>
                      updateSelectedDay({
                        endTime: event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability-note">Notatka opcjonalna</Label>
                <Input
                  id="availability-note"
                  type="text"
                  placeholder="np. tylko rano"
                  value={selectedDayState.note}
                  onChange={(event) =>
                    updateSelectedDay({
                      note: event.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    updateSelectedDay({
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
                  onClick={() =>
                    updateSelectedDay({
                      startTime: "",
                      endTime: "",
                      note: "",
                    })
                  }
                >
                  Wyczyść pola
                </Button>

                <Button
                  type="button"
                  onClick={saveSelectedDay}
                  disabled={isLoading}
                >
                  {isLoading ? "Zapisywanie..." : "Zapisz dzień"}
                </Button>
              </div>

              {errorMessage && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                  {successMessage}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}