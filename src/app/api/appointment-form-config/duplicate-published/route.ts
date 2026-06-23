import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import {
  ensureInternalAppointmentFormConfig,
  normalizeAppointmentFormSchema,
} from "@/lib/appointment-form-config";
import { getAuthContext } from "@/lib/auth";
import { assertBusinessUnitAccess } from "@/lib/business-units";
import { hasPermission, Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({ businessUnitId: z.string().uuid() });

function canManage(role: Parameters<typeof hasPermission>[0]) {
  return (
    hasPermission(role, Permission.MANAGE_ORGANIZATION) ||
    hasPermission(role, Permission.MANAGE_KPI)
  );
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    if (!canManage(context.membership.role)) requirePermission(context.membership.role, Permission.MANAGE_ORGANIZATION);
    const input = schema.parse(await request.json());
    if (!(await assertBusinessUnitAccess(context, input.businessUnitId))) {
      return NextResponse.json({ message: "この事業部へアクセスできません。" }, { status: 403 });
    }
    const { form } = await ensureInternalAppointmentFormConfig(prisma, {
      organizationId: context.organization.id,
      businessUnitId: input.businessUnitId,
      userId: context.user.id,
    });
    const published = form.publishedVersionId
      ? await prisma.formVersion.findFirst({
          where: { id: form.publishedVersionId, organizationId: context.organization.id },
        })
      : null;
    const draftSchema = normalizeAppointmentFormSchema(published?.fieldSchema ?? form.fields);
    const item = await prisma.form.update({
      where: { id: form.id },
      data: { fields: draftSchema as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ item, draftSchema });
  } catch (error) {
    return apiError(error);
  }
}
