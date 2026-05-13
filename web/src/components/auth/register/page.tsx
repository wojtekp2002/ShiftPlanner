import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Wróć na stronę główną
        </Link>

        <RegisterForm />
      </div>
    </main>
  );
}