// app/routes/api.auth.logout.ts
import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createWebClient } from "@/lib/supabase/web";

async function handleSignOut(request: Request) {
  const { client: supabase, responseHeaders } = createWebClient(request);

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Supabase server signOut warning:", err);
  }

  // Force-delete all Supabase auth cookies in the browser response
  const rawCookie = request.headers.get("Cookie") || "";
  rawCookie.split(";").forEach((cookieStr) => {
    const name = cookieStr.split("=")[0].trim();
    if (name.startsWith("sb-") || name.includes("auth-token") || name.includes("access-token") || name.includes("refresh-token")) {
      responseHeaders.append(
        "Set-Cookie",
        `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`
      );
    }
  });

  return redirect("/login", { headers: responseHeaders });
}

export async function action({ request }: ActionFunctionArgs) {
  return handleSignOut(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return handleSignOut(request);
}
