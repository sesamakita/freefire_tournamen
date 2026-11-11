// src/app/(dashboard)/admin/ai-settings/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicAIVisionConfig, PRESET_DEFAULTS } from "@/lib/ai/config";
import { AISettingsClient } from "./AISettingsClient";

export const metadata = {
  title: "Konfigurasi AI Vision Scoreboard | Arena Tempur",
  description: "Atur penyedia AI (Gemini, OpenAI, DeepSeek, Groq, OpenRouter, Ollama) untuk membaca skor pertandingan.",
};

export default async function AISettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verifikasi apakah user adalah panitia/staff turnamen
  const { data: staffList } = await supabase
    .from("tournament_staff")
    .select("role, tournament_id")
    .eq("user_id", user.id)
    .limit(1);

  const isStaff = staffList && staffList.length > 0;

  if (!isStaff) {
    redirect("/dashboard");
  }

  const initialConfig = await getPublicAIVisionConfig();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <AISettingsClient initialConfig={initialConfig} presets={PRESET_DEFAULTS} />
    </div>
  );
}
