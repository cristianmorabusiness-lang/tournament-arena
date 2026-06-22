import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TeamPicker } from "@/components/onboarding/TeamPicker";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("favorite_country")
    .eq("id", user.id)
    .single();
  if (profile?.favorite_country) redirect("/dashboard");

  const t = await getTranslations("onboarding");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>

      <div className="mt-6">
        <TeamPicker />
      </div>
    </main>
  );
}
