import {
  NextResponse,
} from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "NOT_IMPLEMENTED",
      message:
        "La administración de movimientos todavía no fue implementada.",
    },
    {
      status: 501,
    },
  );
}