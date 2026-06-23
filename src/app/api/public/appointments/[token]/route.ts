import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { AuthContext } from "@/lib/auth";
import { createInternalAppointment } from "@/lib/appointments";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const body = await request.json();
    const passcode = typeof body.passcode === "string" ? body.passcode : "";
    const link = await prisma.appointmentCaptureLink.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!link || link.status !== "ACTIVE") {
      return NextResponse.json({ message: "リンクが無効です。" }, { status: 404 });
    }
    if (link.expiresAt && link.expiresAt <= new Date()) {
      return NextResponse.json({ message: "リンクの有効期限が切れています。" }, { status: 410 });
    }
    if (link.maxSubmissions !== null && link.submissionCount >= link.maxSubmissions) {
      return NextResponse.json({ message: "送信上限に達しました。" }, { status: 410 });
    }
    if (link.passcodeHash && hashToken(passcode) !== link.passcodeHash) {
      return NextResponse.json({ message: "パスコードが違います。" }, { status: 403 });
    }
    const user = await prisma.user.findUnique({
      where: { id: link.creditedAppointmentSetterId },
      select: { id: true, name: true, email: true },
    });
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: link.organizationId,
          userId: link.creditedAppointmentSetterId,
        },
      },
      select: { id: true, role: true, teamId: true, selectedBusinessUnitId: true },
    });
    if (!user || !membership) {
      return NextResponse.json({ message: "リンクの担当者設定が無効です。" }, { status: 400 });
    }
    const context: AuthContext = {
      sessionId: `capture:${link.id}`,
      user,
      organization: link.organization,
      membership: {
        id: membership.id,
        role: membership.role,
        teamId: membership.teamId,
        selectedBusinessUnitId: link.businessUnitId,
      },
    };
    const result = await createInternalAppointment(context, {
      ...body,
      businessUnitId: link.businessUnitId,
      appointmentSetterUserId: link.creditedAppointmentSetterId,
      formVersionId: link.formVersionId,
      idempotencyKey: body.idempotencyKey || `capture:${link.id}:${crypto.randomUUID()}`,
    });
    await prisma.appointmentCaptureLink.update({
      where: { id: link.id },
      data: { submissionCount: { increment: result.duplicated ? 0 : 1 }, lastUsedAt: new Date() },
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
