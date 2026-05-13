export type WeekDay = {
  date: string;
  label: string;
  shortLabel: string;
};

const dayLabels = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

const shortDayLabels = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateToISO(date: Date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  return `${year}-${month}-${day}`;
}

export function isValidISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function getStartOfCurrentWeek() {
  const today = new Date();
  const day = today.getDay();

  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  return formatDateToISO(monday);
}

export function getWeekDays(weekStartDate: string): WeekDay[] {
  const startDate = new Date(`${weekStartDate}T00:00:00`);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date: formatDateToISO(date),
      label: dayLabels[index],
      shortLabel: shortDayLabels[index],
    };
  });
}

export function addDays(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() + days);

  return formatDateToISO(date);
}

export function formatDisplayDate(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}