import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import {
  defaultAppointmentFormSchema,
  ensureInternalAppointmentFormConfig,
  normalizeAppointmentFormSchema,
} from "@/lib/appointment-form-config";
import { getAuthContext } from "@/lib/auth";
import { assertBusinessUnitAccess } from "@/lib/business-units";
import { hasPermission, Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  businessUnitId: z.string().uuid(),
  formSchema: z.unknown(),
});

function canManage(role: Parameters<typeof hasPermission>[0]) {
  return (
    hasPermission(role, Permission.MANAGE_ORGANIZATION) ||
    hasPermission(role, Permission.MANAGE_KPI)
  );
}

async function requireManager() {
  const context = await getAuthContext();
  if (!context)
    return { context: null, response: NextResponse.json({ message: "ログインが必要です。" }, { status: 401 }) };
  if (!canManage(context.membership.role)) {
    requirePermission(context.membership.role, Permission.MANAGE_ORGANIZATION);
  }
  return { context, response: null };
}

export async function GET(request: Request) {
  try {
    const { context, response } = await requireManager();
    if (!context) return response;
    const url = new URL(request.url);
    const businessUnitId = url.searchParams.get("businessUnitId");
    if (!businessUnitId) {
      return NextResponse.json({ message: "事業部を選択してください。" }, { status: 400 });
    }
    if (!(await assertBusinessUnitAccess(context, businessUnitId))) {
      return NextResponse.json({ message: "この事業部へアクセスできません。" }, { status: 403 });
    }
    const { form } = await ensureInternalAppointmentFormConfig(prisma, {
      organizationId: context.organization.id,
      businessUnitId,
      userId: context.user.id,
    });
    const [publishedVersion, versions] = await Promise.all([
      form.publishedVersionId
        ? prisma.formVersion.findFirst({
            where: { id: form.publishedVersionId, organizationId: context.organization.id },
          })
        : null,
      prisma.formVersion.findMany({
        where: { formId: form.id, organizationId: context.organization.id },
        orderBy: { version: "desc" },
        take: 20,
      }),
    ]);
    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        status: form.status,
        businessUnitId: form.businessUnitId,
        publishedVersionId: form.publishedVersionId,
      },
      draftSchema: normalizeAppointmentFormSchema(form.fields),
      publishedSchema: normalizeAppointmentFormSchema(
        publishedVersion?.fieldSchema ?? defaultAppointmentFormSchema(),
      ),
      publishedVersion,
      versions,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { context, response } = await requireManager();
    if (!context) return response;
    const input = schema.parse(await request.json());
    if (!(await assertBusinessUnitAccess(context, input.businessUnitId))) {
      return NextResponse.json({ message: "この事業部へアクセスできません。" }, { status: 403 });
    }
    const { form } = await ensureInternalAppointmentFormConfig(prisma, {
      organizationId: context.organization.id,
      businessUnitId: input.businessUnitId,
      userId: context.user.id,
    });
    const normalized = normalizeAppointmentFormSchema(input.formSchema);
    const item = await prisma.form.update({
      where: { id: form.id },
      data: {
        fields: normalized as unknown as Prisma.InputJsonValue,
        status: form.publishedVersionId ? "PUBLISHED" : "DRAFT",
      },
    });
    return NextResponse.json({ item, draftSchema: normalized });
  } catch (error) {
    return apiError(error);
  }
}
