// app/routes/api.health.ts
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return Response.json(
    {
      ok: true,
      service: "Arena Tempur Web & API (React Vite)",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return loader({ request } as any);
}
