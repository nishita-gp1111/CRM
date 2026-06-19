import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.MANAGE_TARGETS);
    const { id } = await params;
    const item = await prisma.dailyMetricEntry.update({
      where: { id, organizationId: context.organization.id },
      data: {
        status: "LOCKED",
        lockedAt: new Date(),
        approvedAt: new Date(),
        approvedByUserId: context.user.id,
      },
    });
    return NextResponse.json({ item });
  } catch (error) {
    return apiError(error);
  }
}
