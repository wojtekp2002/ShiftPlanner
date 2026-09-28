import {
  CalendarCheck2,
  Clock3,
  Sparkles,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

const exampleShifts = [
  {
    day: "Pon",
    hours: "08:00-16:00",
    people: "2 osoby",
    tone: "bg-[#8f6a3f]",
    width: "w-[68%]",
  },
  {
    day: "Wt",
    hours: "12:00-20:00",
    people: "3 osoby",
    tone: "bg-[#69785b]",
    width: "w-[82%]",
  },
  {
    day: "Śr",
    hours: "16:00-22:00",
    people: "1 osoba",
    tone: "bg-[#c6a46a]",
    width: "w-[48%]",
  },
  {
    day: "Czw",
    hours: "09:00-17:00",
    people: "pełna obsada",
    tone: "bg-[#172331]",
    width: "w-[74%]",
  },
];

const team = ["AM", "KL", "NW", "OS"];

export function SchedulePreviewCard() {
  return (
    <div
      id="proces"
      className="landing-panel relative mx-auto w-full max-w-xl rounded-[2rem] border border-[#d7c8b2]/65 bg-[#fbf4e9]/80 p-3 shadow-[0_35px_110px_rgba(64,47,31,0.13)] backdrop-blur-xl"
    >
      <div className="landing-sheen" />
      <div className="rounded-[1.45rem] border border-[#d7c8b2]/55 bg-[#fffaf1]">
        <div className="flex items-center justify-between border-b border-[#d7c8b2]/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#3b3128]" />
            <span className="size-3 rounded-full bg-[#c6a46a]" />
            <span className="size-3 rounded-full bg-[#69785b]" />
          </div>

          <div className="rounded-full bg-[#f1e6d6] px-3 py-1 text-xs font-semibold text-foreground/70">
            tydzień 18-24 maja
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                Plan zmiany
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
                Kawiarnia Mokotów
              </h2>
            </div>

            <div className="rounded-2xl bg-[#ece8da] px-3 py-2 text-right">
              <p className="text-xs text-[#69785b]">pokrycie</p>
              <p className="text-lg font-black text-[#69785b]">86%</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-[#d7c8b2]/65 bg-[#f6ecd8] p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fffaf1] text-[#8f6a3f] shadow-sm">
                <TriangleAlert className="size-4" />
              </span>
              <div>
                <p className="text-sm font-black">1 luka w obsadzie</p>
                <p className="text-xs text-muted-foreground">
                  Środa, zmiana wieczorna
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[#d7c8b2]/65 bg-[#f4efe5] p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fffaf1] text-[#a77f45] shadow-sm">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-black">Propozycja Ordo</p>
                <p className="text-xs text-muted-foreground">
                  Gotowa do akceptacji
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#f4efe5] p-3">
              <Clock3 className="size-4 text-[#8f6a3f]" />
              <p className="mt-2 text-lg font-black">42h</p>
              <p className="text-xs text-muted-foreground">obsady</p>
            </div>
            <div className="rounded-2xl bg-[#ece8da] p-3">
              <UsersRound className="size-4 text-[#69785b]" />
              <p className="mt-2 text-lg font-black">8</p>
              <p className="text-xs text-muted-foreground">osób</p>
            </div>
            <div className="rounded-2xl bg-[#f6ecd8] p-3">
              <CalendarCheck2 className="size-4 text-[#a77f45]" />
              <p className="mt-2 text-lg font-black">4/5</p>
              <p className="text-xs text-muted-foreground">dni OK</p>
            </div>
          </div>

          <div className="space-y-3">
            {exampleShifts.map((shift, index) => (
              <div
                key={`${shift.day}-${shift.hours}`}
                className="landing-row grid grid-cols-[2.5rem_1fr] items-center gap-3 rounded-2xl border border-[#d7c8b2]/50 bg-[#fffdf8] p-3"
                style={{ animationDelay: `${index * 120 + 180}ms` }}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#f4efe5] text-sm font-black shadow-sm">
                  {shift.day}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">{shift.hours}</span>
                    <span className="text-xs text-muted-foreground">
                      {shift.people}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#e7dccb]">
                    <div
                      className={`${shift.width} h-full rounded-full ${shift.tone}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#332a22] px-4 py-3 text-[#fffaf1]">
            <div>
              <p className="text-sm font-bold">Rytm zespołu</p>
              <p className="text-xs text-[#fffaf1]/60">4 osoby odpowiedziały</p>
            </div>

            <div className="flex -space-x-2">
              {team.map((person) => (
                <span
                  key={person}
                  className="flex size-8 items-center justify-center rounded-full border-2 border-[#332a22] bg-[#fffaf1] text-[0.65rem] font-black text-foreground"
                >
                  {person}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
