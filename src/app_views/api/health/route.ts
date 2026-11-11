import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "Arena Tempur",
    message: "Server connected successfully",
    timestamp: new Date().toISOString(),
  });
}
