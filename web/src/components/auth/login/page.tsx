import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Wróć na stronę główną
        </Link>

        <LoginForm />
      </div>
    </main>
  );
}