import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "usdt-tron-wallet",
    timestamp: new Date().toISOString(),
  });
}
