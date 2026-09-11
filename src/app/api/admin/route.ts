import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ module: "admin", status: "ok" });
}
