"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { addDays } from "@/components/availability/availability-utils";
import { Button } from "@/components/ui/button";
import {
  generateSchedule,
  type GenerationWarning,
} from "@/lib/schedule/generate-schedule";
import { createClient } from "@/lib/supabase/client";

type GenerateScheduleButtonProps = {
  teamId: string;
  weekStartDate: string;
};

type ShiftRequirement = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  required_people: number;
};

type AvailabilityEntry = {
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
};

type TeamMember = {
  user_id: string;
  role: string;
};

type CreatedScheduleShift = {
  id: string;
  shift_requirement_id: string | null;
};

export function GenerateScheduleButton({
  teamId,
  weekStartDate,
}: GenerateScheduleButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<GenerationWarning[]>([]);

  async function handleGenerateSchedule() {
    setIsLoading(true);
    setErrorMessage(null);
    setWarnings([]);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsLoading(false);
      setErrorMessage("Musisz być zalogowany.");
      return;
    }

    const weekEndDate = addDays(weekStartDate, 6);

    const { data: requirementsData, error: requirementsError } = await supabase
      .from("shift_requirements")
      .select("id, date, start_time, end_time, required_people")
      .eq("team_id", teamId)
      .gte("date", weekStartDate)
      .lte("date", weekEndDate)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (requirementsError) {
      setIsLoading(false);
      setErrorMessage(requirementsError.message);
      return;
    }

    const shiftRequirements = (requirementsData ?? []) as ShiftRequirement[];

    if (shiftRequirements.length === 0) {
      setIsLoading(false);
      setErrorMessage(
        "Najpierw dodaj wymagane zmiany dla wybranego tygodnia."
      );
      return;
    }

    const { data: availabilityData, error: availabilityError } = await supabase
      .from("availability")
      .select("user_id, date, start_time, end_time")
      .eq("team_id", teamId)
      .gte("date", weekStartDate)
      .lte("date", weekEndDate);

    if (availabilityError) {
      setIsLoading(false);
      setErrorMessage(availabilityError.message);
      return;
    }

    const availability = (availabilityData ?? []) as AvailabilityEntry[];

    const { data: membersData, error: membersError } = await supabase
      .from("team_members")
      .select("user_id, role")
      .eq("team_id", teamId);

    if (membersError) {
      setIsLoading(false);
      setErrorMessage(membersError.message);
      return;
    }

    const teamMembers = (membersData ?? []) as TeamMember[];

    const result = generateSchedule({
      shiftRequirements,
      availability,
      teamMembers,
    });

    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .upsert(
        {
          team_id: teamId,
          week_start_date: weekStartDate,
          status: "draft",
          created_by: user.id,
          published_at: null,
        },
        {
          onConflict: "team_id,week_start_date",
        }
      )
      .select("id")
      .single();

    if (scheduleError || !schedule) {
      setIsLoading(false);
      setErrorMessage(
        scheduleError?.message ?? "Nie udało się utworzyć grafiku."
      );
      return;
    }

    const { error: deleteOldShiftsError } = await supabase
      .from("schedule_shifts")
      .delete()
      .eq("schedule_id", schedule.id);

    if (deleteOldShiftsError) {
      setIsLoading(false);
      setErrorMessage(deleteOldShiftsError.message);
      return;
    }

    const scheduleShiftRows = shiftRequirements.map((requirement) => ({
      schedule_id: schedule.id,
      shift_requirement_id: requirement.id,
      date: requirement.date,
      start_time: requirement.start_time,
      end_time: requirement.end_time,
      required_people: requirement.required_people,
    }));

    const { data: createdScheduleShiftsData, error: createShiftsError } =
      await supabase
        .from("schedule_shifts")
        .insert(scheduleShiftRows)
        .select("id, shift_requirement_id");

    if (createShiftsError) {
      setIsLoading(false);
      setErrorMessage(createShiftsError.message);
      return;
    }

    const createdScheduleShifts =
      (createdScheduleShiftsData ?? []) as CreatedScheduleShift[];

    const assignmentRows = result.assignments
      .map((assignment) => {
        const scheduleShift = createdScheduleShifts.find(
          (shift) =>
            shift.shift_requirement_id === assignment.shiftRequirementId
        );

        if (!scheduleShift) {
          return null;
        }

        return {
          schedule_shift_id: scheduleShift.id,
          user_id: assignment.userId,
        };
      })
      .filter((row): row is { schedule_shift_id: string; user_id: string } =>
        Boolean(row)
      );

    if (assignmentRows.length > 0) {
      const { error: createAssignmentsError } = await supabase
        .from("schedule_assignments")
        .insert(assignmentRows);

      if (createAssignmentsError) {
        setIsLoading(false);
        setErrorMessage(createAssignmentsError.message);
        return;
      }
    }

    setWarnings(result.warnings);
    setIsLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={handleGenerateSchedule} disabled={isLoading}>
        {isLoading ? "Generowanie..." : "Wygeneruj grafik"}
      </Button>

      {errorMessage && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2 rounded-xl border bg-muted p-3">
          <p className="text-sm font-medium">Ostrzeżenia generatora:</p>

          <ul className="space-y-1 text-sm text-muted-foreground">
            {warnings.map((warning) => (
              <li key={`${warning.shiftRequirementId}-${warning.message}`}>
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}