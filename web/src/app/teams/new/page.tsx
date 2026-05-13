import Link from "next/link";

import { CreateTeamForm } from "@/components/teams/create-team-form";

export default function NewTeamPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/dashboard"
          className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Wróć do dashboardu
        </Link>

        <CreateTeamForm />
      </div>
    </main>
  );
}