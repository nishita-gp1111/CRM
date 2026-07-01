import { NextResponse } from "next/server";
import { apiError, BadRequestError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { isGoogleCalendarIntegrationEnabled } from "@/lib/feature-flags";
import {
  createWatchChannel,
  renewWatchChannels,
  resolveWatchCalendarId,
} from "@/lib/google-calendar";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context) {
      return NextResponse.json(
        { message: "ログインが必要です。" },
        { status: 401 },
      );
    }
    requirePermission(context.membership.role, Permission.CRM_WRITE);
    if (!isGoogleCalendarIntegrationEnabled()) {
      throw new BadRequestError("Google Calendar連携は現在停止中です。");
    }
    const body = await request.json().catch(() => ({}));
    if (body.action === "renew") {
      const result = await renewWatchChannels({
        organizationId: context.organization.id,
        withinHours: Number(body.withinHours ?? 24),
      });
      return NextResponse.json({ ok: true, result });
    }
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: {
        organizationId_userId: {
          organizationId: context.organization.id,
          userId: context.user.id,
        },
      },
    });
    if (!connection) throw new BadRequestError("Google Calendarが接続されていません。");
    const selections = await prisma.googleCalendarSelection.findMany({
      where: { connectionId: connection.id },
    });
    const selection =
      typeof body.selectionId === "string"
        ? selections.find((item) => item.id === body.selectionId)
        : null;
    const googleCalendarId =
      selection?.googleCalendarId ??
      resolveWatchCalendarId({
        requestedCalendarId:
          typeof body.googleCalendarId === "string"
            ? body.googleCalendarId
            : null,
        selectedWriteCalendarId: connection.selectedWriteCalendarId,
        selections,
      });
    if (!googleCalendarId)
      throw new BadRequestError(
        "Watch対象のカレンダーが選択されていません。Google CalendarからCRMへの変更検知を使うには、Watch対象カレンダーを選択してください。CRMからGoogle Calendarへの予定作成・更新は引き続き利用できます。",
      );
    const channel = await createWatchChannel({
      connectionId: connection.id,
      googleCalendarId,
    });
    return NextResponse.json({ ok: true, channelId: channel.channelId });
  } catch (error) {
    return apiError(error);
  }
}
