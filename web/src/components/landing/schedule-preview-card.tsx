import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const exampleShifts = [
  {
    day: "Poniedziałek",
    hours: "08:00–16:00",
    people: "2 osoby",
  },
  {
    day: "Wtorek",
    hours: "12:00–20:00",
    people: "3 osoby",
  },
  {
    day: "Środa",
    hours: "16:00–22:00",
    people: "1 osoba",
  },
];

export function SchedulePreviewCard() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Przykładowy tydzień</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {exampleShifts.map((shift) => (
          <div
            key={`${shift.day}-${shift.hours}`}
            className="flex items-center justify-between rounded-xl border bg-card p-4"
          >
            <div>
              <p className="font-medium">{shift.day}</p>
              <p className="text-sm text-muted-foreground">{shift.hours}</p>
            </div>

            <Badge>{shift.people}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}