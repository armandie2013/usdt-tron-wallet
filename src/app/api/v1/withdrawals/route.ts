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
        "El módulo de retiros todavía no fue implementado.",
    },
    {
      status: 501,
    },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "NOT_IMPLEMENTED",
      message:
        "La creación de retiros todavía no fue implementada.",
    },
    {
      status: 501,
    },
  );
}