import { CalendarDays, Sparkles, Users } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Zespół w jednym rytmie",
    description:
      "Każdy widzi tylko to, co potrzebne: swoją dostępność, zmiany i jasny kontekst tygodnia.",
  },
  {
    icon: CalendarDays,
    title: "Dostępność bez tarcia",
    description:
      "Zbieraj preferencje i ograniczenia bez przepisywania wiadomości, screenów i notatek.",
  },
  {
    icon: Sparkles,
    title: "Grafik gotowy do decyzji",
    description:
      "Ordo wskazuje braki, układa propozycję i zostawia managerowi pełną kontrolę nad publikacją.",
  },
];

export function LandingFeatures() {
  return (
    <section id="zespoly" className="relative z-10 grid gap-3 pb-8 md:grid-cols-3">
      {features.map((feature) => {
        const Icon = feature.icon;

        return (
          <article
            key={feature.title}
            className="group rounded-[1.5rem] border border-[#d7c8b2]/60 bg-[#fffaf1]/65 p-5 shadow-[0_18px_70px_rgba(64,47,31,0.07)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-[#fffaf1]"
          >
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#332a22] text-[#fffaf1] transition duration-300 group-hover:bg-primary">
                <Icon className="size-5" />
              </div>

              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
