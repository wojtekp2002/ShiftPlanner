import Link from "next/link";

import { JoinTeamForm } from "@/components/teams/join-team-form";

export default function JoinTeamPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/dashboard"
          className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Wróć do dashboardu
        </Link>

        <JoinTeamForm />
      </div>
    </main>
  );
}