"use client";

import { formatDisplayDate, getWeekDays } from "@/components/availability/availability-utils";
import { cn } from "@/lib/utils";

export type CalendarEventVariant =
  | "availability"
  | "shift"
  | "schedule"
  | "warning";

export type CalendarEvent = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  subtitle?: string;
  variant?: CalendarEventVariant;
};

type WeeklyCalendarProps = {
  weekStartDate: string;
  events: CalendarEvent[];
  startHour?: number;
  endHour?: number;
  onAddEvent?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
};

const variantStyles: Record<CalendarEventVariant, string> = {
  availability:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-950 dark:text-emerald-50",
  shift:
    "border-blue-500/30 bg-blue-500/15 text-blue-950 dark:text-blue-50",
  schedule:
    "border-violet-500/30 bg-violet-500/15 text-violet-950 dark:text-violet-50",
  warning:
    "border-destructive/40 bg-destructive/15 text-destructive",
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getEventPosition(
  event: CalendarEvent,
  startHour: number,
  hourHeight: number
) {
  const calendarStartMinutes = startHour * 60;
  const eventStartMinutes = timeToMinutes(event.startTime);
  const eventEndMinutes = timeToMinutes(event.endTime);

  const top = ((eventStartMinutes - calendarStartMinutes) / 60) * hourHeight;
  const height = ((eventEndMinutes - eventStartMinutes) / 60) * hourHeight;

  return {
    top,
    height: Math.max(height, 32),
  };
}

export function WeeklyCalendar({
  weekStartDate,
  events,
  startHour = 6,
  endHour = 24,
  onAddEvent,
  onEventClick,
}: WeeklyCalendarProps) {
  const weekDays = getWeekDays(weekStartDate);
  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index
  );

  const hourHeight = 56;
  const calendarHeight = hours.length * hourHeight;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))] border-b bg-muted/40">
            <div className="border-r p-3 text-xs font-medium text-muted-foreground">
              Godz.
            </div>

            {weekDays.map((day) => (
              <div
                key={day.date}
                className="flex items-start justify-between gap-2 border-r p-3 last:border-r-0"
              >
                <div>
                  <p className="text-sm font-semibold">{day.shortLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDisplayDate(day.date)}
                  </p>
                </div>

                {onAddEvent && (
                  <button
                    type="button"
                    onClick={() => onAddEvent(day.date)}
                    className="flex size-7 items-center justify-center rounded-md border bg-background text-sm font-semibold shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label={`Dodaj dostępność: ${day.label}`}
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))]">
            <div className="border-r">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-b px-3 py-2 text-xs text-muted-foreground"
                  style={{ height: hourHeight }}
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {weekDays.map((day) => {
              const dayEvents = events.filter(
                (event) => event.date === day.date
              );

              return (
                <div
                  key={day.date}
                  className="relative border-r last:border-r-0"
                  style={{ height: calendarHeight }}
                >
                  {hours.map((hour) => (
                    <div
                      key={`${day.date}-${hour}`}
                      className="border-b"
                      style={{ height: hourHeight }}
                    />
                  ))}

                  {dayEvents.map((event, index) => {
                    const { top, height } = getEventPosition(
                      event,
                      startHour,
                      hourHeight
                    );

                    const variant = event.variant ?? "schedule";

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onEventClick?.(event)}
                        className={cn(
                          "absolute left-2 right-2 overflow-hidden rounded-lg border px-2 py-1 text-left text-xs shadow-sm transition-transform hover:scale-[1.01]",
                          onEventClick && "cursor-pointer",
                          variantStyles[variant]
                        )}
                        style={{
                          top,
                          height,
                          transform: `translateX(${index * 4}px)`,
                        }}
                      >
                        <p className="font-semibold leading-tight">
                          {event.startTime.slice(0, 5)}–
                          {event.endTime.slice(0, 5)}
                        </p>

                        <p className="mt-1 truncate font-medium">
                          {event.title}
                        </p>

                        {event.subtitle && (
                          <p className="truncate opacity-80">
                            {event.subtitle}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}