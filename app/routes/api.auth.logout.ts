// app/routes/api.auth.logout.ts
import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { createWebClient } from "@/lib/supabase/web";

export async function action({ request }: ActionFunctionArgs) {
  const { client: supabase, responseHeaders } = createWebClient(request);
  await supabase.auth.signOut();
  return redirect("/login", { headers: responseHeaders });
}
