import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { listGoogleCalendars } from "@/lib/google-calendar";

export async function POST() {
  const requestId = crypto.randomUUID();
  try {
    const context = await getAuthContext();
    if (!context) {
      console.warn("Google Calendar test blocked: unauthenticated", {
        requestId,
      });
      return NextResponse.json(
        { message: "ログインが必要です。", requestId },
        { status: 401 },
      );
    }
    const calendars = await listGoogleCalendars({
      organizationId: context.organization.id,
      userId: context.user.id,
    });
    console.info("Google Calendar test succeeded", {
      requestId,
      organizationId: context.organization.id,
      userId: context.user.id,
      calendarCount: calendars.length,
    });
    return NextResponse.json({
      ok: true,
      calendarCount: calendars.length,
      requestId,
    });
  } catch (error) {
    console.error("Google Calendar test failed", { requestId, error });
    return apiError(error);
  }
}
