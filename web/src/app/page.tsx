import { CalendarDays, Users, Sparkles, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Users,
    title: "Zespoły i role",
    description:
      "Manager tworzy zespół, a pracownicy dołączają przez prosty kod.",
  },
  {
    icon: CalendarDays,
    title: "Dostępność pracowników",
    description:
      "Pracownicy uzupełniają dni i godziny, w których mogą pracować.",
  },
  {
    icon: Sparkles,
    title: "Propozycja grafiku",
    description:
      "System generuje wstępny grafik, który manager może później poprawić.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <CalendarDays className="size-5" />
            </div>

            <div>
              <p className="text-lg font-semibold leading-none">ShiftMate</p>
              <p className="text-sm text-muted-foreground">
                Smart work schedule planner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost">Zaloguj się</Button>
            <Button>Utwórz konto</Button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge variant="secondary" className="mb-6">
              MVP in progress
            </Badge>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Grafik pracy tworzony szybciej, czytelniej i z mniejszym chaosem.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              ShiftMate pomaga managerom zbierać dostępność pracowników,
              generować propozycje grafików i publikować zmiany tak, aby każdy
              widział dokładnie to, co powinien.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2">
                Utwórz zespół
                <ArrowRight className="size-4" />
              </Button>

              <Button size="lg" variant="outline">
                Dołącz przez kod
              </Button>
            </div>
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Przykładowy tydzień</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {[
                ["Poniedziałek", "08:00–16:00", "2 osoby"],
                ["Wtorek", "12:00–20:00", "3 osoby"],
                ["Środa", "16:00–22:00", "1 osoba"],
              ].map(([day, hours, people]) => (
                <div
                  key={day}
                  className="flex items-center justify-between rounded-xl border bg-card p-4"
                >
                  <div>
                    <p className="font-medium">{day}</p>
                    <p className="text-sm text-muted-foreground">{hours}</p>
                  </div>

                  <Badge>{people}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-4 pb-8 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-muted">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </section>
    </main>
  );
}