import {
  NextResponse,
} from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "ok",
    apiVersion: "v1",
    service: "usdt-tron-wallet",
    timestamp:
      new Date().toISOString(),
  });
}