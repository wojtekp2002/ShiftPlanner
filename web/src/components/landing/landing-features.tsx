import { CalendarDays, Sparkles, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export function LandingFeatures() {
  return (
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
  );
}