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
    const normalized = normalizeAppointmentFormSchema(form.fields);
    const latest = await prisma.formVersion.aggregate({
      where: { formId: form.id },
      _max: { version: true },
    });
    const result = await prisma.$transaction(async (tx) => {
      const version = await tx.formVersion.create({
        data: {
          organizationId: context.organization.id,
          businessUnitId: input.businessUnitId,
          formId: form.id,
          version: (latest._max.version ?? 0) + 1,
          status: "PUBLISHED",
          nameSnapshot: form.name,
          descriptionSnapshot: form.description,
          fieldSchema: normalized as unknown as Prisma.InputJsonValue,
          mappingSchema: form.mappingSchema as Prisma.InputJsonValue,
          routingConfigSnapshot: form.routingConfig as Prisma.InputJsonValue,
          schedulingConfigSnapshot: form.schedulingConfig as Prisma.InputJsonValue,
          submitButtonTextSnapshot: form.submitButtonText,
          completionMessageSnapshot: form.completionMessage,
          publishedByUserId: context.user.id,
          publishedAt: new Date(),
        },
      });
      await tx.formVersion.updateMany({
        where: { formId: form.id, id: { not: version.id }, status: "PUBLISHED" },
        data: { status: "ARCHIVED" },
      });
      const updated = await tx.form.update({
        where: { id: form.id },
        data: { publishedVersionId: version.id, status: "PUBLISHED" },
      });
      return { form: updated, version };
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
