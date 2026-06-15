import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Card } from "@/components/ui/Card";
import { login } from "@/lib/actions/auth";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold">Bentornato</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Accedi a Tournament Arena
        </p>
        <Card>
          <AuthForm mode="login" action={login} />
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Non hai un account?{" "}
          <Link href="/signup" className="font-medium text-primary">
            Registrati
          </Link>
        </p>
      </div>
    </main>
  );
}
