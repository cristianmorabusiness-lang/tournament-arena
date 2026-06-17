import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Card } from "@/components/ui/Card";
import { signup } from "@/lib/actions/auth";

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold">Crea il tuo account</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Unisciti ad Arena
        </p>
        <Card>
          <AuthForm mode="signup" action={signup} />
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Hai già un account?{" "}
          <Link href="/login" className="font-medium text-primary">
            Accedi
          </Link>
        </p>
      </div>
    </main>
  );
}
