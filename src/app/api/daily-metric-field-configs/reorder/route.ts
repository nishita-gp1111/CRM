import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const reorderSchema = z.object({
  businessUnitId: z.string().uuid(),
  workFunction: z.enum(["IS", "FS", "CS"]),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        displayOrder: z.coerce.number().int().min(0),
      }),
    )
    .min(1)
    .max(200),
});

export async function PUT(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.MANAGE_KPI);
    const input = reorderSchema.parse(await request.json());
    const existing = await prisma.dailyMetricFieldConfig.findMany({
      where: {
        organizationId: context.organization.id,
        businessUnitId: input.businessUnitId,
        workFunction: input.workFunction,
        id: { in: input.items.map((item) => item.id) },
      },
      select: { id: true },
    });
    if (existing.length !== input.items.length) {
      return NextResponse.json(
        { message: "同一事業部・職種内の項目だけ並び替えできます。" },
        { status: 400 },
      );
    }
    await prisma.$transaction(
      input.items.map((item) =>
        prisma.dailyMetricFieldConfig.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
