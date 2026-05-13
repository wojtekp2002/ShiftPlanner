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

export type GeneratedAssignment = {
  shiftRequirementId: string;
  userId: string;
};

export type GenerationWarning = {
  shiftRequirementId: string;
  message: string;
};

type GenerateScheduleInput = {
  shiftRequirements: ShiftRequirement[];
  availability: AvailabilityEntry[];
  teamMembers: TeamMember[];
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function getShiftDurationHours(startTime: string, endTime: string) {
  return (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
}

function isAvailableForShift(
  availability: AvailabilityEntry,
  shift: ShiftRequirement
) {
  return (
    availability.date === shift.date &&
    timeToMinutes(availability.start_time) <= timeToMinutes(shift.start_time) &&
    timeToMinutes(availability.end_time) >= timeToMinutes(shift.end_time)
  );
}

export function generateSchedule({
  shiftRequirements,
  availability,
  teamMembers,
}: GenerateScheduleInput) {
  const assignments: GeneratedAssignment[] = [];
  const warnings: GenerationWarning[] = [];

  const assignedHoursByUser = new Map<string, number>();

  for (const member of teamMembers) {
    assignedHoursByUser.set(member.user_id, 0);
  }

  for (const shift of shiftRequirements) {
    const availableCandidates = teamMembers
      .filter((member) =>
        availability.some(
          (entry) =>
            entry.user_id === member.user_id &&
            isAvailableForShift(entry, shift)
        )
      )
      .sort((a, b) => {
        const aHours = assignedHoursByUser.get(a.user_id) ?? 0;
        const bHours = assignedHoursByUser.get(b.user_id) ?? 0;

        return aHours - bHours;
      });

    const selectedCandidates = availableCandidates.slice(
      0,
      shift.required_people
    );

    for (const candidate of selectedCandidates) {
      assignments.push({
        shiftRequirementId: shift.id,
        userId: candidate.user_id,
      });

      const currentHours = assignedHoursByUser.get(candidate.user_id) ?? 0;
      const shiftHours = getShiftDurationHours(shift.start_time, shift.end_time);

      assignedHoursByUser.set(candidate.user_id, currentHours + shiftHours);
    }

    if (selectedCandidates.length < shift.required_people) {
      warnings.push({
        shiftRequirementId: shift.id,
        message: `Brakuje ${
          shift.required_people - selectedCandidates.length
        } osób na zmianę ${shift.date} ${shift.start_time.slice(
          0,
          5
        )}–${shift.end_time.slice(0, 5)}.`,
      });
    }
  }

  return {
    assignments,
    warnings,
    assignedHoursByUser,
  };
}